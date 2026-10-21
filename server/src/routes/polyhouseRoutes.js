const router = require("express").Router();
const {
  listPolyhouses,
  getPolyhouse,
<<<<<<< HEAD
  listCameras,
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  createPolyhouse,
  updatePolyhouse,
  deletePolyhouse,
} = require("../controllers/polyhouseController");
const {
  listReadings,
  readingSeries,
  exportCsv,
  getThreshold,
  saveThreshold,
  getState,
} = require("../controllers/readingController");
<<<<<<< HEAD
const { listForFacility, createObservation, analyse, acceptPhoto } = require("../controllers/phenotypeController");
=======
const { listForFacility, createObservation } = require("../controllers/phenotypeController");
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
const { requireAuth, requireAdmin, loadFacility, requirePermission } = require("../middleware/auth");

// Levels (lib/access.js): view < operate < manage.
const view = [loadFacility];
const operate = [loadFacility, requirePermission("operate")];
const manage = [loadFacility, requirePermission("manage")];

router.use(requireAuth);

router.get("/", listPolyhouses); // filtered to what you may see
router.post("/", requireAdmin, createPolyhouse); // in your area (super admin: any)

router.get("/:id", view, getPolyhouse);
router.patch("/:id", manage, updatePolyhouse);
router.delete("/:id", manage, deletePolyhouse);

<<<<<<< HEAD
router.get("/:id/cameras", view, listCameras);

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
router.get("/:id/readings", view, listReadings);
router.get("/:id/readings/series", view, readingSeries);
router.get("/:id/readings/export", view, exportCsv);
router.get("/:id/state", view, getState);

router.get("/:id/threshold", view, getThreshold);
// Targets drive real hardware: operate access or above.
router.put("/:id/threshold", operate, saveThreshold);

router.get("/:id/phenotypes", view, listForFacility);
router.post("/:id/phenotypes", operate, createObservation);
<<<<<<< HEAD
router.post("/:id/phenotypes/analyse", operate, acceptPhoto, analyse);
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

module.exports = router;
