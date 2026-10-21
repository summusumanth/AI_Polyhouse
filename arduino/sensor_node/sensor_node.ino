/*
  POLYHOUSE - BOARD 1 OF 2: SENSOR NODE
  =====================================

  Job: measure the growing space and report it. Nothing else.
  This board has no relays and never switches anything.

<<<<<<< HEAD
  Works in a polyhouse, a speed breeding room or a phenotyping station. The
  only difference is which sensors you fit: switch each one on below and
  the board reports that channel, leave it off and the server simply has no
  reading for it (and offers no relay that depends on it).

  A speed breeding room uses all ten of its sensors:
    air temperature + humidity   DHT22 or SHT31
    light (PPFD)                 PAR quantum sensor (or BH1750 estimate)
    photoperiod (RTC)            kept by the server clock, nothing to fit
    CO2                          SCD41
    soil moisture                capacitive probe on A0
    substrate temperature        DS18B20 probe in the growing medium
    water tank level             JSN-SR04T waterproof ultrasonic sensor
    irrigation flow              YF-S201 hall-effect flow sensor
    leaf wetness                 resistive leaf wetness sensor
  A phenotyping station uses the PAR sensor, the DHT22/SHT31 (for canopy
  minus air temperature) and, optionally, an electronic stem-diameter sensor.

=======
  Works in a polyhouse, a grow chamber or a speed breeding room. The only
  difference is which sensors you fit: switch each one on below and the
  board reports that channel, leave it off and the server simply has no
  reading for it (and offers no relay that depends on it).

>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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

<<<<<<< HEAD
    ADS1115  4-channel analog input      (addr 0x48), carries:
               A0 leaf wetness sensor
               A1 PAR quantum sensor (0-2.5 V or 0-5 V output)
               A2 stem-diameter sensor (dendrometer, voltage output)

  Optional, digital pins
    DS18B20  substrate temp   DATA->D3 (GPIO0), 4.7k pull-up DATA->3V3
    YF-S201  irrigation flow  SIGNAL->D5 (GPIO14), sensor on 5 V, signal
                              through a 10k/20k divider (it outputs 5 V)
    JSN-SR04T tank level      TRIG->D6 (GPIO12)  ECHO->D7 (GPIO13), echo
                              through a 1k/2k divider. Mount it in the tank
                              lid, pointing down at the water.

  Optional, RS485 (soil N-P-K probe through a MAX485 board, polyhouses)
    MAX485 RO->D5 (GPIO14)   DI->D6 (GPIO12)   DE+RE joined->D7 (GPIO13)
    MAX485 A/B -> probe A/B.  Probe needs 9-24 V, NOT the NodeMCU 3V3.
    Uses the same pins as the flow and level sensors, so it cannot be
    combined with them on one board.

  The ESP8266 has only one analog pin and the soil probe uses it, which is
  why the other analog sensors go through the ADS1115.
=======
  Optional, RS485 (soil N-P-K probe through a MAX485 board)
    MAX485 RO->D5 (GPIO14)   DI->D6 (GPIO12)   DE+RE joined->D7 (GPIO13)
    MAX485 A/B -> probe A/B.  Probe needs 9-24 V, NOT the NodeMCU 3V3.

  The ESP8266 has only one analog pin and the soil probe uses it, which is
  why every added sensor here is I2C or RS485.
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

  ---------------------------------------------------------------------
  LIBRARIES (Arduino IDE -> Manage Libraries)
  ---------------------------------------------------------------------
    ArduinoJson 7                                  always
    DHT sensor library + Adafruit Unified Sensor   always
    BH1750 by Christopher Laws                     if HAS_LIGHT
    Sensirion I2C SCD4x (v1.1+)                    if HAS_CO2
    Adafruit SHT31 Library                         if HAS_SHT31
<<<<<<< HEAD
    OneWire + DallasTemperature                    if HAS_SUBSTRATE_TEMP
    Adafruit ADS1X15                               if HAS_LEAF_WETNESS,
                                                   HAS_PAR_SENSOR or
                                                   HAS_STEM_SENSOR
  Nothing extra is needed for RS485, flow or the ultrasonic sensor.
=======
  Nothing extra is needed for RS485: SoftwareSerial ships with the core.
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

  Board: NodeMCU 1.0 (ESP-12E Module), ESP8266 core 3.x
*/

// ======================================================================
// WHICH SENSORS ARE FITTED  -  set to 1 for each one you have
// ======================================================================

<<<<<<< HEAD
#define HAS_SOIL 1            // soil moisture probe on A0 (polyhouse, speed breeding)
#define HAS_LIGHT 0           // BH1750 light sensor (a PPFD estimate)
#define HAS_PAR_SENSOR 0      // PAR quantum sensor on ADS1115 A1 (true PPFD)
#define HAS_CO2 0             // SCD41 CO2 sensor
#define HAS_SHT31 0           // SHT31 temperature/humidity (replaces the DHT22)
#define HAS_SUBSTRATE_TEMP 0  // DS18B20 root-zone temperature probe
#define HAS_WATER_LEVEL 0     // JSN-SR04T ultrasonic tank level
#define HAS_FLOW 0            // YF-S201 irrigation flow sensor
#define HAS_LEAF_WETNESS 0    // leaf wetness sensor on ADS1115 A0
#define HAS_STEM_SENSOR 0     // stem-diameter sensor on ADS1115 A2 (phenotyping)
#define HAS_NPK 0             // RS485 soil N-P-K probe

