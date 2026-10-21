// Everything a sensor node talks to. See ../../arduino for the firmware.
const Reading = require("../models/Reading");
const Threshold = require("../models/Threshold");
const { computeActuators, undecidedReason } = require("../lib/control");
const { parseReading } = require("../lib/readings");
const { asyncHandler } = require("../middleware/errorHandler");

async function storeReading(facilityId, facilityType, raw, res) {
  const { values, errors, ignored } = parseReading(raw, facilityType);
  if (errors.length) {
    return res.status(400).json({ status: "error", message: errors.join("; ") });
  }
  const reading = await Reading.create({ polyhsid: facilityId, ...values });
  return res.status(201).json({
    status: "ok",
    message: ignored.length
      ? `Reading stored. Not measured in a ${facilityType}, so ignored: ${ignored.join(", ")}`
      : "Reading stored",
    data: reading,
  });
}

// POST /api/device/readings  { polyhsid, temp, humidity, moisture, ... }
// Sent by arduino/sensor_node.
const postReading = asyncHandler(async (req, res) =>
  storeReading(req.facilityId, req.facilityType, req.body, res)
);

async function loadState(facilityId) {
  const [threshold, current] = await Promise.all([
    Threshold.findById(facilityId).lean(),
    Reading.findOne({ polyhsid: facilityId }).sort({ date: -1 }).lean(),
  ]);
  return { threshold, current };
}

// GET /api/device/state/:id
// The decision is made here, once. Firmware just switches relays to match,
// so the dashboard and the hardware cannot disagree.
const deviceState = asyncHandler(async (req, res) => {
  const { threshold, current } = await loadState(req.facilityId);
  const actuators = computeActuators(threshold, current);

  res.json({
    ok: Boolean(actuators),
    message: actuators ? undefined : undecidedReason(threshold, current),
    // All false when undecided, so a fresh board switches everything off.
    actuators: actuators || { fan: false, cooler: false, mister: false, irrigation: false },
    targets: threshold
      ? {
          temp: threshold.re_temp,
          humidity: threshold.re_humidity,
          moisture: threshold.re_soilmoisture,
        }
      : null,
  });
});

module.exports = { postReading, deviceState };
