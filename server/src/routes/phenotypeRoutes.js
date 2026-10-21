const router = require("express").Router();
const { latestByGenotype } = require("../controllers/phenotypeController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);
router.get("/latest", latestByGenotype);

module.exports = router;
