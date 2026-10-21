const router = require("express").Router();
const {
  listUsers,
  createUser,
  updateUser,
  setAccess,
  deleteUser,
} = require("../controllers/userController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Super admins manage everyone; area admins manage the users of their area.
// The per-person rule is canManageUser in lib/access.js.
router.use(requireAuth, requireAdmin);

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.put("/:id/access", setAccess);
router.delete("/:id", deleteUser);

module.exports = router;
