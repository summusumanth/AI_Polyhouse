// Every "who can see / change what" decision lives here.
//
//   super_admin  every facility, every area
//   area_admin   their own area. With no grants that means every facility in
//                it; with grants, only those, at the level granted. A super
//                admin uses that to put one admin in charge of part of an area.
//   user         only facilities granted to them
//
// Permission levels, weakest first. Each includes the ones before it.
//   view     readings, charts, relay state, phenotyping, CSV export
//   operate  + change targets, record phenotyping observations
//   manage   + edit or delete the facility (admins only)

const LEVELS = ["view", "operate", "manage"];

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// The strongest permission `user` has on `facility`, or null for none.
function permissionFor(user, facility) {
  if (!user || !facility) return null;
  if (user.role === "super_admin") return "manage";
  // A grant only counts while the facility is still in the person's area, so
  // moving a facility elsewhere quietly ends old access to it.
  if (!sameId(user.area, facility.area)) return null;

  const grants = user.access || [];
  // An area admin with no grants runs the whole area.
  if (user.role === "area_admin" && grants.length === 0) return "manage";

  const grant = grants.find((g) => sameId(g.facility, facility._id));
  return grant ? grant.level : null;
}

const atLeast = (permission, needed) =>
  permission != null && LEVELS.indexOf(permission) >= LEVELS.indexOf(needed);

// A MongoDB filter matching exactly the facilities `user` may see.
function facilityScope(user) {
  if (user.role === "super_admin") return {};
  // No area means nothing to see. ({ area: null } would wrongly match every
  // facility that has no area yet.)
  if (!user.area) return { _id: { $in: [] } };
  const ids = (user.access || []).map((g) => g.facility);
  // Same rule as permissionFor: an unscoped area admin sees the whole area.
  if (user.role === "area_admin" && ids.length === 0) return { area: user.area };
  return { _id: { $in: ids }, area: user.area };
}

const isAdmin = (user) => user?.role === "super_admin" || user?.role === "area_admin";

// Can `actor` create, edit or delete the account `target`?
// Super admins manage everyone but themselves (no locking yourself out);
// area admins manage plain users in their own area.
function canManageUser(actor, target) {
  if (!actor || !target || sameId(actor._id, target._id)) return false;
  if (actor.role === "super_admin") return true;
  return actor.role === "area_admin" && target.role === "user" && sameId(actor.area, target.area);
}

// The public shape of a user: never the password hash.
function publicUser(user, areaName) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    area: user.area ? { id: String(user.area), name: areaName ?? null } : null,
    access: (user.access || []).map((g) => ({ facility: String(g.facility), level: g.level })),
    mustChangePassword: Boolean(user.mustChangePassword),
    createdAt: user.createdAt,
  };
}

module.exports = {
  LEVELS,
  permissionFor,
  atLeast,
  facilityScope,
  isAdmin,
  canManageUser,
  publicUser,
  sameId,
};
