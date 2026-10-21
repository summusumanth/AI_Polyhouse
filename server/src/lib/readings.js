// Turns raw device input into a clean reading, or explains what is wrong.
//
// Sensor nodes send junk in real life: a DHT that fails to read gives NaN,
// which Arduino's String() prints as "nan". That must be rejected with a clear
// message instead of crashing the request.

const REQUIRED = ["temp", "humidity", "moisture"];
const OPTIONAL = ["co2", "N", "P", "K", "lightInt"];

// Polyhouses and grow chambers have the same abilities: whatever sensors a
// board actually has, it reports, and the server keeps all of it. A channel
// is absent from a reading simply because that board has no such sensor.
const notMeasuredFor = () => [];

// Plausible physical ranges. Anything outside is a wiring or sensor fault.
const RANGES = {
  temp: [-20, 70],
  humidity: [0, 100],
  moisture: [0, 100],
  co2: [0, 10000],
  N: [0, 5000],
  P: [0, 5000],
  K: [0, 5000],
  lightInt: [0, 200000],
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : NaN;
};

function parseReading(raw, facilityType) {
  const values = {};
  const errors = [];
  const skip = notMeasuredFor(facilityType);

  for (const field of REQUIRED) {
    const n = toNumber(raw[field]);
    if (n === undefined) errors.push(`${field} is missing`);
    else if (Number.isNaN(n)) errors.push(`${field} is not a number (got "${raw[field]}")`);
    else values[field] = n;
  }

  // Optional channels: a bad value is dropped rather than failing the whole
  // reading, so one broken CO2 probe does not lose the temperature data.
  for (const field of OPTIONAL) {
    if (skip.includes(field)) continue;
    const n = toNumber(raw[field]);
    if (n !== undefined && !Number.isNaN(n)) values[field] = n;
  }

  for (const [field, [min, max]] of Object.entries(RANGES)) {
    if (values[field] !== undefined && (values[field] < min || values[field] > max)) {
      errors.push(`${field}=${values[field]} is outside ${min}..${max}`);
    }
  }

  const ignored = skip.filter((field) => raw[field] !== undefined);
  return { values, errors, ignored };
}

module.exports = { parseReading, notMeasuredFor };
