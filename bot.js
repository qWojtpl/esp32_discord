const { Client, Intents, MessageEmbed } = require('discord.js');
const { token, status, statusType, prefix } = require('./config.json');
const { version } = require('./package.json');
var mysql = require('mysql');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ],
    partials: [
        'CHANNEL'
    ]
});

var sql = mysql.createConnection (
    {
        host: "",
        user: "",
        password: "",
        database: "",
        socketPath: '/var/run/mysqld/mysqld.sock'
    }
);

sql.connect(function(err) {
    if(err) {
        console.log(`MySQL error : ${err}`);
        return;
    }
    console.log(`Połączono z MySQL`);
});

client.once('ready', () => {
  console.log(`Pomyślnie zalogowano jako ${client.user.tag}!`);
  client.user.setActivity(status, {TYPE: statusType});
});

client.on('messageCreate', async(msg) => {
    if(msg.author.id == client.user.id) return;
    if(msg.mentions.has(client.user))
    {
        var connectionStatus = "Oczekiwanie na połączenie..";
        const[output] = await getConnection(msg.author.id);
        if(output != null)
        {
            if(output.deviceConnected != "" && output.deviceConnected != "none")
            {
                connectionStatus = "Gotowy!";
                console.log(output);
            }
            
        }
        const embedHelp = new MessageEmbed()
            .setColor('#7289da')
            .setTitle("Discord ESP32 Connect")
            .setAuthor(`<@!${msg.author.id}>`)
            .setDescription(`Możesz wysyłać tekst na swoje urządzenie.\n
            Podłącz urządzenie wpisując **${prefix}connect <numer identyfikacyjny urządzenia, które posiada odpowiednie oprogramowanie>**\n
            Status twojego podłączenia: ${connectionStatus}\n
            Aby wysłać wiadomość na urządzenie, wyślij wiadomość do tego bota na Discordzie\n
            Możesz również wysłać wiadomość wpisująć ${prefix}send <wiadomość>`)
            .setTimestamp()
            .setFooter({text: `Discord ESP32 Connect, Build ${version}`});
        msg.channel.send(({ embeds: [embedHelp] }));
        return;
    }
    if(msg.content.toLowerCase().startsWith(`${prefix}connect`))
    {
        var deviceName = msg.content;
        deviceName = deviceName.replace(`${prefix}connect `, ``);
        if(deviceName == `${prefix}connect`)
        {
            msg.channel.send(`Poprawne użycie: ${prefix}connect <nazwa urządzenia>`);
            return;
        } else {
            const[output] = await checkDevice(deviceName);
            if(output == null)
            {
                msg.channel.send(`Nie znaleziono urządzenia.`);
                return;
            } else {
                const[output2] = await checkUser(msg.author.id);
                if(output2 != null)
                {
                    await addConnection(deviceName);
                } else {
                    await createUser(msg.author.id, deviceName);
                    msg.channel.send("Dodano konto do bazy danych");
                }
                msg.channel.send(`Pomyślnie stworzono połączenie!`);
                return;
            }
        }
    }
    if(msg.content.toLowerCase().startsWith(`${prefix}send`) || msg.channel.type == 'DM')
    {
        const [output] = await getConnection(msg.author.id);
        if(output == null)
        {
            msg.channel.send(`Nie podłączyłeś żadnego urządzenia. Wpisz ${prefix}connect <numer urządzenia>, aby móc wysyłać na nie wiadomość.`);
        } else {
            if(output.deviceConnected != 'none')
            {
                var text = msg.content;
                text = text.replace(`${prefix}send `, ``);
                if(text == null || text == `${prefix}send`)
                {
                    msg.channel.send(`Poprawne użycie: **${prefix}send <wiadomość>**`);
                    return;
                }
                const[output2] = await getMaxQueue(output.deviceConnected);
                var quNumber = 0;
                if(output2 == null)
                {
                    quNumber = 0;
                } else {
                    quNumber = output2.queueNumber + 1;
                }
                await pushQueue(output.deviceConnected, text, quNumber);
                msg.channel.send("Wysłano wiadomość na to urządzenie.");
            } else {
                msg.channel.send(`Nie podłączyłeś żadnego urządzenia. Wpisz ${prefix}connect <numer urządzenia>, aby móc wysyłać na nie wiadomość.`);
            }
        }
    }
});

function getConnection(authorid)
{
    return new Promise((resolve, reject) => {
        sql.query(`SELECT deviceConnected FROM users WHERE id='${authorid}';`, async(err, row) =>
        {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function checkDevice(name)
{
    return new Promise((resolve, reject) => {
        sql.query(`SELECT name FROM devices WHERE name='${name}';`, async(err, row) =>
        {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function checkUser(id)
{
    return new Promise((resolve, reject) => {
        sql.query(`SELECT id FROM users WHERE id='${id}';`, async(err, row) =>
        {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function addConnection(name)
{
    return new Promise((resolve, reject) => {
        sql.query(`UPDATE users SET deviceConnected='${name}'`, async(err, row) =>
        {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function createUser(id, name)
{
    return new Promise((resolve, reject) => {
        sql.query(`INSERT INTO users VALUES('${id}', '${name}')`, async(err, row) =>
        {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function getMaxQueue(name)
{
    return new Promise((resolve, reject) => {
        sql.query(`SELECT queueNumber FROM dataQueue WHERE device='${name}' ORDER BY queueNumber DESC LIMIT 1;`, async(err, row) =>
        {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function pushQueue(name, text, number)
{
    return new Promise((resolve, reject) => {
        sql.query(`INSERT INTO dataQueue VALUES(default, ${number}, '${name}', '${text}')`, async(err, row) =>
        {
            if (err) return reject(err);
            resolve(row);
        });
    });
}


client.login(token);