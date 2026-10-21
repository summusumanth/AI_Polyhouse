/*
  POLYHOUSE - BOARD 1 OF 2: SENSOR NODE
  =====================================

  Job: measure the growing space and report it. Nothing else.
  This board has no relays and never switches anything.

  Works in a polyhouse, a grow chamber or a speed breeding room. The only
  difference is which sensors you fit: switch each one on below and the
  board reports that channel, leave it off and the server simply has no
  reading for it (and offers no relay that depends on it).

  Every REPORT_INTERVAL_MS (30 s):
    1. read whichever sensors are enabled
    2. POST them as JSON to <API_BASE>/api/device/readings
    3. print the server's answer on the Serial monitor

  Full explanation: arduino/README.md

  ---------------------------------------------------------------------
  SENSORS AND WIRING
  ---------------------------------------------------------------------
  Always fitted
    DHT22  VCC->3V3  GND->GND  DATA->D4 (GPIO2)
    Soil   VCC->3V3  GND->GND  AOUT->A0

  Optional, all on one I2C bus: SDA->D2 (GPIO4), SCL->D1 (GPIO5), 3V3+GND
    BH1750   light, reported as PPFD      (addr 0x23)
    SCD41    CO2, and a second temp/RH    (addr 0x62)
    SHT31    accurate temp/RH             (addr 0x44)

  Optional, RS485 (soil N-P-K probe through a MAX485 board)
    MAX485 RO->D5 (GPIO14)   DI->D6 (GPIO12)   DE+RE joined->D7 (GPIO13)
    MAX485 A/B -> probe A/B.  Probe needs 9-24 V, NOT the NodeMCU 3V3.

  The ESP8266 has only one analog pin and the soil probe uses it, which is
  why every added sensor here is I2C or RS485.

  ---------------------------------------------------------------------
  LIBRARIES (Arduino IDE -> Manage Libraries)
  ---------------------------------------------------------------------
    ArduinoJson 7                                  always
    DHT sensor library + Adafruit Unified Sensor   always
    BH1750 by Christopher Laws                     if HAS_LIGHT
    Sensirion I2C SCD4x (v1.1+)                    if HAS_CO2
    Adafruit SHT31 Library                         if HAS_SHT31
  Nothing extra is needed for RS485: SoftwareSerial ships with the core.

  Board: NodeMCU 1.0 (ESP-12E Module), ESP8266 core 3.x
*/

// ======================================================================
// WHICH SENSORS ARE FITTED  -  set to 1 for each one you have
// ======================================================================

#define HAS_LIGHT 0  // BH1750 light sensor
#define HAS_CO2 0    // SCD41 CO2 sensor
#define HAS_SHT31 0  // SHT31 temperature/humidity (replaces the DHT22)
#define HAS_NPK 0    // RS485 soil N-P-K probe

// ======================================================================
// SETTINGS  -  copy from the dashboard: facility page > Device setup
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

// Soil probe calibration. The Serial monitor prints the raw A0 value each
// cycle: note it in dry air, then in a glass of water.
const int SOIL_RAW_DRY = 1023;
const int SOIL_RAW_WET = 300;

// A BH1750 reports lux. Plants are measured in PPFD (µmol/m²/s), and the
// conversion depends on the light source, so pick the one that matches.
//   Sunlight ~0.0185   White LED ~0.0135   Red/blue "blurple" LED ~0.025
// This is an approximation: a real PAR meter is the accurate instrument.
const float LUX_TO_PPFD = 0.0185;

const unsigned long REPORT_INTERVAL_MS = 30000;

// ======================================================================

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#if HAS_LIGHT || HAS_CO2 || HAS_SHT31
#include <Wire.h>
#define USES_I2C 1
#endif

#if HAS_LIGHT
#include <BH1750.h>
BH1750 lightMeter;
#endif

#if HAS_CO2
#include <SensirionI2cScd4x.h>
SensirionI2cScd4x scd4x;
#endif

#if HAS_SHT31
#include <Adafruit_SHT31.h>
Adafruit_SHT31 sht31;
#endif

#if HAS_NPK
#include <SoftwareSerial.h>
#define RS485_RX D5
#define RS485_TX D6
#define RS485_DE D7
SoftwareSerial rs485(RS485_RX, RS485_TX);
#endif

#define DHT_PIN D4
#define DHT_TYPE DHT22 // DHT11 if that is your sensor
#define SOIL_PIN A0
#define I2C_SDA D2
#define I2C_SCL D1

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
unsigned long lastReport = 0;

// Which optional sensors actually answered at startup. A sensor that is
// enabled but not responding is reported as missing rather than as zero.
bool lightReady = false;
bool co2Ready = false;
bool sht31Ready = false;

