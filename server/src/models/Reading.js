const mongoose = require("mongoose");

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
    date: { type: Date, default: Date.now },
  },
  { collection: "sensor_info" }
);

readingSchema.index({ polyhsid: 1, date: -1 });

module.exports = mongoose.model("Reading", readingSchema);
