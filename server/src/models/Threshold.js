const mongoose = require("mongoose");

<<<<<<< HEAD
// Fixed target values for one facility. The _id is the facility id.
//
// The three original fields keep their re_* names so thresholds written by
// earlier versions (and already flashed firmware) still read correctly.
// Everything else is optional: a facility only has a CO2 target if someone
// set one, and nothing acts on a target that is not set.
=======
// Target values for one facility. The _id is the facility id.
//
// The three original fields keep their re_* names so thresholds written by
// earlier versions (and already flashed firmware) still read correctly.
// Everything added since is optional: a facility only has a CO2 target if
// someone set one, and nothing acts on a target that is not set.
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
const thresholdSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },

    // Climate, always present.
    re_temp: { type: Number, required: true },
    re_humidity: { type: Number, required: true },
    re_soilmoisture: { type: Number, required: true },

<<<<<<< HEAD
    // Air. Below target opens the CO2 injection solenoid.
    re_co2: { type: Number, min: 0, max: 10000 },

    // Light, as PPFD in µmol/m²/s.
    re_light: { type: Number, min: 0, max: 3000 }, // grow lights work toward it
    re_shade: { type: Number, min: 0, max: 3000 }, // shade screen closes above it

    // Water. Below this tank level the irrigation pump is held off so it
    // cannot run dry.
    re_watermin: { type: Number, min: 0, max: 100 },

    // Watch-only targets: they raise an alert, nothing is switched.
    re_substrate: { type: Number, min: 0, max: 60 }, // root-zone temperature
    re_leafwet: { type: Number, min: 0, max: 100 }, // fungal-risk wetness
    // Soil nutrients, mg/kg. Cheap N-P-K probes infer nutrients from
    // conductivity and are not reliable enough to dose fertiliser from.
=======
    // Air. CO2 drives an injector; below target means the plants have used it up.
    re_co2: { type: Number, min: 0, max: 10000 },

    // Light, as PPFD in µmol/m²/s. Below target switches grow lights on.
    re_light: { type: Number, min: 0, max: 3000 },

    // Soil nutrients, mg/kg. These raise an alert only: cheap N-P-K probes
    // infer nutrients from conductivity and are not reliable enough to dose
    // fertiliser from automatically.
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    re_N: { type: Number, min: 0, max: 5000 },
    re_P: { type: Number, min: 0, max: 5000 },
    re_K: { type: Number, min: 0, max: 5000 },
  },
  { collection: "threshholdvalue", _id: false, versionKey: false }
);

module.exports = mongoose.model("Threshold", thresholdSchema);

// Everything a target can cover: the reading it compares against, its label
<<<<<<< HEAD
// and unit, and whether it drives equipment or only warns.
module.exports.TARGET_FIELDS = [
  { key: "re_temp", reading: "temp", label: "Air temperature", unit: "°C", max: 70, required: true },
  { key: "re_humidity", reading: "humidity", label: "Relative humidity", unit: "%", max: 100, required: true },
  { key: "re_soilmoisture", reading: "moisture", label: "Soil moisture", unit: "%", max: 100, required: true },
  { key: "re_co2", reading: "co2", label: "CO₂", unit: "ppm", max: 10000 },
  { key: "re_light", reading: "lightInt", label: "Light (PPFD)", unit: "µmol/m²/s", max: 3000 },
  { key: "re_shade", reading: "lightInt", label: "Shade above (PPFD)", unit: "µmol/m²/s", max: 3000 },
  { key: "re_watermin", reading: "waterLevel", label: "Minimum tank level", unit: "%", max: 100 },
  { key: "re_substrate", reading: "substrateTemp", label: "Substrate temperature", unit: "°C", max: 60, alertOnly: true },
  { key: "re_leafwet", reading: "leafWetness", label: "Leaf wetness alert", unit: "%", max: 100, alertOnly: true },
=======
// and unit, and whether it drives a relay or only warns.
module.exports.TARGET_FIELDS = [
  { key: "re_temp", reading: "temp", label: "Temperature", unit: "°C", max: 70, required: true, drives: "fan, cooler" },
  { key: "re_humidity", reading: "humidity", label: "Humidity", unit: "%", max: 100, required: true, drives: "mister" },
  { key: "re_soilmoisture", reading: "moisture", label: "Soil moisture", unit: "%", max: 100, required: true, drives: "irrigation" },
  { key: "re_co2", reading: "co2", label: "CO₂", unit: "ppm", max: 10000, drives: "CO₂ injector" },
  { key: "re_light", reading: "lightInt", label: "Light (PPFD)", unit: "µmol/m²/s", max: 3000, drives: "grow lights" },
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  { key: "re_N", reading: "N", label: "Nitrogen (N)", unit: "mg/kg", max: 5000, alertOnly: true },
  { key: "re_P", reading: "P", label: "Phosphorus (P)", unit: "mg/kg", max: 5000, alertOnly: true },
  { key: "re_K", reading: "K", label: "Potassium (K)", unit: "mg/kg", max: 5000, alertOnly: true },
];
