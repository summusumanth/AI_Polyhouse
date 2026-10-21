/*
  POLYHOUSE - BOARD 2 OF 2: MOTOR NODE
  ====================================

  Job: switch the motors. It has no sensors and never decides anything.

  Every POLL_INTERVAL_MS (10 s):
    1. GET <API_BASE>/api/device/state/<facility id>
    2. read the server's decision: { fan, cooler, mister, irrigation }
    3. switch each relay to match

  The server makes the decision by comparing the sensor node's latest reading
  with the targets set on the dashboard. The dashboard shows the exact same
  decision, so what you see on screen is what these relays are doing.

  Safety, all of it on this board:
    - Boot:            every relay starts OFF.
    - Server lost:     3 failed polls in a row (30 s) -> every relay OFF.
    - Sensor lost:     the server stops trusting a reading older than 5 min
                       and sends all OFF, which this board applies.
    - Restart guard:   a motor that was switched off is not switched on again
                       for MIN_OFF_MS (60 s). Stops a pump chattering on and
                       off when the soil sits right at the target, and gives
                       motors a pause after a power cut. Switching OFF is
                       always immediate.

  Full explanation: arduino/README.md

  Wiring (fan, mister, irrigation unchanged from the original build)
    Relay IN1  Exhaust fan ......... D1 (GPIO5)
    Relay IN2  Fogger / mister ..... D2 (GPIO4)
    Relay IN3  Drip irrigation ..... D4 (GPIO2)
    Relay IN4  Evaporative cooler .. D5 (GPIO14)   new, optional
    Relay VCC -> VIN (5 V)   GND -> GND

  Board:     NodeMCU 1.0 (ESP-12E Module), ESP8266 core 3.x
  Libraries: ArduinoJson 7
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// ======================================================================
// SETTINGS - copy these from the dashboard: facility page > Device setup
// Both boards must use the SAME FACILITY_ID.
// ======================================================================

const char *WIFI_SSID = "YOUR_WIFI_NAME";
const char *WIFI_PASS = "YOUR_WIFI_PASSWORD";

// The computer running the server, by its LAN address (not "localhost").
const char *API_BASE = "http://192.168.1.50:5000";

const char *FACILITY_ID = "PASTE_FACILITY_ID_HERE";

// Must match DEVICE_KEY in server/.env. Leave empty if that is empty.
const char *DEVICE_KEY = "";

// The original board was wired active-HIGH (pin HIGH = motor on). Many
// relay modules are active-LOW instead: if motors run when they should be
// off, set this to true.
const bool RELAY_ACTIVE_LOW = false;

const unsigned long POLL_INTERVAL_MS = 10000;
const unsigned long MIN_OFF_MS = 60000;
const int FAILSAFE_AFTER = 3;

// ======================================================================

struct Relay {
  const char *key;    // name in the server's JSON
  const char *label;  // name on the Serial monitor
  uint8_t pin;
  bool on;
  unsigned long offSince;
};

Relay relays[] = {
  {"fan", "Exhaust fan", D1, false, 0},
  {"mister", "Mister", D2, false, 0},
  {"irrigation", "Irrigation", D4, false, 0},
  {"cooler", "Cooler", D5, false, 0},
};
const int RELAY_COUNT = sizeof(relays) / sizeof(relays[0]);

WiFiClient wifiClient;
unsigned long lastPoll = 0;
int failedPolls = 0;

void writePin(const Relay &r) {
  digitalWrite(r.pin, (r.on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

// Applies one decision. OFF is immediate; ON waits out the restart guard.
void setRelay(Relay &r, bool want) {
  if (want == r.on) return;

  if (!want) {
    r.on = false;
    r.offSince = millis();
    writePin(r);
    Serial.printf("  %-11s -> OFF\n", r.label);
    return;
  }

  unsigned long offFor = millis() - r.offSince;
  if (offFor < MIN_OFF_MS) {
    Serial.printf("  %-11s    wants ON, restart guard: %lu s left\n", r.label,
                  (MIN_OFF_MS - offFor) / 1000);
    return;
  }

  r.on = true;
  writePin(r);
  Serial.printf("  %-11s -> ON\n", r.label);
}

void allOff(const char *why) {
  Serial.printf("[safety] %s - all relays OFF\n", why);
  for (int i = 0; i < RELAY_COUNT; i++) setRelay(relays[i], false);
}

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
  }
}

// Returns true when a decision was received and applied.
bool poll() {
  connectWifi();
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(wifiClient, String(API_BASE) + "/api/device/state/" + FACILITY_ID);
  http.setTimeout(5000);
  if (strlen(DEVICE_KEY) > 0) http.addHeader("X-Device-Key", DEVICE_KEY);

  int code = http.GET();
  String payload = http.getString();
  http.end();

  if (code != 200) {
    if (code < 0) {
      Serial.printf("[poll] server unreachable (%d) - check API_BASE and WiFi\n", code);
    } else {
      Serial.printf("[poll] rejected (%d): %s\n", code, payload.c_str());
    }
    return false;
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.printf("[poll] bad JSON from server: %s\n", error.c_str());
    return false;
  }

  // ok:false means "no trustworthy decision" (no targets, no reading, or the
  // sensor node has gone silent). The server then sends every relay false.
  if (!doc["ok"].as<bool>()) {
    Serial.printf("[poll] no decision: %s\n", doc["message"] | "unknown reason");
  } else {
    Serial.println("[poll] decision received");
  }

  JsonObject decision = doc["actuators"];
  for (int i = 0; i < RELAY_COUNT; i++) {
    setRelay(relays[i], decision[relays[i].key] | false);
  }
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println("\n=== Polyhouse MOTOR node ===");

  // Relays off before anything else, so a reboot never leaves a pump running.
  // offSince = now: the restart guard also applies after a power cut.
  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(relays[i].pin, OUTPUT);
    relays[i].on = false;
    relays[i].offSince = millis();
    writePin(relays[i]);
  }

  connectWifi();
  failedPolls = poll() ? 0 : 1;
  lastPoll = millis();
}

void loop() {
  if (millis() - lastPoll < POLL_INTERVAL_MS) return;
  lastPoll = millis();

  failedPolls = poll() ? 0 : failedPolls + 1;
  if (failedPolls >= FAILSAFE_AFTER) {
    allOff("server unreachable for 3 polls");
  }
}
