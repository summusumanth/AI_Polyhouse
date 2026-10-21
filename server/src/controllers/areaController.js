const Area = require("../models/Area");
const Polyhouse = require("../models/Polyhouse");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

async function withCounts(areas) {
  const ids = areas.map((a) => a._id);
  const [facilities, users] = await Promise.all([
    Polyhouse.aggregate([{ $match: { area: { $in: ids } } }, { $group: { _id: "$area", n: { $sum: 1 } } }]),
    User.aggregate([{ $match: { area: { $in: ids } } }, { $group: { _id: "$area", n: { $sum: 1 } } }]),
  ]);
  const count = (list, id) => list.find((x) => String(x._id) === String(id))?.n || 0;
  return areas.map((a) => ({
    id: String(a._id),
    name: a.name,
    description: a.description,
    facilities: count(facilities, a._id),
    users: count(users, a._id),
  }));
}

// Super admins see every area; everyone else only their own.
const listAreas = asyncHandler(async (req, res) => {
  const filter = req.user.role === "super_admin" ? {} : { _id: req.user.area ?? null };
  const areas = await Area.find(filter).sort({ name: 1 }).lean();
  res.json({ status: "ok", data: await withCounts(areas) });
});

const createArea = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ status: "error", message: "Area name is required" });
  // Case-insensitive, so "parlakhemundi" and "Parlakhemundi" count as one.
  if (await Area.exists({ name }).collation({ locale: "en", strength: 2 })) {
    return res.status(409).json({ status: "error", message: `An area called ${name} already exists` });
  }
  const area = await Area.create({ name, description: String(req.body.description || "").trim() });
  res.status(201).json({ status: "ok", message: "Area created", data: (await withCounts([area]))[0] });
});

const updateArea = asyncHandler(async (req, res) => {
  const set = {};
  if (typeof req.body.name === "string" && req.body.name.trim()) set.name = req.body.name.trim();
  if (typeof req.body.description === "string") set.description = req.body.description.trim();
  const area = await Area.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, runValidators: true });
  if (!area) return res.status(404).json({ status: "error", message: "Area not found" });
  res.json({ status: "ok", message: "Area updated", data: (await withCounts([area]))[0] });
});

// An area can only be removed once it is empty, so no facility or person is
// left pointing at an area that no longer exists.
const deleteArea = asyncHandler(async (req, res) => {
  const [facilities, users] = await Promise.all([
    Polyhouse.countDocuments({ area: req.params.id }),
    User.countDocuments({ area: req.params.id }),
  ]);
  if (facilities || users) {
    return res.status(409).json({
      status: "error",
      message: `Move or delete its ${facilities} facilities and ${users} people first`,
    });
  }
  const area = await Area.findByIdAndDelete(req.params.id);
  if (!area) return res.status(404).json({ status: "error", message: "Area not found" });
  res.json({ status: "ok", message: "Area deleted" });
});

module.exports = { listAreas, createArea, updateArea, deleteArea };
