// Everything a sensor or motor node talks to. See ../../arduino for the firmware.
const Reading = require("../models/Reading");
const Threshold = require("../models/Threshold");
const ControlState = require("../models/ControlState");
const { decide, relayMap, undecidedReason, nextState } = require("../lib/control");
const { schedule } = require("../lib/photoperiod");
const { parseReading } = require("../lib/readings");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/device/readings  { polyhsid, temp, humidity, moisture, ... }
// Sent by arduino/sensor_node.
const postReading = asyncHandler(async (req, res) => {
  const { values, errors } = parseReading(req.body || {}, req.facilityType);
  if (errors.length) {
    return res.status(400).json({ status: "error", message: errors.join("; ") });
  }
  const reading = await Reading.create({ polyhsid: req.facilityId, ...values });
  res.status(201).json({ status: "ok", message: "Reading stored", data: reading });
});

// GET /api/device/state/:id
// The decision is made here, once. Firmware just switches relays to match,
// so the dashboard and the hardware cannot disagree.
const deviceState = asyncHandler(async (req, res) => {
  const facility = req.deviceFacility;
  const id = req.facilityId;

  if (facility.type === "phenotyping") {
    return res.json({
      ok: false,
      message: "A phenotyping station has no relays. Use the sensor node only.",
      actuators: {},
      targets: null,
    });
  }

  const [threshold, reading, state] = await Promise.all([
    Threshold.findById(id).lean(),
    Reading.findOne({ polyhsid: id }).sort({ date: -1 }).lean(),
    ControlState.findById(id).lean(),
  ]);

  const now = Date.now();
  const decisions = decide({ facility, threshold, reading, state, now });
  // All false when undecided, so a fresh board switches everything off.
  const actuators = relayMap(facility, decisions);

  // Remember what the board was told: the shade screen and the flow check
  // depend on it.
  const next = nextState(state, actuators, now);
  await ControlState.updateOne({ _id: id }, { $set: next }, { upsert: true });

  const photo = schedule(facility.photoperiod, new Date(now));
  res.json({
    ok: Boolean(decisions),
    message: decisions ? undefined : undecidedReason(threshold, reading, now),
    actuators,
    targets: threshold
      ? {
          temp: threshold.re_temp,
          humidity: threshold.re_humidity,
          moisture: threshold.re_soilmoisture,
        }
      : null,
    // For boards with a display; relays never need it.
    photoperiod: photo ? { lightsOn: photo.lightsOn, on: photo.lightsOnAt, off: photo.lightsOffAt } : null,
  });
});

module.exports = { postReading, deviceState };
