import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ACCESS_LABELS, ROLE_LABELS, isSuperAdmin } from "../lib/roles";
import { typeMeta } from "../lib/facility";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import { Spinner } from "../components/Spinner";

// Admin screen for people and access.
//   Super admin: every area, every person; can add areas and area admins.
//   Area admin:  the people of their own area; can add users and decide, per
//                facility, whether each one gets View or Operate access.
// The server enforces all of it (server/src/lib/access.js); this page only
// offers the actions that will be allowed.

// Area admins can also be given "Manage" (edit and delete the facility),
// which is what they get for the whole area when left unscoped.
const USER_LEVELS = [
  { value: "", label: "None" },
  { value: "view", label: "View" },
  { value: "operate", label: "Operate" },
];
const ADMIN_LEVELS = [...USER_LEVELS, { value: "manage", label: "Manage" }];

// A readable starting password, e.g. "kite-4927-moss".
function generatePassword() {
  const words = ["kite", "moss", "reed", "fern", "teak", "lime", "sage", "palm", "rice", "corn", "leaf", "seed"];
  const n = new Uint32Array(3);
  crypto.getRandomValues(n);
  return `${words[n[0] % words.length]}-${1000 + (n[1] % 9000)}-${words[n[2] % words.length]}`;
}

// The No access / View / Operate picker for every facility in one area.
function AccessPicker({ facilities, value, onChange, role = "user" }) {
  const levels = role === "area_admin" ? ADMIN_LEVELS : USER_LEVELS;
  if (!facilities.length) {
    return <div className="faint">This area has no facilities yet.</div>;
  }
  const levelOf = (id) => value.find((g) => g.facility === id)?.level || "";
  const setLevel = (id, level) => {
    const rest = value.filter((g) => g.facility !== id);
    onChange(level ? [...rest, { facility: id, level }] : rest);
  };

  return (
    <div className="access-picker">
      {facilities.map((f) => {
        const meta = typeMeta(f.type);
        const current = levelOf(f._id);
        return (
          <div key={f._id} className={`access-row${current ? " has-access" : ""}`}>
            <span className="access-name">
              <meta.icon size={15} style={{ color: meta.tone, flexShrink: 0 }} />
              <span className="truncate">{f.name}</span>
            </span>
            <div className="segmented" role="radiogroup" aria-label={`Access to ${f.name}`}>
              {levels.map((o) => (
                <button
                  type="button"
                  key={o.value || "none"}
                  role="radio"
                  aria-checked={current === o.value}
                  className={`segment${current === o.value ? " is-active" : ""} segment-${o.value || "none"}`}
                  onClick={() => setLevel(f._id, o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccessSummary({ person, facilitiesById }) {
  if (person.role === "super_admin") return <span className="access-chip access-all">Every area</span>;
  // An area admin with no grants runs the whole area; with grants, only those.
  if (person.role === "area_admin" && !person.access.length) {
    return <span className="access-chip access-all">Every facility in the area</span>;
  }
  if (!person.access.length) return <span className="faint">No access yet</span>;
  return (
    <div className="access-chips">
      {person.access.map((g) => (
        <span key={g.facility} className={`access-chip access-${g.level}`}>
          {(facilitiesById[g.facility]?.name || "Removed facility").split(" · ")[0]}
          <small>{ACCESS_LABELS[g.level]}</small>
        </span>
      ))}
    </div>
  );
}

export default function Team() {
  const { user } = useAuth();
  const toast = useToast();
  const superAdmin = isSuperAdmin(user);

  const [people, setPeople] = useState([]);
  const [areas, setAreas] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState("all");

  const [personModal, setPersonModal] = useState(null); // { mode: "create" | "edit", form, target }
  const [accessModal, setAccessModal] = useState(null); // { person, access }
  const [areaModal, setAreaModal] = useState(null); // { name, description }
  const [confirm, setConfirm] = useState(null); // { kind: "person" | "area", item }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, a, f] = await Promise.all([api.listUsers(), api.listAreas(), api.listFacilities()]);
      setPeople(p.data);
      setAreas(a.data);
      setFacilities(f.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const facilitiesById = useMemo(() => Object.fromEntries(facilities.map((f) => [f._id, f])), [facilities]);
<<<<<<< HEAD
  // Polyhouses first (A, B, C...), then speed breeding, then phenotyping.
  const TYPE_ORDER = ["polyhouse", "speed_breeding", "phenotyping"];
=======
  // Polyhouses first (A, B, C...), then grow chambers, then speed breeding.
  const TYPE_ORDER = ["polyhouse", "grow_chamber", "speed_breeding"];
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  const facilitiesIn = (areaId) =>
    facilities
      .filter((f) => String(f.area) === String(areaId))
      .sort(
        (a, b) =>
          TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name)
      );

  const visiblePeople = useMemo(
    () => (areaFilter === "all" ? people : people.filter((p) => p.area?.id === areaFilter)),
    [people, areaFilter]
  );

  const counts = useMemo(
    () => ({
      people: people.length,
      users: people.filter((p) => p.role === "user").length,
      admins: people.filter((p) => p.role !== "user").length,
      grants: people.reduce((n, p) => n + p.access.length, 0),
    }),
    [people]
  );

  // ---------------------------------------------------------------- people

  const openCreate = () => {
    const defaultArea = superAdmin ? (areaFilter !== "all" ? areaFilter : areas[0]?.id || "") : user.area?.id;
    setPersonModal({
      mode: "create",
      form: { name: "", email: "", password: generatePassword(), role: "user", area: defaultArea, access: [] },
    });
  };

  const openEdit = (person) =>
    setPersonModal({
      mode: "edit",
      target: person,
      form: {
        name: person.name,
        email: person.email,
        password: "",
        role: person.role,
        area: person.area?.id || "",
      },
    });

  const setForm = (patch) => setPersonModal((m) => ({ ...m, form: { ...m.form, ...patch } }));

  const savePerson = async (e) => {
    e.preventDefault();
    const { mode, form, target } = personModal;
    setSaving(true);
    try {
      if (mode === "create") {
        const body = { name: form.name, email: form.email, password: form.password };
        if (superAdmin) {
          body.role = form.role;
          body.area = form.area;
        }
        if (form.role === "user") body.access = form.access;
        const res = await api.createUser(body);
        toast.success(`${res.data.name} can now sign in. Share the starting password with them.`);
      } else {
        const body = { name: form.name, email: form.email };
        if (form.password) body.password = form.password;
        if (superAdmin) {
          body.role = form.role;
          if (form.role !== "super_admin") body.area = form.area;
        }
        await api.updateUser(target.id, body);
        toast.success(`${form.name} saved${form.password ? ", with the new password" : ""}`);
      }
      setPersonModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAccess = async () => {
    setSaving(true);
    try {
      await api.setUserAccess(accessModal.person.id, accessModal.access);
      toast.success(`Access for ${accessModal.person.name} saved. It applies immediately.`);
      setAccessModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------------- areas

  const saveArea = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createArea(areaModal);
      toast.success(`Area ${areaModal.name} created`);
      setAreaModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      if (confirm.kind === "person") await api.deleteUser(confirm.item.id);
      else await api.deleteArea(confirm.item.id);
      toast.success(`${confirm.item.name} removed`);
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------- render

  const form = personModal?.form;
  const roleOptions = superAdmin ? ["user", "area_admin", "super_admin"] : ["user"];

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <motion.div
        className="row-between"
        style={{ marginBottom: 24 }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div>
          <span className="eyebrow">
            <Users size={14} /> Team
          </span>
          <h1 className="section-title" style={{ marginTop: 10 }}>
            {superAdmin ? "Areas and people" : `People in ${user.area?.name || "your area"}`}
          </h1>
          <p style={{ marginTop: 6, fontSize: "0.92rem", maxWidth: "64ch" }}>
            {superAdmin
              ? "Create areas, give each one an admin, and see who can reach what."
              : "Add people and choose, polyhouse by polyhouse, whether they can only view it or also operate it."}
          </p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
          {superAdmin && (
            <button className="btn btn-ghost btn-sm" onClick={() => setAreaModal({ name: "", description: "" })}>
              <MapPin size={15} /> New area
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={openCreate} disabled={superAdmin && !areas.length}>
            <UserPlus size={16} /> Add person
          </button>
        </div>
      </motion.div>

      <div className="grid kpis" style={{ marginBottom: 24 }}>
        {[
          { icon: Users, label: "People", value: counts.people, tone: "var(--accent)" },
          { icon: ShieldCheck, label: "Admins", value: counts.admins, tone: "var(--violet)" },
          { icon: Users, label: "Users", value: counts.users, tone: "var(--cyan)" },
          { icon: KeyRound, label: "Facility grants", value: counts.grants, tone: "var(--amber)" },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            className="panel kpi"
            style={{ "--tone": k.tone }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05 }}
          >
            <span className="metric-icon">
              <k.icon size={17} />
            </span>
            <div>
              <strong className="kpi-value">{loading ? "–" : k.value}</strong>
              <span className="faint">{k.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {superAdmin && (
        <section style={{ marginBottom: 28 }}>
          <div className="section-head" style={{ marginBottom: 14 }}>
            <span className="eyebrow">
              <MapPin size={13} /> Areas
            </span>
          </div>
          {areas.length === 0 && !loading ? (
            <div className="panel empty">
              <MapPin size={26} style={{ color: "var(--accent)" }} />
              <h3>No areas yet</h3>
              <p>Create an area first. Facilities and people each belong to one.</p>
            </div>
          ) : (
            <div className="grid area-grid">
              {areas.map((a, i) => (
                <motion.div
                  key={a.id}
                  className={`panel area-card${areaFilter === a.id ? " is-selected" : ""}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  <button
                    className="area-card-main"
                    onClick={() => setAreaFilter(areaFilter === a.id ? "all" : a.id)}
                    title="Show this area's people"
                  >
                    <strong>{a.name}</strong>
                    {a.description && <span className="faint">{a.description}</span>}
                    <span className="area-stats">
                      <span>
                        <strong>{a.facilities}</strong> facilities
                      </span>
                      <span>
                        <strong>{a.users}</strong> people
                      </span>
                    </span>
                  </button>
                  {a.facilities === 0 && a.users === 0 && (
                    <button
                      className="btn btn-quiet btn-icon"
                      aria-label={`Delete ${a.name}`}
                      onClick={() => setConfirm({ kind: "area", item: a })}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <div className="section-head" style={{ marginBottom: 14 }}>
          <span className="eyebrow">
            <Users size={13} /> People
            {areaFilter !== "all" && ` · ${areas.find((a) => a.id === areaFilter)?.name}`}
          </span>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 320 }} />
        ) : (
          <div className="people">
            {visiblePeople.map((p, i) => (
              <motion.div
                key={p.id}
                className="panel person"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <div className="person-id">
                  <span className="avatar">{p.name.slice(0, 2).toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}>
                    <strong className="truncate" style={{ display: "block" }}>
                      {p.name} {p.id === user.id && <span className="faint">(you)</span>}
                    </strong>
                    <span className="faint truncate" style={{ display: "block" }}>
                      {p.email}
                    </span>
                  </div>
                </div>
                <div className="person-role">
                  <span className={`role-badge role-${p.role}`}>{ROLE_LABELS[p.role]}</span>
                  {p.area && (
                    <span className="faint row" style={{ gap: 4 }}>
                      <MapPin size={12} /> {p.area.name}
                    </span>
                  )}
                </div>
                <div className="person-access">
                  <AccessSummary person={p} facilitiesById={facilitiesById} />
                </div>
                <div className="person-actions">
                  {p.manageable && p.role !== "super_admin" && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setAccessModal({ person: p, access: p.access.map((g) => ({ ...g })) })}
                    >
                      <KeyRound size={14} /> Access
                    </button>
                  )}
                  {p.manageable && (
                    <>
                      <button className="btn btn-quiet btn-icon" aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn btn-quiet btn-icon"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => setConfirm({ kind: "person", item: p })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
            {!visiblePeople.length && (
              <div className="panel empty">
                <Users size={26} style={{ color: "var(--accent)" }} />
                <h3>Nobody here yet</h3>
                <p>Use “Add person” to create an account.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Add / edit person */}
      <Modal
        open={Boolean(personModal)}
        title={personModal?.mode === "edit" ? `Edit ${personModal.target.name}` : "Add person"}
        onClose={() => setPersonModal(null)}
        wide
      >
        {form && (
          <form className="stack" onSubmit={savePerson}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="p-name">Name</label>
                <input id="p-name" className="input" value={form.name} onChange={(e) => setForm({ name: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="p-email">Email</label>
                <input
                  id="p-email"
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="p-password">
                {personModal.mode === "create" ? "Starting password" : "New password"}{" "}
                <span className="faint">
                  {personModal.mode === "create"
                    ? "(share it with them; they can change it after signing in)"
                    : "(leave empty to keep the current one)"}
                </span>
              </label>
              <div className="row" style={{ gap: 8 }}>
                <input
                  id="p-password"
                  className="input mono"
                  value={form.password}
                  minLength={personModal.mode === "create" ? 6 : undefined}
                  required={personModal.mode === "create"}
                  onChange={(e) => setForm({ password: e.target.value })}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ password: generatePassword() })}>
                  <RefreshCw size={14} /> New
                </button>
              </div>
            </div>

            {superAdmin && (
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="p-role">Role</label>
                  <select
                    id="p-role"
                    className="input"
                    value={form.role}
                    onChange={(e) => setForm({ role: e.target.value, access: [] })}
                    disabled={personModal.mode === "edit" && personModal.target.id === user.id}
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                {form.role !== "super_admin" && (
                  <div className="field">
                    <label htmlFor="p-area">Area</label>
                    <select
                      id="p-area"
                      className="input"
                      value={form.area}
                      onChange={(e) => setForm({ area: e.target.value, access: [] })}
                      required
                    >
                      <option value="" disabled>
                        Choose an area
                      </option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {!superAdmin && (
              <div className="faint row" style={{ gap: 6 }}>
                <MapPin size={13} /> New people join {user.area?.name} as users.
              </div>
            )}

            {personModal.mode === "create" && form.role !== "super_admin" && form.area && (
              <div className="stack" style={{ gap: 10 }}>
                <h3 className="panel-subtitle" style={{ marginBottom: 0 }}>
                  Access <span className="faint">(can be changed any time)</span>
                </h3>
                {form.role === "area_admin" && (
                  <p className="faint" style={{ fontSize: "0.84rem" }}>
                    Leave every facility on “None” to let this admin run the whole area.
                  </p>
                )}
                <AccessPicker
                  facilities={facilitiesIn(form.area)}
                  value={form.access}
                  onChange={(access) => setForm({ access })}
                  role={form.role}
                />
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-quiet" onClick={() => setPersonModal(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner /> : personModal.mode === "create" ? <UserPlus size={16} /> : <Pencil size={15} />}
                {personModal.mode === "create" ? "Create account" : "Save"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Facility access */}
      <Modal
        open={Boolean(accessModal)}
        title={accessModal ? `Access for ${accessModal.person.name}` : ""}
        onClose={() => setAccessModal(null)}
        wide
      >
        {accessModal && (
          <div className="stack">
            <p style={{ fontSize: "0.9rem" }}>
              <strong style={{ color: "var(--text)" }}>View</strong>: readings, charts, relays and phenotyping.{" "}
              <strong style={{ color: "var(--text)" }}>Operate</strong>: also change targets and record observations.
              {accessModal.person.role === "area_admin" && (
                <>
                  {" "}
                  <strong style={{ color: "var(--text)" }}>Manage</strong>: also edit or delete the facility.
                </>
              )}{" "}
              Changes apply on their next click.
            </p>
            {accessModal.person.role === "area_admin" && (
              <div className="notice">
                <MapPin size={16} />
                <div>
                  <strong>
                    {accessModal.access.length
                      ? "Limited to the facilities chosen below"
                      : "Currently runs the whole area"}
                  </strong>
                  <p>
                    Leave every facility on “None” to give this admin the whole of{" "}
                    {accessModal.person.area?.name || "their area"}.
                  </p>
                </div>
              </div>
            )}
            <AccessPicker
              facilities={facilitiesIn(accessModal.person.area?.id)}
              value={accessModal.access}
              onChange={(access) => setAccessModal((m) => ({ ...m, access }))}
              role={accessModal.person.role}
            />
            <div className="modal-actions">
              <button type="button" className="btn btn-quiet" onClick={() => setAccessModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveAccess} disabled={saving}>
                {saving ? <Spinner /> : <KeyRound size={15} />} Save access
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New area */}
      <Modal open={Boolean(areaModal)} title="New area" onClose={() => setAreaModal(null)}>
        {areaModal && (
          <form className="stack" onSubmit={saveArea}>
            <div className="field">
              <label htmlFor="ar-name">Name</label>
              <input
                id="ar-name"
                className="input"
                placeholder="e.g. Bhubaneswar"
                value={areaModal.name}
                onChange={(e) => setAreaModal((a) => ({ ...a, name: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="ar-desc">
                Description <span className="faint">(optional)</span>
              </label>
              <input
                id="ar-desc"
                className="input"
                placeholder="e.g. Khordha district, Odisha"
                value={areaModal.description}
                onChange={(e) => setAreaModal((a) => ({ ...a, description: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-quiet" onClick={() => setAreaModal(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner /> : <Plus size={16} />} Create area
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm delete */}
      <Modal open={Boolean(confirm)} title={confirm?.kind === "area" ? "Delete area" : "Remove person"} onClose={() => setConfirm(null)}>
        <p>
          {confirm?.kind === "area" ? (
            <>
              Delete the area <strong style={{ color: "var(--text)" }}>{confirm?.item.name}</strong>? It has no facilities
              or people.
            </>
          ) : (
            <>
              Remove <strong style={{ color: "var(--text)" }}>{confirm?.item.name}</strong>? They are signed out at once
              and can no longer sign in. Their facilities and data are not affected.
            </>
          )}
        </p>
        <div className="modal-actions">
          <button className="btn btn-quiet" onClick={() => setConfirm(null)}>
            Keep
          </button>
          <button className="btn btn-danger" onClick={confirmDelete} disabled={saving}>
            {saving ? <Spinner /> : <Trash2 size={15} />} {confirm?.kind === "area" ? "Delete" : "Remove"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