// ----------------------------------------------------------------------
// WiFi
// ----------------------------------------------------------------------

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[wifi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  // Give up after 20 s so a dead router cannot freeze the board.
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

// ----------------------------------------------------------------------
// Soil moisture (always fitted)
// ----------------------------------------------------------------------

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

// ----------------------------------------------------------------------
// Soil N-P-K over RS485 (optional)
// ----------------------------------------------------------------------

#if HAS_NPK
// Modbus RTU: read 3 holding registers from 0x001E on slave 1. This matches
// the common JXCT-style 7-in-1 probe; check your probe's own register map.
const byte NPK_REQUEST[] = { 0x01, 0x03, 0x00, 0x1E, 0x00, 0x03, 0x65, 0xCD };

bool readNPK(int &n, int &p, int &k) {
  byte reply[11];

  digitalWrite(RS485_DE, HIGH); // transmit
  delay(10);
  rs485.write(NPK_REQUEST, sizeof(NPK_REQUEST));
  rs485.flush();
  digitalWrite(RS485_DE, LOW); // receive

  unsigned long started = millis();
  int got = 0;
  while (got < 11 && millis() - started < 1000) {
    if (rs485.available()) reply[got++] = rs485.read();
  }
  // 11 bytes: addr, func, byte count, 3 x 16-bit value, CRC16.
  if (got < 11 || reply[0] != 0x01 || reply[1] != 0x03) return false;

  n = (reply[3] << 8) | reply[4];
  p = (reply[5] << 8) | reply[6];
  k = (reply[7] << 8) | reply[8];
  return true;
}
#endif

// ----------------------------------------------------------------------
// Start the optional sensors
// ----------------------------------------------------------------------

void startSensors() {
  dht.begin();

#if USES_I2C
  Wire.begin(I2C_SDA, I2C_SCL);
#endif

#if HAS_LIGHT
  lightReady = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  Serial.printf("[init] BH1750 light sensor: %s\n", lightReady ? "ready" : "NOT FOUND");
#endif

#if HAS_CO2
  scd4x.begin(Wire, 0x62);
  scd4x.stopPeriodicMeasurement(); // clear any run left over from a reset
  delay(500);
  co2Ready = (scd4x.startPeriodicMeasurement() == 0);
  Serial.printf("[init] SCD41 CO2 sensor:    %s\n", co2Ready ? "ready" : "NOT FOUND");
  if (co2Ready) Serial.println("[init] SCD41 needs ~30 s before its first reading");
#endif

#if HAS_SHT31
  sht31Ready = sht31.begin(0x44);
  Serial.printf("[init] SHT31 temp/humidity: %s\n", sht31Ready ? "ready" : "NOT FOUND");
#endif

#if HAS_NPK
  rs485.begin(4800); // the usual baud rate for these probes
  pinMode(RS485_DE, OUTPUT);
  digitalWrite(RS485_DE, LOW);
  Serial.println("[init] RS485 N-P-K probe:   listening");
#endif
}

// ----------------------------------------------------------------------
// One reporting cycle
// ----------------------------------------------------------------------

void report() {
  connectWifi();
  if (WiFi.status() != WL_CONNECTED) return;

  float temp = NAN;
  float humidity = NAN;

  // An SHT31, when fitted, is the more accurate instrument and wins.
#if HAS_SHT31
  if (sht31Ready) {
    temp = sht31.readTemperature();
    humidity = sht31.readHumidity();
  }
#endif

  if (isnan(temp) || isnan(humidity)) {
    humidity = dht.readHumidity();
    temp = dht.readTemperature();
    if (isnan(humidity) || isnan(temp)) {
      // A DHT22 occasionally misses a read; it needs 2 s between attempts.
      delay(2100);
      humidity = dht.readHumidity();
      temp = dht.readTemperature();
    }
  }

  int soilRaw = 0;
  float moisture = readSoilMoisture(soilRaw);

  if (isnan(temp) || isnan(humidity)) {
    // Sending NaN would only be rejected. Skipping means the server's
    // reading goes stale and, after 5 minutes, it switches the relays off.
    Serial.println("[dht] read failed twice - check wiring. Skipping this cycle.");
    return;
  }

  JsonDocument doc;
  doc["polyhsid"] = FACILITY_ID;
  doc["temp"] = round(temp * 10) / 10.0;
  doc["humidity"] = round(humidity * 10) / 10.0;
  doc["moisture"] = round(moisture * 10) / 10.0;

  Serial.printf("[read] temp %.1f C | humidity %.1f %% | soil %.1f %% (raw %d)", temp, humidity,
                moisture, soilRaw);

#if HAS_LIGHT
  if (lightReady) {
    float lux = lightMeter.readLightLevel();
    if (lux >= 0) {
      float ppfd = lux * LUX_TO_PPFD;
      doc["lightInt"] = round(ppfd * 10) / 10.0;
      Serial.printf(" | light %.0f lux = %.1f PPFD", lux, ppfd);
    }
  }
#endif

#if HAS_CO2
  if (co2Ready) {
    uint16_t co2 = 0;
    float scdTemp = 0, scdHum = 0;
    bool ready = false;
    scd4x.getDataReadyStatus(ready);
    // A reading of 0 means the sensor has not finished warming up.
    if (ready && scd4x.readMeasurement(co2, scdTemp, scdHum) == 0 && co2 > 0) {
      doc["co2"] = co2;
      Serial.printf(" | CO2 %u ppm", co2);
    }
  }
#endif

#if HAS_NPK
  int n = 0, p = 0, k = 0;
  if (readNPK(n, p, k)) {
    doc["N"] = n;
    doc["P"] = p;
    doc["K"] = k;
    Serial.printf(" | N %d P %d K %d mg/kg", n, p, k);
  } else {
    Serial.print(" | N-P-K no reply");
  }
#endif

  Serial.println();

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
    // 400 bad value, 401 wrong key, 404 wrong facility id.
    Serial.printf("[send] rejected (%d): %s\n", code, reply.c_str());
  }
}

void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println("\n=== Polyhouse SENSOR node ===");
  startSensors();
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
