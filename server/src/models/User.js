const mongoose = require("mongoose");

// super_admin: every area; creates areas and area admins.
// area_admin:  one area; creates facilities and users there, grants access.
// user:        only the facilities listed in `access`.
const ROLES = ["super_admin", "area_admin", "user"];

// view:    see readings, charts, relays, phenotyping.
// operate: also change targets and record phenotyping observations.
// manage:  also edit or delete the facility. Offered for area admins, who
//          are otherwise given a whole area at once.
const ACCESS_LEVELS = ["view", "operate", "manage"];

const grantSchema = new mongoose.Schema(
  {
    facility: { type: mongoose.Schema.Types.ObjectId, ref: "Polyhouse", required: true },
    level: { type: String, enum: ACCESS_LEVELS, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "user" },
    area: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },
    access: { type: [grantSchema], default: [] },
    // Set when an admin hands out a starting password. The person must
    // replace it before they can use the rest of the app.
    mustChangePassword: { type: Boolean, default: false },
    // Pre-roles flag, read once by config/migrate.js. Not used for decisions.
    admin: { type: Boolean },
  },
  { collection: "users", timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
module.exports.ACCESS_LEVELS = ACCESS_LEVELS;
