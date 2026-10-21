/*
  POLYHOUSE - BOARD 1 OF 2: SENSOR NODE
  =====================================

  Job: measure the polyhouse and report it. Nothing else.
  This board has no relays and never switches anything.

  Every REPORT_INTERVAL_MS (30 s):
    1. read air temperature + humidity from the DHT22
    2. read soil moisture from the probe on A0 (averaged, as a percentage)
    3. POST them as JSON to   <API_BASE>/api/device/readings
    4. print the server's answer on the Serial monitor

  The server stores the reading in MongoDB and uses it to decide what the
  motors should do. Board 2 (motor_node) fetches that decision. The two
  boards never talk to each other directly; the server sits between them.

  Full explanation: arduino/README.md

  Wiring (unchanged from the original build)
    DHT22  VCC -> 3V3   GND -> GND   DATA -> D4 (GPIO2)
    Soil   VCC -> 3V3   GND -> GND   AOUT -> A0

  Board:     NodeMCU 1.0 (ESP-12E Module), ESP8266 core 3.x
  Libraries: ArduinoJson 7, DHT sensor library (Adafruit), Adafruit Unified Sensor
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ======================================================================
// SETTINGS - copy these from the dashboard: facility page > Device setup
// Both boards must use the SAME FACILITY_ID.
// ======================================================================

const char *WIFI_SSID = "YOUR_WIFI_NAME";
const char *WIFI_PASS = "YOUR_WIFI_PASSWORD";

// The computer running the server, by its LAN address. Never "localhost":
// to this board, localhost means the board itself.
const char *API_BASE = "http://192.168.1.50:5000";

const char *FACILITY_ID = "PASTE_FACILITY_ID_HERE";

// Must match DEVICE_KEY in server/.env. Leave empty if that is empty.
const char *DEVICE_KEY = "";

// Soil probe calibration. Open the Serial monitor: each cycle prints the raw
// A0 value. Note it with the probe in dry air, then in a glass of water.
const int SOIL_RAW_DRY = 1023;
const int SOIL_RAW_WET = 300;

const unsigned long REPORT_INTERVAL_MS = 30000;

// ======================================================================

#define DHT_PIN D4
#define DHT_TYPE DHT22 // change to DHT11 if that is your sensor
#define SOIL_PIN A0

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
unsigned long lastReport = 0;

// Joins WiFi, giving up after 20 s so a dead router cannot freeze the board.
void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[wifi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected, board IP %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[wifi] not connected, retrying next cycle");
  }
}

// Averages 8 samples (the ESP8266 ADC is noisy) and maps the raw value onto
// 0-100 % between the dry and wet calibration points.
float readSoilMoisture(int &rawOut) {
  long total = 0;
  for (int i = 0; i < 8; i++) {
    total += analogRead(SOIL_PIN);
    delay(5);
  }
  rawOut = total / 8;
  float pct = (SOIL_RAW_DRY - rawOut) * 100.0 / (SOIL_RAW_DRY - SOIL_RAW_WET);
  return constrain(pct, 0.0, 100.0);
}

void report() {
  connectWifi();
  if (WiFi.status() != WL_CONNECTED) return;

  // A DHT22 needs 2 s between reads and occasionally misses one, so one
  // retry clears most failures.
  float humidity = dht.readHumidity();
  float temp = dht.readTemperature();
  if (isnan(humidity) || isnan(temp)) {
    delay(2100);
    humidity = dht.readHumidity();
    temp = dht.readTemperature();
  }

  int soilRaw = 0;
  float moisture = readSoilMoisture(soilRaw);

  if (isnan(humidity) || isnan(temp)) {
    // Sending NaN would be rejected anyway. Skipping means the server's
    // reading goes stale, and after 5 minutes it switches the motors off.
    Serial.println("[dht] read failed twice - check wiring on D4. Skipping this cycle.");
    return;
  }

  Serial.printf("[read] temp %.1f C | humidity %.1f %% | soil %.1f %% (raw %d)\n", temp, humidity,
                moisture, soilRaw);

  JsonDocument doc;
  doc["polyhsid"] = FACILITY_ID;
  doc["temp"] = temp;
  doc["humidity"] = humidity;
  doc["moisture"] = moisture;
  // A CO2 sensor can be added here as doc["co2"]. Light (lightInt) and N-P-K
  // are only stored for grow chambers and speed breeding rooms; for a
  // polyhouse the server ignores them.
  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.begin(wifiClient, String(API_BASE) + "/api/device/readings");
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  if (strlen(DEVICE_KEY) > 0) http.addHeader("X-Device-Key", DEVICE_KEY);

  int code = http.POST(body);
  String reply = http.getString();
  http.end();

  if (code == 201) {
    Serial.println("[send] stored (201)");
  } else if (code < 0) {
    Serial.printf("[send] server unreachable (%d) - check API_BASE and WiFi\n", code);
  } else {
    // 400 bad value, 401 wrong key, 404 wrong facility id. The reply says which.
    Serial.printf("[send] rejected (%d): %s\n", code, reply.c_str());
  }
}

void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println("\n=== Polyhouse SENSOR node ===");
  dht.begin();
  connectWifi();
  report();
  lastReport = millis();
}

void loop() {
  // millis() rather than delay(): safe across the 49-day millis() rollover.
  if (millis() - lastReport >= REPORT_INTERVAL_MS) {
    lastReport = millis();
    report();
  }
}
