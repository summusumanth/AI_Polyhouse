/*
  Every value a sensor node can report, in one place. The reading model,
  input validation, the chart series and the CSV export are all built from
  this list, so adding a sensor means adding one line here (and the same
  line in client/src/lib/facility.js).

    key     name in the JSON the board posts, and in the database
    range   plausible physical range; outside it is a wiring or sensor fault
    digits  decimals kept when readings are averaged for charts
*/
const CHANNELS = [
  // Air
  { key: "temp", label: "Air temperature", unit: "°C", range: [-20, 70], digits: 1 },
  { key: "humidity", label: "Relative humidity", unit: "%", range: [0, 100], digits: 1 },
  { key: "co2", label: "CO₂", unit: "ppm", range: [0, 10000], digits: 0 },
  // Light, as PPFD (photosynthetically active photons).
  { key: "lightInt", label: "Light (PPFD)", unit: "µmol/m²/s", range: [0, 3000], digits: 0 },
  // Root zone and water
  { key: "moisture", label: "Soil moisture", unit: "%", range: [0, 100], digits: 1 },
  { key: "substrateTemp", label: "Substrate temperature", unit: "°C", range: [-10, 60], digits: 1 },
  { key: "waterLevel", label: "Water tank level", unit: "%", range: [0, 100], digits: 0 },
  { key: "flowRate", label: "Irrigation flow", unit: "L/min", range: [0, 500], digits: 2 },
  // Plant surface
  { key: "leafWetness", label: "Leaf wetness", unit: "%", range: [0, 100], digits: 0 },
  // Phenotyping station: an electronic stem-diameter sensor (dendrometer).
  { key: "stemDia", label: "Stem diameter", unit: "mm", range: [0, 500], digits: 2 },
  // Soil nutrients from an RS485 N-P-K probe (polyhouses).
  { key: "N", label: "Nitrogen (N)", unit: "mg/kg", range: [0, 5000], digits: 0 },
  { key: "P", label: "Phosphorus (P)", unit: "mg/kg", range: [0, 5000], digits: 0 },
  { key: "K", label: "Potassium (K)", unit: "mg/kg", range: [0, 5000], digits: 0 },
];

const CHANNEL_KEYS = CHANNELS.map((c) => c.key);

// A climate-controlled facility's sensor board always carries the DHT22 and
// the soil probe, and the relay decisions depend on them. A phenotyping
// station may only have a PAR sensor, so it requires nothing in particular.
const REQUIRED_BY_TYPE = {
  polyhouse: ["temp", "humidity", "moisture"],
  speed_breeding: ["temp", "humidity", "moisture"],
  phenotyping: [],
};

const requiredFor = (type) => REQUIRED_BY_TYPE[type] || REQUIRED_BY_TYPE.polyhouse;

module.exports = { CHANNELS, CHANNEL_KEYS, requiredFor };
