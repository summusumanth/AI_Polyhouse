const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Area = require("../models/Area");
const { jwtSecret } = require("../config/env");
const { asyncHandler } = require("../middleware/errorHandler");
const { publicUser } = require("../lib/access");

// There is no public sign-up: admins create accounts (userController).

// The token carries only the user id. Everything else is looked up per
// request, so role and access changes apply at once.
const signToken = (user) => jwt.sign({ id: String(user._id) }, jwtSecret, { expiresIn: "7d" });

async function withAreaName(user) {
  if (!user.area) return publicUser(user);
  const area = await Area.findById(user.area).select("name").lean();
  return publicUser(user, area?.name);
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase().trim() });

  if (!user || !(await bcrypt.compare(String(password || ""), user.password))) {
    return res.status(401).json({ status: "error", message: "Wrong email or password" });
  }

  res.json({ status: "ok", token: signToken(user), user: await withAreaName(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ status: "ok", user: await withAreaName(req.user) });
});

// Admins hand out a starting password; this lets each person replace it.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ status: "error", message: "New password must be at least 6 characters" });
  }
  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(String(currentPassword || ""), user.password))) {
    return res.status(400).json({ status: "error", message: "Current password is wrong" });
  }
  if (await bcrypt.compare(newPassword, user.password)) {
    return res.status(400).json({ status: "error", message: "The new password must be different from the current one" });
  }
  user.password = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();
  res.json({ status: "ok", message: "Password changed" });
});

module.exports = { login, me, changePassword, signToken };