// A speed breeding room: HAS_SOIL, HAS_PAR_SENSOR, HAS_CO2,
//   HAS_SUBSTRATE_TEMP, HAS_WATER_LEVEL, HAS_FLOW, HAS_LEAF_WETNESS.
// A phenotyping station: HAS_SOIL 0, HAS_PAR_SENSOR, HAS_STEM_SENSOR.

#if HAS_NPK && (HAS_FLOW || HAS_WATER_LEVEL)
#error "The N-P-K probe uses D5-D7, the same pins as the flow and level sensors. Use one or the other."
#endif
=======
#define HAS_LIGHT 0  // BH1750 light sensor
#define HAS_CO2 0    // SCD41 CO2 sensor
#define HAS_SHT31 0  // SHT31 temperature/humidity (replaces the DHT22)
#define HAS_NPK 0    // RS485 soil N-P-K probe
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

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

<<<<<<< HEAD
// PAR quantum sensor: µmol/m²/s per volt of output. Check the datasheet:
//   0-2.5 V for 0-2500 µmol/m²/s (e.g. Apogee SQ-214)  -> 1000
//   0-5 V   for 0-2000 µmol/m²/s                        -> 400
const float PAR_UMOL_PER_VOLT = 1000.0;

// Leaf wetness sensor: output volts when dry, and when fully wet. Read both
// from the Serial monitor (dry in air, then with a wet tissue on it).
const float LEAF_DRY_V = 0.3;
const float LEAF_WET_V = 2.6;

// Water tank, as distances from the ultrasonic sensor to the water:
// with the tank empty and full. The sensor cannot see closer than ~25 cm.
const float TANK_EMPTY_CM = 120.0;
const float TANK_FULL_CM = 30.0;

// YF-S201: about 450 pulses per litre (7.5 Hz per L/min). Calibrate by
// running a measured 5 L through it and reading the pulse count.
const float FLOW_PULSES_PER_LITRE = 450.0;

// Stem-diameter sensor (dendrometer): diameter at 0 V, and mm per volt.
const float STEM_ZERO_MM = 0.0;
const float STEM_MM_PER_VOLT = 5.0;

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
const unsigned long REPORT_INTERVAL_MS = 30000;

// ======================================================================

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

<<<<<<< HEAD
#define USES_ADS (HAS_LEAF_WETNESS || HAS_PAR_SENSOR || HAS_STEM_SENSOR)

#if HAS_LIGHT || HAS_CO2 || HAS_SHT31 || USES_ADS
=======
#if HAS_LIGHT || HAS_CO2 || HAS_SHT31
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
#include <Wire.h>
#define USES_I2C 1
#endif

<<<<<<< HEAD
#if USES_ADS
#include <Adafruit_ADS1X15.h>
Adafruit_ADS1115 ads;
#endif

#if HAS_SUBSTRATE_TEMP
#include <OneWire.h>
#include <DallasTemperature.h>
#define ONE_WIRE_PIN D3
OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature substrateProbe(&oneWire);
#endif

#if HAS_WATER_LEVEL
#define LEVEL_TRIG D6
#define LEVEL_ECHO D7
#endif

#if HAS_FLOW
#define FLOW_PIN D5
volatile unsigned long flowPulses = 0;
unsigned long flowCountedSince = 0;
IRAM_ATTR void onFlowPulse() { flowPulses++; }
#endif

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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
<<<<<<< HEAD
bool adsReady = false;
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

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
<<<<<<< HEAD
// Water: tank level and flow (optional)
// ----------------------------------------------------------------------

#if HAS_WATER_LEVEL
// Median of 5 pings: one stray echo off the tank wall cannot move it.
// Returns -1 when the sensor did not answer.
float readTankLevel(float &cmOut) {
  float samples[5];
  int got = 0;
  for (int i = 0; i < 5; i++) {
    digitalWrite(LEVEL_TRIG, LOW);
    delayMicroseconds(4);
    digitalWrite(LEVEL_TRIG, HIGH);
    delayMicroseconds(20);  // the JSN-SR04T wants a longer pulse than an HC-SR04
    digitalWrite(LEVEL_TRIG, LOW);
    unsigned long echo = pulseIn(LEVEL_ECHO, HIGH, 30000);
    if (echo > 0) samples[got++] = echo / 58.0;  // µs -> cm
    delay(60);
  }
  if (got == 0) return -1;
  for (int i = 1; i < got; i++) {  // insertion sort, n <= 5
    float v = samples[i];
    int j = i - 1;
    while (j >= 0 && samples[j] > v) { samples[j + 1] = samples[j]; j--; }
    samples[j + 1] = v;
  }
  cmOut = samples[got / 2];
  float pct = (TANK_EMPTY_CM - cmOut) * 100.0 / (TANK_EMPTY_CM - TANK_FULL_CM);
  return constrain(pct, 0.0, 100.0);
}
#endif

