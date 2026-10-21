/*
  POLYHOUSE - BOARD 2 OF 2: MOTOR NODE
  ====================================

  Job: switch the motors. It has no sensors and never decides anything.

  Every POLL_INTERVAL_MS (10 s):
    1. GET <API_BASE>/api/device/state/<facility id>
<<<<<<< HEAD
    2. read the server's decision, one true/false per relay:
         fan, cooler, heater, vents, mister (humidifier / fogger),
         dehumidifier, irrigation, co2Valve, lights, shade
    3. switch each relay to match

  The server only sends relays that are ticked as fitted on the facility,
  and keeps the photoperiod clock, so the grow lights relay already
  follows the day/night schedule.

=======
    2. read the server's decision: { fan, cooler, mister, irrigation }
    3. switch each relay to match

>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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

<<<<<<< HEAD
  Wiring: see the RELAYS table below. Set a pin to NO_PIN for any relay
  that is not wired. Relay VCC -> VIN (5 V), GND -> GND.

  A full speed breeding room has ten relays. A NodeMCU has fewer safe
  output pins than that, so for the full set use an ESP32 DevKit (the
  sketch picks the ESP32 pin map by itself). On a NodeMCU the first four
  relays stay where the original build had them.

  Motors that move both ways (ventilation windows, shade screen) need a
  reversing controller with limit switches. This board gives it a single
  contact: closed = open the windows / close the screen, open = the other
  way. Most window and screen motor controllers take exactly that.
  The CO2 relay drives the solenoid after the cylinder's regulator; it is
  a 24 V AC or 12 V DC coil, never mains through a hobby relay.

  Board:     NodeMCU 1.0 (ESP-12E Module), ESP8266 core 3.x
             or ESP32 Dev Module, ESP32 core 2.x/3.x
  Libraries: ArduinoJson 7
*/

#if defined(ESP32)
#include <WiFi.h>
#include <HTTPClient.h>
#else
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#endif
=======
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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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

<<<<<<< HEAD
const int NO_PIN = -1;

struct Relay {
  const char *key;    // name in the server's JSON
  const char *label;  // name on the Serial monitor
  int pin;            // NO_PIN = not wired
=======
struct Relay {
  const char *key;    // name in the server's JSON
  const char *label;  // name on the Serial monitor
  uint8_t pin;
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  bool on;
  unsigned long offSince;
};

<<<<<<< HEAD
// ======================================================================
// RELAYS - which pin drives which relay
// ======================================================================
#if defined(ESP32)
// ESP32 DevKit: every pin below is a plain output with no boot-time role.
Relay relays[] = {
  {"fan", "Fans", 16, false, 0},
  {"mister", "Humidifier", 17, false, 0},
  {"irrigation", "Irrigation", 18, false, 0},
  {"cooler", "Cooler", 19, false, 0},
  {"heater", "Heater", 21, false, 0},
  {"vents", "Vents", 22, false, 0},
  {"dehumidifier", "Dehumidifier", 23, false, 0},
  {"co2Valve", "CO2 valve", 25, false, 0},
  {"lights", "Grow lights", 26, false, 0},
  {"shade", "Shade screen", 27, false, 0},
};
#else
// NodeMCU. D3 and D4 are pulled HIGH while the board boots and D8 LOW, so
// a relay there can blink for a moment at power-on. The restart guard
// below still keeps motors off for MIN_OFF_MS after boot, but put the
// least sensitive loads on those pins (lights, heater), never a pump.
Relay relays[] = {
  {"fan", "Fans", D1, false, 0},
  {"mister", "Humidifier", D2, false, 0},
  {"irrigation", "Irrigation", D4, false, 0},  // as in the original build
  {"cooler", "Cooler", D5, false, 0},
  {"heater", "Heater", D6, false, 0},
  {"vents", "Vents", D7, false, 0},
  {"lights", "Grow lights", D3, false, 0},
  {"dehumidifier", "Dehumidifier", D8, false, 0},
  {"co2Valve", "CO2 valve", D0, false, 0},
  {"shade", "Shade screen", NO_PIN, false, 0},  // out of pins: use an ESP32
};
#endif
=======
Relay relays[] = {
  {"fan", "Exhaust fan", D1, false, 0},
  {"mister", "Mister", D2, false, 0},
  {"irrigation", "Irrigation", D4, false, 0},
  {"cooler", "Cooler", D5, false, 0},
};
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
const int RELAY_COUNT = sizeof(relays) / sizeof(relays[0]);

WiFiClient wifiClient;
unsigned long lastPoll = 0;
int failedPolls = 0;

void writePin(const Relay &r) {
<<<<<<< HEAD
  if (r.pin == NO_PIN) return;
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  digitalWrite(r.pin, (r.on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

// Applies one decision. OFF is immediate; ON waits out the restart guard.
void setRelay(Relay &r, bool want) {
  if (want == r.on) return;

  if (!want) {
    r.on = false;
    r.offSince = millis();
    writePin(r);
<<<<<<< HEAD
    Serial.printf("  %-13s -> OFF\n", r.label);
=======
    Serial.printf("  %-11s -> OFF\n", r.label);
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    return;
  }

  unsigned long offFor = millis() - r.offSince;
  if (offFor < MIN_OFF_MS) {
<<<<<<< HEAD
    Serial.printf("  %-13s    wants ON, restart guard: %lu s left\n", r.label,
=======
    Serial.printf("  %-11s    wants ON, restart guard: %lu s left\n", r.label,
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
                  (MIN_OFF_MS - offFor) / 1000);
    return;
  }

  r.on = true;
  writePin(r);
<<<<<<< HEAD
  Serial.printf("  %-13s -> ON\n", r.label);
=======
  Serial.printf("  %-11s -> ON\n", r.label);
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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

<<<<<<< HEAD
  // A relay the server does not mention (not fitted on the facility) is
  // switched off.
  JsonObject decision = doc["actuators"];
  for (int i = 0; i < RELAY_COUNT; i++) {
    if (relays[i].pin == NO_PIN) continue;
    setRelay(relays[i], decision[relays[i].key] | false);
  }
  if (!doc["photoperiod"].isNull()) {
    Serial.printf("[poll] photoperiod %s-%s, lights %s\n", doc["photoperiod"]["on"] | "?",
                  doc["photoperiod"]["off"] | "?", doc["photoperiod"]["lightsOn"] ? "on" : "off");
  }
=======
  JsonObject decision = doc["actuators"];
  for (int i = 0; i < RELAY_COUNT; i++) {
    setRelay(relays[i], decision[relays[i].key] | false);
  }
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.println("\n=== Polyhouse MOTOR node ===");

  // Relays off before anything else, so a reboot never leaves a pump running.
  // offSince = now: the restart guard also applies after a power cut.
  for (int i = 0; i < RELAY_COUNT; i++) {
<<<<<<< HEAD
    if (relays[i].pin != NO_PIN) pinMode(relays[i].pin, OUTPUT);
=======
    pinMode(relays[i].pin, OUTPUT);
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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
