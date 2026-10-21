/*
  The only place that decides what the hardware should do.

  Both the dashboard and the motor-node firmware read this result instead of
  each comparing values themselves, so the screen always shows what the
  hardware is actually doing.

<<<<<<< HEAD
  Inputs
    facility   type, photoperiod, and which relays are fitted (equipment)
    threshold  the fixed targets set on the dashboard
    reading    the newest sensor reading
    state      what each relay was last told (models/ControlState), for the
               two rules that need memory: shade hysteresis and flow checks

  Outputs
    actuators  one entry per fitted relay that can be decided, with the
               comparison that drove it
    alerts     things a person should look at; nothing is switched by them
*/

const { schedule } = require("./photoperiod");
const { equipmentOf } = require("../models/Polyhouse");

// Dead bands: how far past the target a reading must go before a relay
// changes state. Without them a value sitting on the target makes relays
// chatter, and opposing relays (heater/fan, humidifier/dehumidifier) fight.
const BANDS = {
  heatC: 1, // heater on below target - 1 °C
  coolerC: 3, // evaporative cooler joins the fan above target + 3 °C
  humidityPct: 5, // humidifier below target - 5 %, dehumidifier above + 5 %
  co2Ppm: 50,
  lightPpfd: 20,
  // A closed shade screen cuts the light it is measuring, so it reopens
  // only once the light falls to this fraction of the "shade above" level.
  shadeReopen: 0.6,
  substrateC: 3, // root-zone alert when this far from target
};

// Tank level that holds the pump off when no minimum has been set.
const DEFAULT_WATER_MIN_PCT = 10;
// Below this the flow sensor counts as "no flow".
const MIN_FLOW_LPM = 0.1;
// Time for the motor node to switch (10 s poll + 60 s restart guard) and the
// sensor node to report it (30 s), before flow is judged.
const FLOW_SETTLE_MS = 2 * 60 * 1000;
=======
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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

// A decision is only as good as the reading behind it. With separate sensor
// and motor boards, the sensor board can go quiet (power, WiFi, a crash)
// while the motor board keeps polling. Without this guard the server would
// keep deciding from the last reading forever, e.g. holding a pump on
// because the soil was dry when the sensor board died.
// 5 minutes = 10 missed reports from a sensor node reporting every 30 s.
const STALE_AFTER_MS = 5 * 60 * 1000;

<<<<<<< HEAD
const LABELS = {
  fan: "Cooling / exhaust fans",
  cooler: "Evaporative cooler",
  heater: "Heating system",
  vents: "Ventilation windows",
  mister: "Humidifier / fogger",
  dehumidifier: "Dehumidifier",
  irrigation: "Irrigation pump & valves",
  co2Valve: "CO₂ injection solenoid",
  lights: "LED grow lights",
  shade: "Shade screen",
};

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
function readingAgeMs(reading, now = Date.now()) {
  return reading ? now - new Date(reading.date).getTime() : Infinity;
}

const isStale = (reading, now) => readingAgeMs(reading, now) > STALE_AFTER_MS;

const num = (value) => (value === null || value === undefined ? null : Number(value));
const has = (value) => Number.isFinite(num(value));
<<<<<<< HEAD
const fmt = (v) => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(1))));

// Map (from mongoose) or plain object -> plain object.
const plain = (m) => (m instanceof Map ? Object.fromEntries(m) : m || {});

