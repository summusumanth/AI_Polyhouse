const User = require("../models/User");

// Brings accounts from before roles existed up to date. Safe to run on every
// start: it only touches users that have no role yet.
//   admin: true  -> super_admin  (keeps everything they could do before)
//   otherwise    -> user with no access until an admin grants some
async function migrate() {
  const legacy = await User.find({ role: { $exists: false } }).select("admin").lean();
  if (!legacy.length) return;

  const admins = legacy.filter((u) => u.admin).map((u) => u._id);
  const others = legacy.filter((u) => !u.admin).map((u) => u._id);
  await Promise.all([
    User.updateMany({ _id: { $in: admins } }, { $set: { role: "super_admin" }, $unset: { admin: "" } }),
    User.updateMany({ _id: { $in: others } }, { $set: { role: "user", access: [] }, $unset: { admin: "" } }),
  ]);
  console.log(`Migrated ${legacy.length} account(s) to roles: ${admins.length} super admin, ${others.length} user`);
}

module.exports = { migrate };
