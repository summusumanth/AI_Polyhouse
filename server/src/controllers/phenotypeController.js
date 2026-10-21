const mongoose = require("mongoose");
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
        observations: { $sum: 1 },
        firstDate: { $min: "$date" },
      },
    },
    { $sort: { "_id.facility": 1, "_id.genotype": 1 } },
  ]);

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
    return res.status(400).json({ status: "error", message: "Genotype is required" });
  }
  const doc = {
    facility: req.params.id,
    genotype: body.genotype.trim(),
    plot: typeof body.plot === "string" ? body.plot.trim() : "",
    growthStage: typeof body.growthStage === "string" ? body.growthStage.trim() : "",
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    date: body.date ? new Date(body.date) : new Date(),
  };
  for (const trait of TRAITS) {
    if (body[trait] !== undefined && body[trait] !== "") doc[trait] = Number(body[trait]);
  }
  const observation = await Phenotype.create(doc);
  res.status(201).json({ status: "ok", message: "Observation recorded", data: observation });
});

module.exports = { listForFacility, latestByGenotype, createObservation, TRAITS };
