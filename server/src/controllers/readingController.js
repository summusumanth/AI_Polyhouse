const json2csv = require("json2csv").parse;
const Reading = require("../models/Reading");
const Polyhouse = require("../models/Polyhouse");
const { notMeasuredFor } = require("../lib/readings");
const Threshold = require("../models/Threshold");
const { describeActuators, nutrientAlerts, undecidedReason, isStale } = require("../lib/control");
const { TARGET_FIELDS } = require("../models/Threshold");
const { asyncHandler } = require("../middleware/errorHandler");

// Raw rows, newest first. Used for the history table and the metric tiles.
const listReadings = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
  const readings = await Reading.find({ polyhsid: req.params.id })
    .sort({ date: -1 })
    .limit(limit)
    .lean();
  res.json({ status: "ok", data: readings });
});

// Time series for charts, averaged into ~300 buckets so a week of 20-second
// readings does not ship 30,000 points to the browser.
const readingSeries = asyncHandler(async (req, res) => {
  const hours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 24 * 90);
  const since = new Date(Date.now() - hours * 3600 * 1000);
  const binMinutes = Math.max(1, Math.round((hours * 60) / 300));

  const avg = (field) => ({ $avg: `$${field}` });
  const round = (field, places = 1) => ({ $round: [`$${field}`, places] });

  const series = await Reading.aggregate([
    { $match: { polyhsid: req.params.id, date: { $gte: since } } },
    {
      $group: {
        _id: { $dateTrunc: { date: "$date", unit: "minute", binSize: binMinutes } },
        temp: avg("temp"),
        humidity: avg("humidity"),
        moisture: avg("moisture"),
        co2: avg("co2"),
        lightInt: avg("lightInt"),
        N: avg("N"),
        P: avg("P"),
        K: avg("K"),
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        temp: round("temp"),
        humidity: round("humidity"),
        moisture: round("moisture"),
        co2: round("co2", 0),
        lightInt: round("lightInt", 0),
        N: round("N", 0),
        P: round("P", 0),
        K: round("K", 0),
      },
    },
  ]);

  res.json({ status: "ok", data: series, meta: { hours, binMinutes } });
});

const exportCsv = asyncHandler(async (req, res) => {
  const fields = [
    "polyhsid",
    "temp",
    "humidity",
    "moisture",
    "co2",
    "N",
    "P",
    "K",
    "lightInt",
    "date",
  ];
  const facility = await Polyhouse.findById(req.params.id).select("type").lean();
  const skip = notMeasuredFor(facility?.type || "polyhouse");
  const columns = fields.filter((f) => !skip.includes(f));
  const readings = await Reading.find({ polyhsid: req.params.id }).sort({ date: -1 }).lean();
  const csv = json2csv(readings, { fields: columns });
  res.header("Content-Type", "text/csv");
  res.attachment(`facility-${req.params.id}.csv`);
  res.send(csv);
});

const getThreshold = asyncHandler(async (req, res) => {
  const threshold = await Threshold.findById(req.params.id).lean();
  res.json({ status: "ok", data: threshold || null });
});

const saveThreshold = asyncHandler(async (req, res) => {
  const set = {};
  const unset = {};

  for (const field of TARGET_FIELDS) {
    const raw = req.body[field.key];
    const blank = raw === undefined || raw === null || raw === "";

    if (blank) {
      if (field.required) {
        return res.status(400).json({ status: "error", message: `${field.label} is required` });
      }
      // An optional target left empty is removed, which switches its relay
      // off rather than leaving a stale number in charge.
      unset[field.key] = "";
      continue;
    }

    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > field.max) {
      return res.status(400).json({
        status: "error",
        message: `${field.label} must be a number between 0 and ${field.max}`,
      });
    }
    set[field.key] = value;
  }

  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;

  const threshold = await Threshold.findByIdAndUpdate(req.params.id, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  res.json({ status: "ok", message: "Targets saved", data: threshold });
});

// What the dashboard shows under "Actuators": the exact decision the
// firmware receives from /api/device/state, with the reason for each.
const getState = asyncHandler(async (req, res) => {
  const [threshold, latest] = await Promise.all([
    Threshold.findById(req.params.id).lean(),
    Reading.findOne({ polyhsid: req.params.id }).sort({ date: -1 }).lean(),
  ]);
  res.json({
    status: "ok",
    data: {
      threshold: threshold || null,
      latest: latest || null,
      actuators: describeActuators(threshold, latest),
      alerts: nutrientAlerts(threshold, latest),
      stale: Boolean(latest) && isStale(latest),
      message: undecidedReason(threshold, latest),
    },
  });
});

module.exports = {
  listReadings,
  readingSeries,
  exportCsv,
  getThreshold,
  saveThreshold,
  getState,
};