#if HAS_FLOW
// Average flow since the last report, in L/min.
float readFlowRate() {
  noInterrupts();
  unsigned long pulses = flowPulses;
  flowPulses = 0;
  interrupts();
  unsigned long now = millis();
  float minutes = (now - flowCountedSince) / 60000.0;
  flowCountedSince = now;
  if (minutes <= 0) return 0;
  return (pulses / FLOW_PULSES_PER_LITRE) / minutes;
}
#endif

#if USES_ADS
float adsVolts(uint8_t channel) {
  int16_t raw = ads.readADC_SingleEnded(channel);
  return ads.computeVolts(raw);
}
#endif

// ----------------------------------------------------------------------
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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

<<<<<<< HEAD
#if USES_ADS
  adsReady = ads.begin(0x48);
  ads.setGain(GAIN_ONE);  // ±4.096 V range
  Serial.printf("[init] ADS1115 analog input: %s\n", adsReady ? "ready" : "NOT FOUND");
#endif

#if HAS_SUBSTRATE_TEMP
  substrateProbe.begin();
  Serial.printf("[init] DS18B20 substrate:   %d probe(s)\n", substrateProbe.getDeviceCount());
#endif

#if HAS_WATER_LEVEL
  pinMode(LEVEL_TRIG, OUTPUT);
  pinMode(LEVEL_ECHO, INPUT);
  digitalWrite(LEVEL_TRIG, LOW);
  Serial.println("[init] JSN-SR04T tank level: ready");
#endif

#if HAS_FLOW
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), onFlowPulse, FALLING);
  flowCountedSince = millis();
  Serial.println("[init] YF-S201 flow sensor: counting");
#endif

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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

<<<<<<< HEAD
#if HAS_SOIL
  int soilRaw = 0;
  float moisture = readSoilMoisture(soilRaw);
#endif
=======
  int soilRaw = 0;
  float moisture = readSoilMoisture(soilRaw);
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

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
<<<<<<< HEAD
  Serial.printf("[read] temp %.1f C | humidity %.1f %%", temp, humidity);

#if HAS_SOIL
  doc["moisture"] = round(moisture * 10) / 10.0;
  Serial.printf(" | soil %.1f %% (raw %d)", moisture, soilRaw);
#endif

#if HAS_PAR_SENSOR
  // A real quantum sensor is the instrument of record for PPFD.
  if (adsReady) {
    float v = adsVolts(1);
    float ppfd = max(0.0f, v * PAR_UMOL_PER_VOLT);
    doc["lightInt"] = round(ppfd);
    Serial.printf(" | PAR %.3f V = %.0f PPFD", v, ppfd);
  }
#elif HAS_LIGHT
=======
  doc["moisture"] = round(moisture * 10) / 10.0;

  Serial.printf("[read] temp %.1f C | humidity %.1f %% | soil %.1f %% (raw %d)", temp, humidity,
                moisture, soilRaw);

#if HAS_LIGHT
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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

<<<<<<< HEAD
#if HAS_SUBSTRATE_TEMP
  substrateProbe.requestTemperatures();
  float rootC = substrateProbe.getTempCByIndex(0);
  // -127 means no probe answered; 85 is the power-on value of a probe that
  // has not converted yet. Neither is a real temperature.
  if (rootC > -100 && rootC != 85.0) {
    doc["substrateTemp"] = round(rootC * 10) / 10.0;
    Serial.printf(" | root zone %.1f C", rootC);
  } else {
    Serial.print(" | DS18B20 no reading");
  }
#endif

#if HAS_WATER_LEVEL
  float tankCm = 0;
  float tank = readTankLevel(tankCm);
  if (tank >= 0) {
    doc["waterLevel"] = round(tank);
    Serial.printf(" | tank %.0f %% (%.0f cm)", tank, tankCm);
  } else {
    Serial.print(" | tank sensor no echo");
  }
#endif

#if HAS_FLOW
  float flow = readFlowRate();
  doc["flowRate"] = round(flow * 100) / 100.0;
  Serial.printf(" | flow %.2f L/min", flow);
#endif

#if HAS_LEAF_WETNESS
  if (adsReady) {
    float v = adsVolts(0);
    float wet = constrain((v - LEAF_DRY_V) * 100.0 / (LEAF_WET_V - LEAF_DRY_V), 0.0, 100.0);
    doc["leafWetness"] = round(wet);
    Serial.printf(" | leaf %.2f V = %.0f %% wet", v, wet);
  }
#endif

#if HAS_STEM_SENSOR
  if (adsReady) {
    float v = adsVolts(2);
    float mm = STEM_ZERO_MM + v * STEM_MM_PER_VOLT;
    doc["stemDia"] = round(mm * 100) / 100.0;
    Serial.printf(" | stem %.2f mm", mm);
  }
#endif

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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
