const mongoose = require("mongoose");
<<<<<<< HEAD
const multer = require("multer");
const Phenotype = require("../models/Phenotype");
const Polyhouse = require("../models/Polyhouse");
const Reading = require("../models/Reading");
const { TRAITS, TRAIT_KEYS, CONTEXT_KEYS, DERIVED, derived } = require("../lib/traits");
const { analyseImage, modelAvailable } = require("../lib/vision");
const { grabFrame, configured } = require("../lib/cameras");
const { asyncHandler } = require("../middleware/errorHandler");
const { facilityScope } = require("../lib/access");

// A reading this recent counts as "the conditions when the plant was
// measured", and fills air temperature and PPFD on a new observation.
const CONTEXT_WINDOW_MS = 60 * 60 * 1000;

const notStation = (res) =>
  res.status(400).json({
    status: "error",
    message: "Phenotyping observations are recorded at a phenotyping station. Create a facility of type Phenotyping.",
  });

// All observations for one station, oldest first so growth curves read
// left to right.
const listForFacility = asyncHandler(async (req, res) => {
  const observations = await Phenotype.find({ facility: req.params.id }).sort({ date: 1, genotype: 1 }).lean();
  res.json({ status: "ok", data: observations });
});

// Latest observation per genotype across every phenotyping station this
// person can see (or one, with ?facility=), with the derived traits.
const latestByGenotype = asyncHandler(async (req, res) => {
  const stations = await Polyhouse.find({ ...facilityScope(req.user), type: "phenotyping" })
    .select("name crop sowingDate phenoDevices")
    .lean();
  let ids = stations.map((f) => String(f._id));
  if (req.query.facility) {
    if (!mongoose.isValidObjectId(req.query.facility)) return res.json({ status: "ok", data: [] });
    ids = ids.filter((id) => id === String(req.query.facility));
  }
  const byId = Object.fromEntries(stations.map((f) => [String(f._id), f]));

  const rows = await Phenotype.aggregate([
    { $match: { facility: { $in: ids } } },
    { $sort: { date: 1 } },
    {
      $group: {
        _id: { facility: "$facility", genotype: "$genotype" },
        all: { $push: "$$ROOT" },
=======
const Phenotype = require("../models/Phenotype");
const Polyhouse = require("../models/Polyhouse");
const { asyncHandler } = require("../middleware/errorHandler");
const { facilityScope } = require("../lib/access");

const TRAITS = ["plantHeight", "leafCount", "leafArea", "canopyCover", "ndvi", "spad", "biomass"];

// All observations for one facility, oldest first so growth curves read
// left to right.
const listForFacility = asyncHandler(async (req, res) => {
  const observations = await Phenotype.find({ facility: req.params.id })
    .sort({ date: 1, genotype: 1 })
    .lean();
  res.json({ status: "ok", data: observations });
});

// Latest observation per genotype, across every facility (or one, with
// ?facility=). Feeds the phenotyping overview and its rankings.
const latestByGenotype = asyncHandler(async (req, res) => {
  const visible = await Polyhouse.find(facilityScope(req.user)).select("_id").lean();
  let ids = visible.map((f) => String(f._id));
  if (req.query.facility) {
    if (!mongoose.isValidObjectId(req.query.facility)) {
      return res.json({ status: "ok", data: [] });
    }
    ids = ids.filter((id) => id === String(req.query.facility));
  }
  const match = { facility: { $in: ids } };

  const rows = await Phenotype.aggregate([
    { $match: match },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: { facility: "$facility", genotype: "$genotype" },
        latest: { $first: "$$ROOT" },
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
        observations: { $sum: 1 },
        firstDate: { $min: "$date" },
      },
    },
    { $sort: { "_id.facility": 1, "_id.genotype": 1 } },
  ]);

<<<<<<< HEAD
  const data = rows.map((r) => {
    const station = byId[r._id.facility];
    // The newest value of each trait, even if the newest record skipped it
    // (yield is weighed once, at harvest).
    const latestOf = (key) => {
      for (let i = r.all.length - 1; i >= 0; i -= 1) {
        if (Number.isFinite(r.all[i][key])) return r.all[i][key];
      }
      return null;
    };
    const last = r.all[r.all.length - 1];
    return {
      facility: r._id.facility,
      facilityName: station.name,
      crop: station.crop,
      genotype: r._id.genotype,
      observations: r.observations,
      firstDate: r.firstDate,
      date: last.date,
      growthStage: last.growthStage,
      flowering: r.all.some((o) => o.flowering),
      ...Object.fromEntries(TRAIT_KEYS.map((t) => [t, latestOf(t)])),
      ...derived(r.all, station.sowingDate),
    };
  });

  res.json({ status: "ok", data, meta: { traits: TRAITS, derived: DERIVED } });
});

const createObservation = asyncHandler(async (req, res) => {
  if (req.facility.type !== "phenotyping") return notStation(res);
  const body = req.body || {};
  if (!body.genotype || typeof body.genotype !== "string" || !body.genotype.trim()) {
=======
  const facilityIds = [...new Set(rows.map((r) => r._id.facility))];
  const facilities = await Polyhouse.find({ _id: { $in: facilityIds } })
    .select("name type crop")
    .lean();
  const byId = Object.fromEntries(facilities.map((f) => [String(f._id), f]));

  const data = rows
    .filter((r) => byId[r._id.facility])
    .map((r) => ({
      facility: r._id.facility,
      facilityName: byId[r._id.facility].name,
      facilityType: byId[r._id.facility].type || "polyhouse",
      crop: byId[r._id.facility].crop,
      genotype: r._id.genotype,
      observations: r.observations,
      firstDate: r.firstDate,
      ...Object.fromEntries(TRAITS.map((t) => [t, r.latest[t] ?? null])),
      growthStage: r.latest.growthStage,
      date: r.latest.date,
    }));

  res.json({ status: "ok", data });
});

const createObservation = asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.genotype || typeof body.genotype !== "string") {
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    return res.status(400).json({ status: "error", message: "Genotype is required" });
  }
  const doc = {
    facility: req.params.id,
    genotype: body.genotype.trim(),
    plot: typeof body.plot === "string" ? body.plot.trim() : "",
    growthStage: typeof body.growthStage === "string" ? body.growthStage.trim() : "",
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
<<<<<<< HEAD
    flowering: body.flowering === true || body.flowering === "true",
    date: body.date ? new Date(body.date) : new Date(),
  };
  if (Number.isNaN(doc.date.getTime())) {
    return res.status(400).json({ status: "error", message: "Date is not valid" });
  }
  for (const key of [...TRAIT_KEYS, ...CONTEXT_KEYS]) {
    if (body[key] === undefined || body[key] === null || body[key] === "") continue;
    const value = Number(body[key]);
    if (!Number.isFinite(value)) {
      return res.status(400).json({ status: "error", message: `${key} is not a number` });
    }
    doc[key] = value;
  }
  if (body.imageAnalysis && typeof body.imageAnalysis === "object") {
    const a = body.imageAnalysis;
    doc.imageAnalysis = {
      method: String(a.method || "").slice(0, 80),
      greenness: Number.isFinite(Number(a.greenness)) ? Number(a.greenness) : undefined,
      evenness: Number.isFinite(Number(a.evenness)) ? Number(a.evenness) : undefined,
      canopyCover: Number.isFinite(Number(a.canopyCover)) ? Number(a.canopyCover) : undefined,
    };
  }

  // Conditions at the time: the station's PAR and air sensors, when they
  // reported close to the observation's date and nobody typed a value.
  const window = {
    $gte: new Date(doc.date.getTime() - CONTEXT_WINDOW_MS),
    $lte: new Date(doc.date.getTime() + CONTEXT_WINDOW_MS),
  };
  const nearest = (channel) =>
    Reading.findOne({ polyhsid: req.params.id, date: window, [channel]: { $type: "number" } })
      .sort({ date: -1 })
      .select(channel)
      .lean();
  const [air, par] = await Promise.all([
    doc.airTemp === undefined ? nearest("temp") : null,
    doc.ppfd === undefined ? nearest("lightInt") : null,
  ]);
  if (air) doc.airTemp = air.temp;
  if (par) doc.ppfd = par.lightInt;

=======
    date: body.date ? new Date(body.date) : new Date(),
  };
  for (const trait of TRAITS) {
    if (body[trait] !== undefined && body[trait] !== "") doc[trait] = Number(body[trait]);
  }
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  const observation = await Phenotype.create(doc);
  res.status(201).json({ status: "ok", message: "Observation recorded", data: observation });
});

<<<<<<< HEAD
// Photos up to 15 MB, kept in memory only for the analysis.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    if (!ok) req.rejectedUpload = file.originalname || "that file";
    cb(null, ok);
  },
});

