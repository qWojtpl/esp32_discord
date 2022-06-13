
// Wireless config

#include <WiFi.h>
#include <WiFiClient.h>

const char* ssid = "ssid"; // SSID
const char* password = "pass"; // Password
int timeout = 10; // Timeout in seconds
int reconnectTime = 10; // Reconnect timeout in seconds
String hostname = "Discord ESP32 Bot Connect"; // Device name
bool networkInitialized = false; // Do not change

// Display

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Fonts/FreeSerif9pt7b.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

WiFiClient client;


void setup()   {
  Serial.begin(115200);
  Wire.begin(5, 4);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C, false, false)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  //delay(2000); // Pause for 2 seconds
  //display.setFont(&FreeSerif9pt7b);
  display.clearDisplay();
  display.setTextSize(0.5);             
  display.setTextColor(WHITE);        
  display.setCursor(0,20);   
  ConnectToNetwork();           
}

void loop() {
  if(networkInitialized)
  {
    if(WiFi.status() != WL_CONNECTED)
    {
      networkInitialized = false;
      ReconnectToNetwork();
    }
  }
}

void ConnectToNetwork() {
  WiFi.mode(WIFI_STA);
  WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, INADDR_NONE);
  WiFi.setHostname(hostname.c_str());
  WiFi.begin(ssid, password);
  String connectOutput = "Laczenie z siecia: " + String(ssid) + ".";
  PrintText(connectOutput);
  display.display();
  int tempTimeout = 0;
  int tempReconnect = reconnectTime;
  while(WiFi.status() != WL_CONNECTED)
  {
    if(tempTimeout != timeout*2)
    {
      delay(500);
      connectOutput = connectOutput + ".";
      PrintText(connectOutput);
      tempTimeout++;
    } else {
      WiFi.disconnect();
      delay(1000);
      PrintText("Nie mozna polaczyc sie z ta siecia: " + String(ssid) + ". Ponawianie za " + String(tempReconnect) + " sekund..");
      tempReconnect--;
      if(tempReconnect == 0) {
        ConnectToNetwork();
        break;
      }
    }
  }
  if(WiFi.status() == WL_CONNECTED)
  {
    PrintText("Polaczono z siecia: " + String(ssid));
    networkInitialized = true;
    delay(3000);
    getText();
  }
}

void ReconnectToNetwork()
{
  WiFi.disconnect();
  int tempReconnect = reconnectTime;
  while(tempReconnect != 0)
  {
    PrintText("Utracono poloczenie z siecia " + String(ssid) + ". Ponowne laczenie za: " + tempReconnect + " sekund.");
    tempReconnect--;
  }
  ConnectToNetwork();
}

void PrintText(String text)
{
  display.clearDisplay();
  display.setCursor(0,20);
  display.print(text);
  display.display();
}

void getText()
{
  char server[] = "192.3.10.39";
  char Result [10];
  if (client.connect(server, 80))
  {
     Serial.println("Connection Established");
       
     client.println("GET /arduino/gettext.php");
     client.println(" HTTP/1.1");        
     client.println("Host: 192.3.10.39"); 
     client.println("Connection: close"); 
   
          String line = client.readStringUntil('\r'); 
         PrintText(line); 

  
     client.stop();
     delay(10000);
     getText();
  } else {
       PrintText("Wystapil blad podczas pobierania informacji; ponawianie za 5 sekund..");
      delay(5000);
      getText();
  }
}
