const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Area = require("../models/Area");
const Polyhouse = require("../models/Polyhouse");
const { asyncHandler } = require("../middleware/errorHandler");
const { canManageUser, permissionFor, publicUser, sameId } = require("../lib/access");

const { ROLES, ACCESS_LEVELS } = User;

const bad = (res, message, status = 400) => res.status(status).json({ status: "error", message });

async function areaNames() {
  const areas = await Area.find().select("name").lean();
  return Object.fromEntries(areas.map((a) => [String(a._id), a.name]));
}

const present = (user, names) => publicUser(user, user.area ? names[String(user.area)] : undefined);

// Checks a list of { facility, level } grants for someone in `areaId`.
// Returns { grants } or { error }. Duplicate facilities keep the last level.
// `actor` is the admin doing the granting: nobody may hand out access to a
// facility they cannot reach themselves.
async function validateGrants(list, areaId, actor) {
  if (!Array.isArray(list)) return { error: "access must be a list" };
  const byFacility = new Map();
  for (const g of list) {
    if (!g || !mongoose.isValidObjectId(g.facility)) return { error: "Each grant needs a facility id" };
    if (!ACCESS_LEVELS.includes(g.level)) return { error: `Access level must be ${ACCESS_LEVELS.join(" or ")}` };
    byFacility.set(String(g.facility), g.level);
  }
  if (!byFacility.size) return { grants: [] };

  const facilities = await Polyhouse.find({ _id: { $in: [...byFacility.keys()] } })
    .select("name area")
    .lean();
  if (facilities.length !== byFacility.size) return { error: "One of those facilities does not exist" };

  const outside = facilities.find((f) => !sameId(f.area, areaId));
  if (outside) return { error: `${outside.name} is not in this person's area` };

  // An area admin limited to part of an area cannot grant the rest of it.
  if (actor) {
    const unreachable = facilities.find((f) => !permissionFor(actor, f));
    if (unreachable) return { error: `You do not have access to ${unreachable.name}` };
  }

  return { grants: [...byFacility].map(([facility, level]) => ({ facility, level })) };
}

// Super admins list everyone (optionally ?area=); area admins list the
// people in their own area.
const listUsers = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === "area_admin") filter = { area: req.user.area };
  else if (req.query.area && mongoose.isValidObjectId(req.query.area)) filter = { area: req.query.area };

  const [users, names] = await Promise.all([User.find(filter).sort({ role: 1, name: 1 }).lean(), areaNames()]);
  res.json({
    status: "ok",
    data: users.map((u) => ({ ...present(u, names), manageable: canManageUser(req.user, u) })),
  });
});

const createUser = asyncHandler(async (req, res) => {
  const actor = req.user;
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = req.body.password;

  if (!name) return bad(res, "Name is required");
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, "Enter a valid email");
  if (typeof password !== "string" || password.length < 6) {
    return bad(res, "Starting password must be at least 6 characters");
  }

  // Area admins can only add plain users, and only to their own area.
  let role = "user";
  let area = actor.area;
  if (actor.role === "super_admin") {
    role = ROLES.includes(req.body.role) ? req.body.role : "user";
    area = role === "super_admin" ? undefined : req.body.area;
    if (role !== "super_admin") {
      if (!mongoose.isValidObjectId(area) || !(await Area.exists({ _id: area }))) {
        return bad(res, "Choose the area this person belongs to");
      }
    }
  }

  // Grants scope a plain user's access, and optionally narrow an area admin
  // to part of their area. A super admin is never scoped.
  let access = [];
  if (role !== "super_admin" && req.body.access) {
    const result = await validateGrants(req.body.access, area, actor);
    if (result.error) return bad(res, result.error);
    access = result.grants;
  }

  try {
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      area,
      access,
      // A password chosen by someone else is temporary by definition.
      mustChangePassword: true,
    });
    res.status(201).json({ status: "ok", message: `${name} can now sign in`, data: present(user, await areaNames()) });
  } catch (error) {
    if (error.code === 11000) return bad(res, "That email is already in use", 409);
    throw error;
  }
});

async function loadTarget(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    bad(res, "User not found", 404);
    return null;
  }
  const target = await User.findById(req.params.id);
  if (!target || !canManageUser(req.user, target)) {
    // Same answer for "missing" and "not yours", like facilities.
    bad(res, "User not found", 404);
    return null;
  }
  return target;
}

const updateUser = asyncHandler(async (req, res) => {
  const target = await loadTarget(req, res);
  if (!target) return;
  const { name, email, password, role, area } = req.body;

  if (typeof name === "string" && name.trim()) target.name = name.trim();
  if (typeof email === "string" && email.trim()) target.email = email.toLowerCase().trim();
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 6) {
      return bad(res, "New password must be at least 6 characters");
    }
    target.password = await bcrypt.hash(password, 10);
    target.mustChangePassword = true;
  }

  // Only super admins move people between roles and areas.
  if (req.user.role === "super_admin") {
    if (role !== undefined) {
      if (!ROLES.includes(role)) return bad(res, "Unknown role");
      target.role = role;
    }
    if (target.role === "super_admin") {
      target.area = undefined;
    } else if (area !== undefined) {
      if (!mongoose.isValidObjectId(area) || !(await Area.exists({ _id: area }))) {
        return bad(res, "Choose an existing area");
      }
      target.area = area;
    }
    if (!target.area && target.role !== "super_admin") return bad(res, "Choose the area this person belongs to");
  }

  // A super admin reaches everything, so grants are meaningless for them.
  if (target.role === "super_admin") {
    target.access = [];
  } else {
    const facilities = await Polyhouse.find({ _id: { $in: target.access.map((g) => g.facility) } })
      .select("area")
      .lean();
    target.access = target.access.filter((g) =>
      facilities.some((f) => sameId(f._id, g.facility) && sameId(f.area, target.area))
    );
  }

  try {
    await target.save();
  } catch (error) {
    if (error.code === 11000) return bad(res, "That email is already in use", 409);
    throw error;
  }
  res.json({ status: "ok", message: "Saved", data: present(target.toObject(), await areaNames()) });
});

// Replaces a user's facility grants: [{ facility, level: "view" | "operate" }]
const setAccess = asyncHandler(async (req, res) => {
  const target = await loadTarget(req, res);
  if (!target) return;
  if (target.role === "super_admin") {
    return bad(res, "A super admin already reaches every area");
  }
  const result = await validateGrants(req.body.access, target.area, req.user);
  if (result.error) return bad(res, result.error);

  target.access = result.grants;
  await target.save();
  res.json({ status: "ok", message: "Access saved", data: present(target.toObject(), await areaNames()) });
});

const deleteUser = asyncHandler(async (req, res) => {
  const target = await loadTarget(req, res);
  if (!target) return;
  await target.deleteOne();
  res.json({ status: "ok", message: `${target.name} removed` });
});

module.exports = { listUsers, createUser, updateUser, setAccess, deleteUser };
