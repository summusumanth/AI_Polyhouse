const Polyhouse = require("../models/Polyhouse");
const Reading = require("../models/Reading");
const Threshold = require("../models/Threshold");
const Phenotype = require("../models/Phenotype");
<<<<<<< HEAD
const ControlState = require("../models/ControlState");
const Area = require("../models/Area");
const User = require("../models/User");
const mongoose = require("mongoose");
const { decide, alerts } = require("../lib/control");
const { schedule } = require("../lib/photoperiod");
const cameras = require("../lib/cameras");
const { asyncHandler } = require("../middleware/errorHandler");
const { facilityScope, permissionFor, atLeast } = require("../lib/access");

const { FACILITY_TYPES, FACILITY_STATUSES, CAMERA_ROLES, PHENO_DEVICES, EQUIPMENT } = Polyhouse;
=======
const Area = require("../models/Area");
const User = require("../models/User");
const mongoose = require("mongoose");
const { computeActuators } = require("../lib/control");
const { asyncHandler } = require("../middleware/errorHandler");
const { facilityScope, permissionFor } = require("../lib/access");

const { FACILITY_TYPES, FACILITY_STATUSES } = Polyhouse;
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

// A facility counts as online if it reported within this window.
const ONLINE_WINDOW_MS = 60 * 60 * 1000;

const num = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

<<<<<<< HEAD
const blank = (value) => value === "" || value === null;

/*
  Copies only the fields a client may set, as a { $set, $unset } update.
  Anything else in the body (seeded, _id, timestamps...) is ignored.
  `type` is the facility's type after this change, which decides which of
  the type-specific fields apply. Returns { update } or { error }.
*/
function facilityUpdate(body, type) {
  const set = {};
  const unset = {};

  for (const key of ["name", "desc", "crop", "variety", "location"]) {
    if (typeof body[key] === "string") set[key] = body[key].trim();
  }
  if (FACILITY_TYPES.includes(body.type)) set.type = body.type;
  if (FACILITY_STATUSES.includes(body.status)) set.status = body.status;
  if (num(body.areaSqm) !== undefined) set.areaSqm = num(body.areaSqm);
  else if (blank(body.areaSqm)) unset.areaSqm = "";

  // Climate-controlled types: light schedule and fitted relays.
  if (type !== "phenotyping") {
    const p = body.photoperiod || {};
    if (num(p.lightHours) !== undefined) set["photoperiod.lightHours"] = num(p.lightHours);
    else if (blank(p.lightHours)) unset.photoperiod = "";
    if (typeof p.lightsOnAt === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.lightsOnAt)) {
      set["photoperiod.lightsOnAt"] = p.lightsOnAt;
    } else if (blank(p.lightsOnAt)) {
      unset["photoperiod.lightsOnAt"] = "";
    }

    if (Array.isArray(body.equipment)) set.equipment = body.equipment.filter((k) => EQUIPMENT.includes(k));
  }

  if (type === "speed_breeding") {
    const p = body.program || {};
    for (const key of ["generation", "totalGenerations", "cycleDays"]) {
      if (num(p[key]) !== undefined) set[`program.${key}`] = num(p[key]);
    }
    if (p.cycleStartedAt) set["program.cycleStartedAt"] = new Date(p.cycleStartedAt);
  }

  if (type === "phenotyping") {
    if (body.sowingDate) set.sowingDate = new Date(body.sowingDate);
    else if (blank(body.sowingDate)) unset.sowingDate = "";
    if (Array.isArray(body.phenoDevices)) set.phenoDevices = body.phenoDevices.filter((k) => PHENO_DEVICES.includes(k));
  }

  // Cameras: only the slots this type has.
  if (body.cameras && typeof body.cameras === "object") {
    for (const role of CAMERA_ROLES[type] || []) {
      if (!(role in body.cameras)) continue;
      const { value, error } = cameras.cleanCamera(body.cameras[role], cameras.ROLE_LABELS[role]);
      if (error) return { error };
      if (value) set[`cameras.${role}`] = value;
      else if (value === null) unset[`cameras.${role}`] = "";
    }
  }

  return { update: tidy({ $set: set, $unset: unset }), set };
}

