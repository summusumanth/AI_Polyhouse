const router = require("express").Router();
const { listAreas, createArea, updateArea, deleteArea } = require("../controllers/areaController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

router.get("/", listAreas); // super admin: all; everyone else: their own
router.post("/", requireRole("super_admin"), createArea);
router.patch("/:id", requireRole("super_admin"), updateArea);
router.delete("/:id", requireRole("super_admin"), deleteArea);

module.exports = router;
