// Endpoints for the boards in ../../arduino. They use an optional device key
// (DEVICE_KEY) instead of user login, since a board cannot sign in.
//   sensor_node posts readings, motor_node fetches the relay decision.
const router = require("express").Router();
const { postReading, deviceState } = require("../controllers/deviceController");
const { requireFacility, requireDeviceKey } = require("../middleware/validate");

const device = (pickId) => [requireDeviceKey, requireFacility(pickId)];

router.post("/readings", device((req) => req.body?.polyhsid), postReading);
router.get("/state/:id", device((req) => req.params.id), deviceState);

module.exports = router;
