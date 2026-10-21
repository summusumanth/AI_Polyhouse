const mongoose = require("mongoose");
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
    date: { type: Date, default: Date.now },
  },
  { collection: "sensor_info" }
);

readingSchema.index({ polyhsid: 1, date: -1 });

module.exports = mongoose.model("Reading", readingSchema);
