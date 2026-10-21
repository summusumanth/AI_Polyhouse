const mongoose = require("mongoose");
const Polyhouse = require("../models/Polyhouse");
const { deviceKey } = require("../config/env");
const { asyncHandler } = require("./errorHandler");

// Device routes take the facility id from the URL or the body. Checking it
// exists stops a typo in the firmware from quietly filing readings under a
// facility nobody can see.
const requireFacility = (pick) =>
  asyncHandler(async (req, res, next) => {
    const id = pick(req);
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        status: "error",
        message: `Unknown facility id "${id ?? ""}". Copy the id from the facility page.`,
      });
    }
    const facility = await Polyhouse.findById(id).select("type").lean();
    if (!facility) {
      return res.status(404).json({
        status: "error",
        message: `No facility with id ${id}. Copy the id from the facility page.`,
      });
    }
    req.facilityId = String(id);
    req.facilityType = facility.type || "polyhouse";
    next();
  });

// When DEVICE_KEY is set, a board must send it as the X-Device-Key header.
// Unset means any board on the network may report.
function requireDeviceKey(req, res, next) {
  if (!deviceKey) return next();
  const supplied = req.get("x-device-key");
  if (supplied !== deviceKey) {
    return res.status(401).json({ status: "error", message: "Missing or wrong device key" });
  }
  next();
}

module.exports = { requireFacility, requireDeviceKey };