/*
  Each rule returns null when it cannot decide (no sensor or no target), or
  { on, reason }. Rules run in this order, so later ones can read earlier
  decisions (the CO2 interlock looks at the fan and vents).
*/
const RULES = [
  [
    "fan",
    ({ r, t }) =>
      has(r.temp) && has(t.re_temp)
        ? { on: r.temp > t.re_temp, reason: `temp ${fmt(r.temp)} ${r.temp > t.re_temp ? ">" : "≤"} ${fmt(t.re_temp)}` }
        : null,
  ],
  [
    "cooler",
    ({ r, t }) => {
      if (!has(r.temp) || !has(t.re_temp)) return null;
      const limit = t.re_temp + BANDS.coolerC;
      return { on: r.temp > limit, reason: `temp ${fmt(r.temp)} ${r.temp > limit ? ">" : "≤"} ${fmt(limit)}` };
    },
  ],
  [
    "heater",
    ({ r, t }) => {
      if (!has(r.temp) || !has(t.re_temp)) return null;
      const limit = t.re_temp - BANDS.heatC;
      return { on: r.temp < limit, reason: `temp ${fmt(r.temp)} ${r.temp < limit ? "<" : "≥"} ${fmt(limit)}` };
    },
  ],
  [
    // Windows open to shed heat, or to let out humid air when it is not
    // too cold to do so.
    "vents",
    ({ r, t }) => {
      if (!has(r.temp) || !has(t.re_temp)) return null;
      if (r.temp > t.re_temp) return { on: true, reason: `temp ${fmt(r.temp)} > ${fmt(t.re_temp)}` };
      const humid = has(r.humidity) && has(t.re_humidity) && r.humidity > t.re_humidity + BANDS.humidityPct;
      if (humid && r.temp >= t.re_temp - BANDS.heatC) {
        return { on: true, reason: `humidity ${fmt(r.humidity)} > ${fmt(t.re_humidity + BANDS.humidityPct)}` };
      }
      return { on: false, reason: `temp ${fmt(r.temp)} ≤ ${fmt(t.re_temp)}` };
    },
  ],
  [
    "mister",
    ({ r, t }) => {
      if (!has(r.humidity) || !has(t.re_humidity)) return null;
      const limit = t.re_humidity - BANDS.humidityPct;
      return { on: r.humidity < limit, reason: `humidity ${fmt(r.humidity)} ${r.humidity < limit ? "<" : "≥"} ${fmt(limit)}` };
    },
  ],
  [
    "dehumidifier",
    ({ r, t }) => {
      if (!has(r.humidity) || !has(t.re_humidity)) return null;
      const limit = t.re_humidity + BANDS.humidityPct;
      return { on: r.humidity > limit, reason: `humidity ${fmt(r.humidity)} ${r.humidity > limit ? ">" : "≤"} ${fmt(limit)}` };
    },
  ],
  [
    // Pump and solenoid valves together. Dry-run protection: when the tank
    // is below its minimum the pump is held off whatever the soil says.
    "irrigation",
    ({ r, t }) => {
      if (!has(r.moisture) || !has(t.re_soilmoisture)) return null;
      const want = r.moisture < t.re_soilmoisture;
      const reason = `soil ${fmt(r.moisture)} ${want ? "<" : "≥"} ${fmt(t.re_soilmoisture)}`;
      if (want && has(r.waterLevel)) {
        const min = has(t.re_watermin) ? t.re_watermin : DEFAULT_WATER_MIN_PCT;
        if (r.waterLevel < min) {
          return { on: false, held: true, reason: `${reason}, but tank ${fmt(r.waterLevel)}% < ${fmt(min)}%: pump held off` };
        }
      }
      return { on: want, reason };
    },
  ],
  [
    // Injecting CO2 while the fans or windows are exhausting air wastes it.
    "co2Valve",
    ({ r, t, decided }) => {
      if (!has(r.co2) || !has(t.re_co2)) return null;
      const limit = t.re_co2 - BANDS.co2Ppm;
      const want = r.co2 < limit;
      const reason = `CO₂ ${fmt(r.co2)} ${want ? "<" : "≥"} ${fmt(limit)}`;
      if (want && (decided.fan?.on || decided.vents?.on)) {
        return { on: false, held: true, reason: `${reason}, held off while venting` };
      }
      return { on: want, reason };
    },
  ],
  [
    /*
      With a photoperiod the clock is in charge: lights are off for the dark
      period, whatever the light sensor reads.
        speed breeding  on for the whole light period; the PPFD target is
                        then checked by an alert instead
        polyhouse       supplementary: on during the light period only when
                        the light falls short of the target
      Without a photoperiod, the old supplementary rule applies.
    */
    "lights",
    ({ r, t, photo, type }) => {
      const sensed = has(r.lightInt) && has(t.re_light);
      const short = sensed && r.lightInt < t.re_light - BANDS.lightPpfd;
      const lightReason = sensed ? `light ${fmt(r.lightInt)} ${short ? "<" : "≥"} ${fmt(t.re_light - BANDS.lightPpfd)}` : "";

      if (photo) {
        if (!photo.lightsOn) return { on: false, reason: `dark period, lights on at ${photo.lightsOnAt}` };
        if (type === "speed_breeding" || !sensed) {
          return { on: true, reason: `light period ${photo.lightsOnAt}-${photo.lightsOffAt}` };
        }
        return { on: short, reason: lightReason };
      }
      return sensed ? { on: short, reason: lightReason } : null;
    },
  ],
  [
    "shade",
    ({ r, t, state }) => {
      if (!has(r.lightInt) || !has(t.re_shade)) return null;
      const wasOn = Boolean(state.actuators.shade);
      const limit = wasOn ? t.re_shade * BANDS.shadeReopen : t.re_shade;
      const on = r.lightInt > limit;
      return {
        on,
        reason: wasOn
          ? `light ${fmt(r.lightInt)} ${on ? ">" : "≤"} ${fmt(limit)} (reopens below ${Math.round(BANDS.shadeReopen * 100)}%)`
          : `light ${fmt(r.lightInt)} ${on ? ">" : "≤"} ${fmt(limit)}`,
      };
    },
  ],
];

