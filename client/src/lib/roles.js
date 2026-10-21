// Mirrors server/src/lib/access.js. The server enforces every rule; these
// only decide what to show, so a stale value can at worst show a button
// whose request is then refused.

export const ROLE_LABELS = {
  super_admin: "Super admin",
  area_admin: "Area admin",
  user: "User",
};

export const ACCESS_LABELS = { view: "View", operate: "Operate", manage: "Manage" };

export const isSuperAdmin = (user) => user?.role === "super_admin";
export const isAdmin = (user) => user?.role === "super_admin" || user?.role === "area_admin";

// Facilities from the API carry the signed-in person's permission:
// "view" < "operate" < "manage".
const LEVELS = ["view", "operate", "manage"];
export const can = (facility, needed) =>
  LEVELS.indexOf(facility?.permission) >= LEVELS.indexOf(needed) && facility?.permission != null;

// "Area admin · Parlakhemundi", "Super admin", "User · Parlakhemundi"
export function roleLine(user) {
  if (!user) return "";
  const role = ROLE_LABELS[user.role] || "User";
  return user.area?.name ? `${role} · ${user.area.name}` : role;
}
