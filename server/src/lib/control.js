/*
  The only place that decides what the hardware should do.

  Both the dashboard and the motor-node firmware read this result instead of
  each comparing values themselves, so the screen always shows what the
  hardware is actually doing.

  Two kinds of output:
    actuators  relays to switch, from a target that is set
    alerts     readings below target that a person must act on (nutrients),
               because dosing fertiliser from a cheap conductivity-based
               N-P-K probe is not something to automate
*/

// Degrees above the target before evaporative cooling joins the fan.
const COOLER_MARGIN_C = 3;

// Dead bands: how far past the target a reading must go before the relay
// changes state. Without them a value sitting exactly on target makes the
// relay chatter on and off at every poll.
const CO2_BAND_PPM = 50;
const LIGHT_BAND_PPFD = 20;

// A decision is only as good as the reading behind it. With separate sensor
// and motor boards, the sensor board can go quiet (power, WiFi, a crash)
// while the motor board keeps polling. Without this guard the server would
// keep deciding from the last reading forever, e.g. holding a pump on
// because the soil was dry when the sensor board died.
// 5 minutes = 10 missed reports from a sensor node reporting every 30 s.
const STALE_AFTER_MS = 5 * 60 * 1000;

function readingAgeMs(reading, now = Date.now()) {
  return reading ? now - new Date(reading.date).getTime() : Infinity;
}

const isStale = (reading, now) => readingAgeMs(reading, now) > STALE_AFTER_MS;

const num = (value) => (value === null || value === undefined ? null : Number(value));
const has = (value) => Number.isFinite(num(value));

/*
  Each relay names the reading and target it needs. `test` only runs when
  both are present, so a facility with no CO2 sensor or no CO2 target simply
  has no CO2 relay rather than a relay stuck off.
*/
const ACTUATORS = [
  {
    key: "fan",
    label: "Exhaust fan",
    reading: "temp",
    target: "re_temp",
    reason: (r, t) => `temp ${r} > ${t}`,
    test: (r, t) => r > t,
  },
  {
    key: "cooler",
    label: "Evaporative cooler",
    reading: "temp",
    target: "re_temp",
    reason: (r, t) => `temp ${r} > ${t + COOLER_MARGIN_C}`,
    test: (r, t) => r > t + COOLER_MARGIN_C,
  },
  {
    // Misting adds water to the air, so it runs when the air is too dry.
    key: "mister",
    label: "Fogger / mister",
    reading: "humidity",
    target: "re_humidity",
    reason: (r, t) => `humidity ${r} < ${t}`,
    test: (r, t) => r < t,
  },
  {
    key: "irrigation",
    label: "Drip irrigation",
    reading: "moisture",
    target: "re_soilmoisture",
    reason: (r, t) => `soil ${r} < ${t}`,
    test: (r, t) => r < t,
  },
  {
    // Plants in a sealed space use CO2 up; the injector tops it back up.
    key: "co2Valve",
    label: "CO₂ injector",
    reading: "co2",
    target: "re_co2",
    reason: (r, t) => `CO₂ ${r} < ${t - CO2_BAND_PPM}`,
    test: (r, t) => r < t - CO2_BAND_PPM,
  },
  {
    // Supplementary lighting: on when the plants are short of light. In a
    // polyhouse that is dusk and dull weather; in a chamber or speed
    // breeding room it is the whole photoperiod.
    key: "lights",
    label: "Grow lights",
    reading: "lightInt",
    target: "re_light",
    reason: (r, t) => `light ${r} < ${t - LIGHT_BAND_PPFD}`,
    test: (r, t) => r < t - LIGHT_BAND_PPFD,
  },
];

// Nutrients: reported, never automated.
const ALERTS = [
  { key: "N", label: "Nitrogen", reading: "N", target: "re_N", unit: "mg/kg" },
  { key: "P", label: "Phosphorus", reading: "P", target: "re_P", unit: "mg/kg" },
  { key: "K", label: "Potassium", reading: "K", target: "re_K", unit: "mg/kg" },
];

// Relays that can be decided right now: both the reading and the target exist.
function applicable(threshold, reading) {
  return ACTUATORS.filter((a) => has(reading[a.reading]) && has(threshold[a.target]));
}

// Returns { fan: true, cooler: false, ... } or null when there is not enough
// data to decide: no targets, no reading, or a reading too old to trust.
// null means "everything off".
function computeActuators(threshold, reading) {
  if (!threshold || !reading || isStale(reading)) return null;
  return Object.fromEntries(
    applicable(threshold, reading).map((a) => [
      a.key,
      a.test(num(reading[a.reading]), num(threshold[a.target])),
    ])
  );
}

// Same decision, with labels and the comparison that drove it, for the UI.
function describeActuators(threshold, reading) {
  if (!threshold || !reading || isStale(reading)) return null;
  return applicable(threshold, reading).map((a) => {
    const r = num(reading[a.reading]);
    const t = num(threshold[a.target]);
    return { key: a.key, label: a.label, on: a.test(r, t), reason: a.reason(r, t) };
  });
}

// Nutrient readings that have fallen below their target. Returns [] when
// there is nothing to say, so the UI can simply check the length.
function nutrientAlerts(threshold, reading) {
  if (!threshold || !reading || isStale(reading)) return [];
  return ALERTS.filter((a) => has(reading[a.reading]) && has(threshold[a.target]))
    .map((a) => {
      const value = num(reading[a.reading]);
      const target = num(threshold[a.target]);
      return {
        key: a.key,
        label: a.label,
        value,
        target,
        unit: a.unit,
        below: value < target,
        shortfall: Number((target - value).toFixed(1)),
      };
    })
    .filter((a) => a.below);
}

// Why there is no decision, in words a person can act on.
function undecidedReason(threshold, reading) {
  if (!threshold) return "No targets set. Set them on the dashboard.";
  if (!reading) return "No reading yet from the sensor node.";
  if (isStale(reading)) {
    const minutes = Math.round(readingAgeMs(reading) / 60000);
    return `Sensor node silent for ${minutes} min. All relays held off until it reports again.`;
  }
  return null;
}

module.exports = {
  computeActuators,
  describeActuators,
  nutrientAlerts,
  undecidedReason,
  isStale,
  ACTUATORS,
  COOLER_MARGIN_C,
  CO2_BAND_PPM,
  LIGHT_BAND_PPFD,
  STALE_AFTER_MS,
};
