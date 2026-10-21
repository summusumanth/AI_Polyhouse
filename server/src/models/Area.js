const mongoose = require("mongoose");

// A geographic area (e.g. Parlakhemundi) that groups facilities and the
// people who work on them. Area admins only ever see their own area.
const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { collection: "areas", timestamps: true }
);

module.exports = mongoose.model("Area", areaSchema);
