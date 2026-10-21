const Polyhouse = require("../models/Polyhouse");
const Reading = require("../models/Reading");
const Threshold = require("../models/Threshold");
const Phenotype = require("../models/Phenotype");
const Area = require("../models/Area");
const User = require("../models/User");
const mongoose = require("mongoose");
const { computeActuators } = require("../lib/control");
const { asyncHandler } = require("../middleware/errorHandler");
const { facilityScope, permissionFor } = require("../lib/access");

const { FACILITY_TYPES, FACILITY_STATUSES } = Polyhouse;

// A facility counts as online if it reported within this window.
const ONLINE_WINDOW_MS = 60 * 60 * 1000;

const num = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

// Copies only the fields a client may set. Anything else in the body
// (seeded, _id, timestamps...) is ignored.
function pickFacilityFields(body) {
  const out = {};
  for (const key of ["name", "desc", "crop", "variety", "location"]) {
    if (typeof body[key] === "string") out[key] = body[key].trim();
  }
  if (FACILITY_TYPES.includes(body.type)) out.type = body.type;
  if (FACILITY_STATUSES.includes(body.status)) out.status = body.status;
  if (num(body.areaSqm) !== undefined) out.areaSqm = num(body.areaSqm);

  const lightHours = num(body.photoperiod?.lightHours);
  if (lightHours !== undefined) out["photoperiod.lightHours"] = lightHours;

  const p = body.program || {};
  if (num(p.generation) !== undefined) out["program.generation"] = num(p.generation);
  if (num(p.totalGenerations) !== undefined)
    out["program.totalGenerations"] = num(p.totalGenerations);
  if (num(p.cycleDays) !== undefined) out["program.cycleDays"] = num(p.cycleDays);
  if (p.cycleStartedAt) out["program.cycleStartedAt"] = new Date(p.cycleStartedAt);

  return out;
}

const listPolyhouses = asyncHandler(async (req, res) => {
  // One round trip: each facility with its newest reading and its targets.
  const houses = await Polyhouse.aggregate([
    // Only what this person may see: everything, their area, or their grants.
    { $match: facilityScope(req.user) },
    { $sort: { createdAt: -1 } },
    { $addFields: { idString: { $toString: "$_id" } } },
    {
      $lookup: {
        from: Reading.collection.name,
        let: { fid: "$idString" },
        pipeline: [
          { $match: { $expr: { $eq: ["$polyhsid", "$$fid"] } } },
          { $sort: { date: -1 } },
          { $limit: 1 },
        ],
        as: "latest",
      },
    },
    {
      $lookup: {
        from: Threshold.collection.name,
        localField: "idString",
        foreignField: "_id",
        as: "threshold",
      },
    },
    {
      $lookup: {
        from: Phenotype.collection.name,
        let: { fid: "$idString" },
        pipeline: [
          { $match: { $expr: { $eq: ["$facility", "$$fid"] } } },
          { $group: { _id: "$genotype" } },
        ],
        as: "genotypes",
      },
    },
    {
      $lookup: { from: Area.collection.name, localField: "area", foreignField: "_id", as: "areaDoc" },
    },
    {
      // Inclusion projection: anything not listed (such as idString) is dropped.
      $project: {
        area: 1,
        areaName: { $arrayElemAt: ["$areaDoc.name", 0] },
        latest: { $arrayElemAt: ["$latest", 0] },
        threshold: { $arrayElemAt: ["$threshold", 0] },
        genotypeCount: { $size: "$genotypes" },
        name: 1,
        desc: 1,
        type: 1,
        status: 1,
        crop: 1,
        variety: 1,
        location: 1,
        areaSqm: 1,
        photoperiod: 1,
        program: 1,
        createdAt: 1,
      },
    },
  ]);

  const now = Date.now();
  const data = houses.map((house) => {
    const actuators = computeActuators(house.threshold, house.latest);
    return {
      ...house,
      type: house.type || "polyhouse",
      online: Boolean(house.latest && now - new Date(house.latest.date).getTime() < ONLINE_WINDOW_MS),
      actuators,
      activeActuators: actuators ? Object.values(actuators).filter(Boolean).length : 0,
      permission: permissionFor(req.user, house),
    };
  });

  res.json({ status: "ok", data });
});

// req.facility and req.permission come from loadFacility (middleware/auth.js).
const getPolyhouse = asyncHandler(async (req, res) => {
  const house = req.facility;
  const area = house.area ? await Area.findById(house.area).select("name").lean() : null;
  res.json({
    status: "ok",
    data: { ...house, type: house.type || "polyhouse", areaName: area?.name ?? null, permission: req.permission },
  });
});

// Super admins choose the area; area admins always create in their own.
async function resolveArea(req) {
  if (req.user.role !== "super_admin") return { area: req.user.area };
  const area = req.body.area;
  if (!mongoose.isValidObjectId(area) || !(await Area.exists({ _id: area }))) {
    return { error: "Choose the area this facility belongs to" };
  }
  return { area };
}

const createPolyhouse = asyncHandler(async (req, res) => {
  const fields = pickFacilityFields(req.body);
  if (!fields.name || !fields.desc) {
    return res.status(400).json({ status: "error", message: "Name and description are required" });
  }
  const { area, error } = await resolveArea(req);
  if (error) return res.status(400).json({ status: "error", message: error });
  const house = await Polyhouse.create({ ...fields, area });

  // An area admin limited to certain facilities would otherwise create one
  // and immediately lose sight of it, so give them manage on what they make.
  if (req.user.role === "area_admin" && (req.user.access || []).length) {
    await User.updateOne(
      { _id: req.user._id },
      { $push: { access: { facility: house._id, level: "manage" } } }
    );
  }

  res.status(201).json({ status: "ok", message: "Facility created", data: house });
});

const updatePolyhouse = asyncHandler(async (req, res) => {
  const fields = pickFacilityFields(req.body);
  if (fields.name === "" || fields.desc === "") {
    return res.status(400).json({ status: "error", message: "Name and description cannot be empty" });
  }
  // Only super admins move a facility to another area. Grants held by people
  // of the old area stop counting at once (lib/access.js) and are removed.
  const movingTo = req.user.role === "super_admin" && req.body.area && String(req.body.area) !== String(req.facility.area);
  if (movingTo) {
    const { area, error } = await resolveArea(req);
    if (error) return res.status(400).json({ status: "error", message: error });
    fields.area = area;
  }
  const house = await Polyhouse.findByIdAndUpdate(
    req.params.id,
    { $set: fields },
    { new: true, runValidators: true }
  );
  if (house && movingTo) {
    await User.updateMany(
      { area: { $ne: house.area }, "access.facility": house._id },
      { $pull: { access: { facility: house._id } } }
    );
  }
  if (!house) {
    return res.status(404).json({ status: "error", message: "Facility not found" });
  }
  res.json({ status: "ok", message: "Facility updated", data: house });
});

const deletePolyhouse = asyncHandler(async (req, res) => {
  const house = await Polyhouse.findByIdAndDelete(req.params.id);
  if (!house) {
    return res.status(404).json({ status: "error", message: "Facility not found" });
  }
  await Promise.all([
    Reading.deleteMany({ polyhsid: req.params.id }),
    Threshold.findByIdAndDelete(req.params.id),
    Phenotype.deleteMany({ facility: req.params.id }),
    User.updateMany({}, { $pull: { access: { facility: house._id } } }),
  ]);
  res.json({ status: "ok", message: "Facility deleted" });
});

module.exports = {
  listPolyhouses,
  getPolyhouse,
  createPolyhouse,
  updatePolyhouse,
  deletePolyhouse,
};