function context({ facility, threshold, reading, state, now }) {
  return {
    r: reading || {},
    t: threshold || {},
    type: facility?.type || "polyhouse",
    photo: schedule(facility?.photoperiod, new Date(now)),
    state: { actuators: plain(state?.actuators), changedAt: plain(state?.changedAt) },
    now,
  };
}

/*
  Returns [{ key, label, on, reason, held? }] for every fitted relay that
  can be decided, or null when there is not enough to decide at all (no
  targets, no reading, or a reading too old to trust). null = all off.
*/
function decide({ facility, threshold, reading, state = null, now = Date.now() }) {
  if (!threshold || !reading || isStale(reading, now)) return null;
  const ctx = { ...context({ facility, threshold, reading, state, now }), decided: {} };
  const fitted = new Set(equipmentOf(facility));
  const out = [];

  for (const [key, rule] of RULES) {
    if (!fitted.has(key)) continue;
    const result = rule(ctx);
    if (!result) continue;
    ctx.decided[key] = result;
    out.push({ key, label: LABELS[key], ...result });
  }
  return out;
}

// { fan: true, heater: false, ... } with every fitted relay present, for
// the firmware. Anything that could not be decided is off.
function relayMap(facility, decisions) {
  const map = Object.fromEntries(equipmentOf(facility).map((k) => [k, false]));
  for (const d of decisions || []) map[d.key] = d.on;
  return map;
}

