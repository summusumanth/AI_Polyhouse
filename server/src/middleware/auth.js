const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Polyhouse = require("../models/Polyhouse");
const { jwtSecret } = require("../config/env");
const { asyncHandler } = require("./errorHandler");
const { permissionFor, atLeast, isAdmin } = require("../lib/access");

// Reads the JWT from the Authorization header (Bearer ...) or the token cookie.
function readToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.token || null;
}

// The token only says who you are. Role, area and access are read from the
// database on every request, so a change by an admin applies immediately
// instead of when the token expires.
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ status: "error", message: "Not signed in" });
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    return res.status(401).json({ status: "error", message: "Session expired, please sign in again" });
  }

  const user = await User.findById(payload.id).lean();
  if (!user) {
    return res.status(401).json({ status: "error", message: "This account no longer exists" });
  }
  req.user = user;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ status: "error", message: "You do not have permission for this" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ status: "error", message: "Admins only" });
  }
  next();
};

// Loads the facility named by :id and checks the signed-in user may at least
// view it. Someone without access gets the same 404 as a missing facility,
// so ids of other areas' facilities are not confirmed to exist.
const loadFacility = asyncHandler(async (req, res, next) => {
  const notFound = () => res.status(404).json({ status: "error", message: "Facility not found" });
  if (!mongoose.isValidObjectId(req.params.id)) return notFound();

  const facility = await Polyhouse.findById(req.params.id).lean();
  const permission = permissionFor(req.user, facility);
  if (!permission) return notFound();

  req.facility = facility;
  req.permission = permission;
  next();
});

const requirePermission = (needed) => (req, res, next) => {
  if (!atLeast(req.permission, needed)) {
    const what = needed === "manage" ? "edit or delete this facility" : "change this facility";
    return res.status(403).json({ status: "error", message: `You have view access only, so you cannot ${what}` });
  }
  next();
};

module.exports = { requireAuth, requireRole, requireAdmin, loadFacility, requirePermission };
