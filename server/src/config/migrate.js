const User = require("../models/User");
const Polyhouse = require("../models/Polyhouse");

// Brings older data up to date. Safe to run on every start: each step only
// touches records that still need it.
async function migrate() {
  // Accounts from before roles existed.
  //   admin: true  -> super_admin  (keeps everything they could do before)
  //   otherwise    -> user with no access until an admin grants some
  const legacy = await User.find({ role: { $exists: false } }).select("admin").lean();
  if (legacy.length) {
    const admins = legacy.filter((u) => u.admin).map((u) => u._id);
    const others = legacy.filter((u) => !u.admin).map((u) => u._id);
    await Promise.all([
      User.updateMany({ _id: { $in: admins } }, { $set: { role: "super_admin" }, $unset: { admin: "" } }),
      User.updateMany({ _id: { $in: others } }, { $set: { role: "user", access: [] }, $unset: { admin: "" } }),
    ]);
    console.log(`Migrated ${legacy.length} account(s) to roles: ${admins.length} super admin, ${others.length} user`);
  }

  // Grow chambers are no longer a facility type. A chamber was an LED-lit,
  // climate-controlled room, which is what a speed breeding room is now, so
  // it becomes one and keeps its id, readings, targets and photoperiod.
  // Written straight to the collection: the model no longer accepts the old
  // type, so a mongoose query would refuse to read it.
  const chambers = await Polyhouse.collection.updateMany(
    { type: "grow_chamber" },
    { $set: { type: "speed_breeding" } }
  );
  if (chambers.modifiedCount) {
    console.log(`Migrated ${chambers.modifiedCount} grow chamber(s) to speed breeding rooms`);
  }
}

module.exports = { migrate };
