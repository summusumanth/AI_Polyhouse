const mongoose = require("mongoose");

// One controlled-growing space: a polyhouse, a grow chamber or a speed
// breeding room. Kept in the original "polyhouse" collection so ids that are
// already flashed into sensor nodes stay valid.
const FACILITY_TYPES = ["polyhouse", "grow_chamber", "speed_breeding"];
const FACILITY_STATUSES = ["active", "maintenance", "idle"];

const polyhouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    desc: { type: String, required: true, trim: true },
    type: { type: String, enum: FACILITY_TYPES, default: "polyhouse" },
    // Which area the facility belongs to. Decides which area admins and
    // users can reach it (see lib/access.js).
    area: { type: mongoose.Schema.Types.ObjectId, ref: "Area", index: true },
    status: { type: String, enum: FACILITY_STATUSES, default: "active" },

    crop: { type: String, trim: true, default: "" },
    variety: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    areaSqm: { type: Number, min: 0 },

    // Hours of light per 24h cycle. Speed breeding typically runs 22.
    photoperiod: {
      lightHours: { type: Number, min: 0, max: 24 },
    },

    // Generation tracking for speed breeding programmes.
    program: {
      generation: { type: Number, min: 0 },
      totalGenerations: { type: Number, min: 0 },
      cycleStartedAt: { type: Date },
      cycleDays: { type: Number, min: 1 },
    },

    // Marks rows created by scripts/seed.js so a re-seed never touches real data.
    seeded: { type: Boolean, default: false, index: true },
  },
  { collection: "polyhouse", timestamps: true }
);

const Polyhouse = mongoose.model("Polyhouse", polyhouseSchema);

module.exports = Polyhouse;
module.exports.FACILITY_TYPES = FACILITY_TYPES;
module.exports.FACILITY_STATUSES = FACILITY_STATUSES;