const acceptPhoto = (req, res, next) =>
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE" ? "Photo is larger than 15 MB" : error.message;
    res.status(400).json({ status: "error", message });
  });

/*
  POST /:id/phenotypes/analyse
    multipart "image"           a photo taken by hand
    JSON { camera: "rgb" }      a frame grabbed from the station's camera
  Returns canopy cover, greenness (leaf colour) and evenness from the RGB
  image. Nothing is stored: the numbers fill the observation form.
*/
const analyse = asyncHandler(async (req, res) => {
  if (req.facility.type !== "phenotyping") return notStation(res);

  if (req.rejectedUpload) {
    return res.status(400).json({ status: "error", message: `${req.rejectedUpload} is not an image. Upload a JPEG or PNG photo.` });
  }
  let image = req.file?.buffer;
  let source = "upload";
  if (!image) {
    const role = req.body?.camera || "rgb";
    if (!configured(req.facility).includes(role)) {
      return res.status(400).json({ status: "error", message: "Upload a photo, or add an RGB camera URL to this station." });
    }
    try {
      image = await grabFrame(req.facility.cameras[role]);
    } catch (error) {
      return res.status(error.status || 502).json({ status: "error", message: error.message });
    }
    source = `${role} camera`;
  }

  try {
    const result = await analyseImage(image);
    res.json({ status: "ok", data: { ...result, source, modelAvailable: modelAvailable() } });
  } catch (error) {
    res.status(400).json({ status: "error", message: `Could not read that image (${error.message})` });
  }
});

module.exports = { listForFacility, latestByGenotype, createObservation, analyse, acceptPhoto };
=======
module.exports = { listForFacility, latestByGenotype, createObservation, TRAITS };
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