// Overlapping paths in one update conflict: drop an $unset that a $set
// touches, and an $unset already covered by unsetting its parent.
function tidy(update) {
  const set = { ...(update.$set || {}) };
  const unset = { ...(update.$unset || {}) };
  for (const key of Object.keys(unset)) {
    if (Object.keys(set).some((s) => s === key || s.startsWith(`${key}.`) || key.startsWith(`${s}.`))) delete unset[key];
  }
  for (const key of Object.keys(unset)) {
    if (Object.keys(unset).some((u) => key.startsWith(`${u}.`))) delete unset[key];
  }
  const out = {};
  if (Object.keys(set).length) out.$set = set;
  if (Object.keys(unset).length) out.$unset = unset;
  return out;
}

// What a person may see of a facility: camera URLs only with manage access.
const shape = (house, permission) =>
  atLeast(permission, "manage") ? house : cameras.redact(house);

const listPolyhouses = asyncHandler(async (req, res) => {
  // One round trip: each facility with its newest reading, targets, relay
  // memory and trial size.
=======
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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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
<<<<<<< HEAD
    { $lookup: { from: Threshold.collection.name, localField: "idString", foreignField: "_id", as: "threshold" } },
    { $lookup: { from: ControlState.collection.name, localField: "idString", foreignField: "_id", as: "controlState" } },
=======
    {
      $lookup: {
        from: Threshold.collection.name,
        localField: "idString",
        foreignField: "_id",
        as: "threshold",
      },
    },
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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
<<<<<<< HEAD
    { $lookup: { from: Area.collection.name, localField: "area", foreignField: "_id", as: "areaDoc" } },
    {
      $addFields: {
        areaName: { $arrayElemAt: ["$areaDoc.name", 0] },
        latest: { $arrayElemAt: ["$latest", 0] },
        threshold: { $arrayElemAt: ["$threshold", 0] },
        controlState: { $arrayElemAt: ["$controlState", 0] },
        genotypeCount: { $size: "$genotypes" },
      },
    },
    { $project: { idString: 0, areaDoc: 0, genotypes: 0, seeded: 0, __v: 0 } },
  ]);

  const now = Date.now();
  const data = houses.map(({ controlState, ...house }) => {
    house.type = house.type || "polyhouse";
    const args = { facility: house, threshold: house.threshold, reading: house.latest, state: controlState, now };
    const decisions = house.type === "phenotyping" ? null : decide(args);
    const permission = permissionFor(req.user, house);
    return {
      ...shape(house, permission),
      online: Boolean(house.latest && now - new Date(house.latest.date).getTime() < ONLINE_WINDOW_MS),
      actuators: decisions ? Object.fromEntries(decisions.map((d) => [d.key, d.on])) : null,
      activeActuators: decisions ? decisions.filter((d) => d.on).length : 0,
      alertCount: house.type === "phenotyping" ? 0 : alerts(args).length,
      lightsOn: schedule(house.photoperiod, new Date(now))?.lightsOn ?? null,
      cameraCount: cameras.configured(house).length,
      permission,
=======
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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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
<<<<<<< HEAD
    data: {
      ...shape(house, req.permission),
      type: house.type || "polyhouse",
      areaName: area?.name ?? null,
      permission: req.permission,
    },
  });
});

// GET /:id/cameras: how to show each configured camera. Relay URLs carry a
// 15-minute token, so the page asks again before they run out.
const listCameras = asyncHandler(async (req, res) => {
  const house = req.facility;
  const data = cameras.configured(house).map((role) => cameras.playInfo(house, role, req));
  res.json({ status: "ok", data });
});

// GET /api/camera-feed/:token: the MJPEG or snapshot relay. An <img> cannot
// send a login header, so the short-lived token in the URL is the login.
const cameraFeed = asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = cameras.readFeedToken(req.params.token);
  } catch {
    return res.status(401).json({ status: "error", message: "Camera link expired. Reload the page." });
  }
  if (!mongoose.isValidObjectId(payload.f)) return res.status(404).end();
  const house = await Polyhouse.findById(payload.f).select("type cameras").lean();
  if (!house || !cameras.configured(house).includes(payload.r)) {
    return res.status(404).json({ status: "error", message: "Camera not found" });
  }
  await cameras.relay(house, payload.r, res);
});

=======
    data: { ...house, type: house.type || "polyhouse", areaName: area?.name ?? null, permission: req.permission },
  });
});

