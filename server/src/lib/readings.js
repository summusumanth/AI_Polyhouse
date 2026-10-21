// Turns raw device input into a clean reading, or explains what is wrong.
//
// Sensor nodes send junk in real life: a DHT that fails to read gives NaN,
// which Arduino's String() prints as "nan". That must be rejected with a clear
// message instead of crashing the request.

const { CHANNELS, requiredFor } = require("./channels");

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : NaN;
};

function parseReading(raw, facilityType) {
  const values = {};
  const errors = [];
  const required = requiredFor(facilityType);

  for (const { key, range } of CHANNELS) {
    const n = toNumber(raw[key]);
    const isRequired = required.includes(key);

    if (n === undefined) {
      if (isRequired) errors.push(`${key} is missing`);
      continue;
    }
    if (Number.isNaN(n)) {
      // A required channel must be good. An optional one is dropped instead,
      // so one broken CO2 probe does not lose the temperature data.
      if (isRequired) errors.push(`${key} is not a number (got "${raw[key]}")`);
      continue;
    }
    if (n < range[0] || n > range[1]) {
      errors.push(`${key}=${n} is outside ${range[0]}..${range[1]}`);
      continue;
    }
    values[key] = n;
  }

  if (!errors.length && !Object.keys(values).length) {
    errors.push("the reading carries no known sensor value");
  }
  return { values, errors };
}

module.exports = { parseReading };
