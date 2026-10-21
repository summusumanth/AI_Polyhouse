const router = require("express").Router();
const {
  listPolyhouses,
  getPolyhouse,
  listCameras,
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
const { listForFacility, createObservation, analyse, acceptPhoto } = require("../controllers/phenotypeController");
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

router.get("/:id/cameras", view, listCameras);

router.get("/:id/readings", view, listReadings);
router.get("/:id/readings/series", view, readingSeries);
router.get("/:id/readings/export", view, exportCsv);
router.get("/:id/state", view, getState);

router.get("/:id/threshold", view, getThreshold);
// Targets drive real hardware: operate access or above.
router.put("/:id/threshold", operate, saveThreshold);

router.get("/:id/phenotypes", view, listForFacility);
router.post("/:id/phenotypes", operate, createObservation);
router.post("/:id/phenotypes/analyse", operate, acceptPhoto, analyse);

module.exports = router;