>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
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
<<<<<<< HEAD
  const type = FACILITY_TYPES.includes(req.body.type) ? req.body.type : "polyhouse";
  const { update, set, error: fieldError } = facilityUpdate(req.body, type);
  if (fieldError) return res.status(400).json({ status: "error", message: fieldError });
  if (!set.name || !set.desc) {
=======
  const fields = pickFacilityFields(req.body);
  if (!fields.name || !fields.desc) {
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    return res.status(400).json({ status: "error", message: "Name and description are required" });
  }
  const { area, error } = await resolveArea(req);
  if (error) return res.status(400).json({ status: "error", message: error });
<<<<<<< HEAD

  // Dotted paths ("photoperiod.lightHours") need an update to apply, so the
  // document is created first and the rest set on it.
  const house = await Polyhouse.create({ name: set.name, desc: set.desc, type, area });
  const saved = await Polyhouse.findByIdAndUpdate(house._id, update, { new: true, runValidators: true });
=======
  const house = await Polyhouse.create({ ...fields, area });
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

  // An area admin limited to certain facilities would otherwise create one
  // and immediately lose sight of it, so give them manage on what they make.
  if (req.user.role === "area_admin" && (req.user.access || []).length) {
<<<<<<< HEAD
    await User.updateOne({ _id: req.user._id }, { $push: { access: { facility: house._id, level: "manage" } } });
  }

  const gateway = await cameras.syncFacility(saved.toObject());
  res.status(201).json({
    status: "ok",
    message: gateway.ok ? "Facility created" : "Facility created, but the RTSP gateway could not be reached",
    data: saved,
  });
});

const updatePolyhouse = asyncHandler(async (req, res) => {
  const type = FACILITY_TYPES.includes(req.body.type) ? req.body.type : req.facility.type || "polyhouse";
  const { update, set, error: fieldError } = facilityUpdate(req.body, type);
  if (fieldError) return res.status(400).json({ status: "error", message: fieldError });
  if (set.name === "" || set.desc === "") {
    return res.status(400).json({ status: "error", message: "Name and description cannot be empty" });
  }

  // Only super admins move a facility to another area. Grants held by people
  // of the old area stop counting at once (lib/access.js) and are removed.
  const movingTo =
    req.user.role === "super_admin" && req.body.area && String(req.body.area) !== String(req.facility.area);
  if (movingTo) {
    const { area, error } = await resolveArea(req);
    if (error) return res.status(400).json({ status: "error", message: error });
    update.$set = { ...(update.$set || {}), area };
  }

  // A facility that changes type keeps nothing that belonged to the old one.
  if (type !== (req.facility.type || "polyhouse")) {
    const drop = { program: "", sowingDate: "", phenoDevices: "", equipment: "", cameras: "" };
    if (type === "phenotyping") drop.photoperiod = "";
    update.$unset = { ...(update.$unset || {}), ...drop };
  }

  const house = await Polyhouse.findByIdAndUpdate(req.params.id, tidy(update), { new: true, runValidators: true });
  if (!house) {
    return res.status(404).json({ status: "error", message: "Facility not found" });
  }
  if (movingTo) {
=======
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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    await User.updateMany(
      { area: { $ne: house.area }, "access.facility": house._id },
      { $pull: { access: { facility: house._id } } }
    );
  }
<<<<<<< HEAD
  const gateway = await cameras.syncFacility(house.toObject());
  res.json({
    status: "ok",
    message: gateway.ok ? "Facility updated" : "Facility updated, but the RTSP gateway could not be reached",
    data: house,
  });
=======
  if (!house) {
    return res.status(404).json({ status: "error", message: "Facility not found" });
  }
  res.json({ status: "ok", message: "Facility updated", data: house });
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
});

const deletePolyhouse = asyncHandler(async (req, res) => {
  const house = await Polyhouse.findByIdAndDelete(req.params.id);
  if (!house) {
    return res.status(404).json({ status: "error", message: "Facility not found" });
  }
  await Promise.all([
    Reading.deleteMany({ polyhsid: req.params.id }),
    Threshold.findByIdAndDelete(req.params.id),
<<<<<<< HEAD
    ControlState.findByIdAndDelete(req.params.id),
    Phenotype.deleteMany({ facility: req.params.id }),
    User.updateMany({}, { $pull: { access: { facility: house._id } } }),
    cameras.syncFacility(house.toObject(), { removed: true }),
=======
    Phenotype.deleteMany({ facility: req.params.id }),
    User.updateMany({}, { $pull: { access: { facility: house._id } } }),
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  ]);
  res.json({ status: "ok", message: "Facility deleted" });
});

module.exports = {
  listPolyhouses,
  getPolyhouse,
<<<<<<< HEAD
  listCameras,
  cameraFeed,
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  createPolyhouse,
  updatePolyhouse,
  deletePolyhouse,
};
