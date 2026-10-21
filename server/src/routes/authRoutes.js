const router = require("express").Router();
const { login, me, changePassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

// No /register: accounts are created by admins (see userRoutes).
router.post("/login", login);
router.get("/me", requireAuth, me);
router.patch("/password", requireAuth, changePassword);

module.exports = router;