// Things to look at. Never switches anything.
function alerts({ facility, threshold, reading, state = null, now = Date.now() }) {
  if (!threshold || !reading || isStale(reading, now)) return [];
  const { r, t, photo, state: s, type } = context({ facility, threshold, reading, state, now });
  const out = [];
  const add = (key, level, title, detail) => out.push({ key, level, title, detail });

  // Light short of target while the schedule has the lights on.
  if (type === "speed_breeding" && photo?.lightsOn && has(r.lightInt) && has(t.re_light) && r.lightInt < t.re_light - BANDS.lightPpfd) {
    add("light", "warn", "Light below target", `PPFD ${fmt(r.lightInt)} of ${fmt(t.re_light)} µmol/m²/s with the grow lights on. Raise the LED output, lower the fixtures or clean them.`);
  }

  if (has(r.waterLevel)) {
    const min = has(t.re_watermin) ? t.re_watermin : DEFAULT_WATER_MIN_PCT;
    if (r.waterLevel < min) {
      add("water", "danger", "Water tank low", `Tank at ${fmt(r.waterLevel)}% (minimum ${fmt(min)}%). Irrigation is held off until it is refilled.`);
    }
  }

  // Flow against what irrigation has actually been told, once it settled.
  if (has(r.flowRate) && s.changedAt.irrigation !== undefined) {
    const since = now - new Date(s.changedAt.irrigation).getTime();
    const settled = since > FLOW_SETTLE_MS && new Date(reading.date).getTime() - new Date(s.changedAt.irrigation).getTime() > FLOW_SETTLE_MS / 2;
    if (settled && s.actuators.irrigation && r.flowRate < MIN_FLOW_LPM) {
      add("flow", "danger", "No irrigation flow", `Irrigation has been on for ${Math.round(since / 60000)} min but the flow sensor reads ${fmt(r.flowRate)} L/min. Check the pump, valves and lines for a blockage.`);
    }
    if (settled && !s.actuators.irrigation && r.flowRate >= MIN_FLOW_LPM) {
      add("flow", "warn", "Water flowing while irrigation is off", `${fmt(r.flowRate)} L/min with the pump off. Look for a leak or a valve stuck open.`);
    }
  }

  if (has(r.leafWetness) && has(t.re_leafwet) && r.leafWetness > t.re_leafwet) {
    add("leafwet", "warn", "Leaves wet: fungal risk", `Leaf wetness ${fmt(r.leafWetness)}% is above ${fmt(t.re_leafwet)}%. Improve airflow or lower humidity.`);
  }

  if (has(r.substrateTemp) && has(t.re_substrate) && Math.abs(r.substrateTemp - t.re_substrate) > BANDS.substrateC) {
    const dir = r.substrateTemp > t.re_substrate ? "warm" : "cold";
    add("substrate", "warn", `Root zone too ${dir}`, `Substrate ${fmt(r.substrateTemp)} °C against a target of ${fmt(t.re_substrate)} °C.`);
  }

  for (const [key, label] of [["N", "Nitrogen"], ["P", "Phosphorus"], ["K", "Potassium"]]) {
    const target = t[`re_${key}`];
    if (has(r[key]) && has(target) && r[key] < target) {
      add(key, "warn", `${label} below target`, `${fmt(r[key])} of ${fmt(target)} mg/kg, short by ${fmt(target - r[key])}. Fertigate by hand once you trust the reading.`);
    }
  }
  return out;
}

// Why there is no decision, in words a person can act on.
function undecidedReason(threshold, reading, now = Date.now()) {
  if (!threshold) return "No targets set. Set them on the facility's Control tab.";
  if (!reading) return "No reading yet from the sensor node.";
  if (isStale(reading, now)) {
    const minutes = Math.round(readingAgeMs(reading, now) / 60000);
=======

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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    return `Sensor node silent for ${minutes} min. All relays held off until it reports again.`;
  }
  return null;
}

<<<<<<< HEAD
// The state to store after the motor node has been told `map`.
function nextState(state, map, now = Date.now()) {
  const prev = plain(state?.actuators);
  const changedAt = plain(state?.changedAt);
  const next = { ...changedAt };
  for (const [key, on] of Object.entries(map)) {
    if (prev[key] === undefined || Boolean(prev[key]) !== on) next[key] = new Date(now);
  }
  return { actuators: map, changedAt: next };
}

module.exports = {
  decide,
  relayMap,
  alerts,
  undecidedReason,
  nextState,
  isStale,
  LABELS,
  BANDS,
  DEFAULT_WATER_MIN_PCT,
  MIN_FLOW_LPM,
=======
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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  STALE_AFTER_MS,
};
