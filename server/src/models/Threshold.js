const mongoose = require("mongoose");

// Target values for one facility. The _id is the facility id.
//
// The three original fields keep their re_* names so thresholds written by
// earlier versions (and already flashed firmware) still read correctly.
// Everything added since is optional: a facility only has a CO2 target if
// someone set one, and nothing acts on a target that is not set.
const thresholdSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },

    // Climate, always present.
    re_temp: { type: Number, required: true },
    re_humidity: { type: Number, required: true },
    re_soilmoisture: { type: Number, required: true },

    // Air. CO2 drives an injector; below target means the plants have used it up.
    re_co2: { type: Number, min: 0, max: 10000 },

    // Light, as PPFD in µmol/m²/s. Below target switches grow lights on.
    re_light: { type: Number, min: 0, max: 3000 },

    // Soil nutrients, mg/kg. These raise an alert only: cheap N-P-K probes
    // infer nutrients from conductivity and are not reliable enough to dose
    // fertiliser from automatically.
    re_N: { type: Number, min: 0, max: 5000 },
    re_P: { type: Number, min: 0, max: 5000 },
    re_K: { type: Number, min: 0, max: 5000 },
  },
  { collection: "threshholdvalue", _id: false, versionKey: false }
);

module.exports = mongoose.model("Threshold", thresholdSchema);

// Everything a target can cover: the reading it compares against, its label
// and unit, and whether it drives a relay or only warns.
module.exports.TARGET_FIELDS = [
  { key: "re_temp", reading: "temp", label: "Temperature", unit: "°C", max: 70, required: true, drives: "fan, cooler" },
  { key: "re_humidity", reading: "humidity", label: "Humidity", unit: "%", max: 100, required: true, drives: "mister" },
  { key: "re_soilmoisture", reading: "moisture", label: "Soil moisture", unit: "%", max: 100, required: true, drives: "irrigation" },
  { key: "re_co2", reading: "co2", label: "CO₂", unit: "ppm", max: 10000, drives: "CO₂ injector" },
  { key: "re_light", reading: "lightInt", label: "Light (PPFD)", unit: "µmol/m²/s", max: 3000, drives: "grow lights" },
  { key: "re_N", reading: "N", label: "Nitrogen (N)", unit: "mg/kg", max: 5000, alertOnly: true },
  { key: "re_P", reading: "P", label: "Phosphorus (P)", unit: "mg/kg", max: 5000, alertOnly: true },
  { key: "re_K", reading: "K", label: "Potassium (K)", unit: "mg/kg", max: 5000, alertOnly: true },
];
