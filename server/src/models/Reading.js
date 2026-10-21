const mongoose = require("mongoose");
<<<<<<< HEAD
const { CHANNELS } = require("../lib/channels");

// One sensor sample coming from a NodeMCU / ESP32 node.
//
// Every channel is optional at the database level. Absent means "not
// measured", which is different from a real reading of 0. Which channels a
// facility must send is checked on the way in (lib/readings.js): a
// polyhouse or speed breeding board always sends temp, humidity, moisture.
const fields = Object.fromEntries(CHANNELS.map((c) => [c.key, { type: Number }]));

const readingSchema = new mongoose.Schema(
  {
    polyhsid: { type: String, required: true, index: true },
    ...fields,
=======

// One sensor sample coming from a NodeMCU / Arduino node.
const readingSchema = new mongoose.Schema(
  {
    polyhsid: { type: String, required: true, index: true },
    temp: { type: Number, required: true },
    humidity: { type: Number, required: true },
    moisture: { type: Number, required: true },
    // Optional channels. Absent means "not measured", which is different
    // from a real reading of 0 (a polyhouse has no light or N-P-K sensor).
    co2: { type: Number },
    N: { type: Number },
    P: { type: Number },
    K: { type: Number },
    lightInt: { type: Number },
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    date: { type: Date, default: Date.now },
  },
  { collection: "sensor_info" }
);

readingSchema.index({ polyhsid: 1, date: -1 });

module.exports = mongoose.model("Reading", readingSchema);
