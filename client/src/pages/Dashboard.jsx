import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Dna,
  Droplets,
  Ellipsis,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Sprout,
  Sun,
  Thermometer,
  Trash2,
  Wifi,
} from "lucide-react";
import { api } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { useAuth } from "../lib/auth";
import { can, isAdmin, isSuperAdmin } from "../lib/roles";
import { round, timeAgo } from "../lib/format";
import {
  FACILITY_TYPES,
  FACILITY_TYPE_KEYS,
  cycleProgress,
  measuresLightAndNutrients,
  typeMeta,
} from "../lib/facility";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import { Spinner } from "../components/Spinner";
import FacilityArt from "../components/art/FacilityArt";
import { CountUp } from "../components/ui";
import FacilityForm, { emptyFacility, facilityToForm, formToPayload } from "../components/FacilityForm";

const FILTERS = [{ key: "all", label: "All" }].concat(
  FACILITY_TYPE_KEYS.map((key) => ({ key, label: FACILITY_TYPES[key].plural }))
);

// forwardRef: AnimatePresence "popLayout" measures the exiting card, so it
// needs a ref on the outermost element.
const FacilityCard = forwardRef(function FacilityCard(
  { facility, showArea, onEdit, onDelete, index },
  ref
) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);
  const meta = typeMeta(facility.type);
  const latest = facility.latest;
  const cycle = facility.type === "speed_breeding" ? cycleProgress(facility.program) : null;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClickAway = (e) => {
      if (!wrapRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen]);

  return (
    <motion.article
      ref={ref}
      className="panel panel-hover facility-card"
      style={{ "--tone": meta.tone }}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.08, 0.4) }}
    >
      <Link to={`/facility/${facility._id}`} className="facility-art" tabIndex={-1} aria-hidden="true">
        <FacilityArt type={facility.type} />
        <span className="facility-type">
          <meta.icon size={13} /> {meta.label}
        </span>
        <span className={`facility-status ${facility.online ? "is-online" : ""}`}>
          <span className={`dot${facility.online ? " dot-live" : ""}`} />
          {facility.online ? "Online" : "Offline"}
        </span>
      </Link>

      <div className="facility-body">
        <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
            <h3 className="facility-name">{facility.name}</h3>
            <div className="facility-sub">
              {[facility.crop, facility.variety].filter(Boolean).join(" · ") || "No crop set"}
            </div>
          </div>

          {can(facility, "manage") && (
            <div className="menu-wrap" ref={wrapRef}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={`Options for ${facility.name}`}
                aria-expanded={menuOpen}
              >
                <Ellipsis size={17} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    className="menu"
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(facility);
                      }}
                    >
                      <Pencil size={15} /> Edit details
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(facility);
                      }}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="facility-metrics">
          {[
            { icon: Thermometer, label: "Temp", value: latest && round(latest.temp), unit: "°C" },
            { icon: Droplets, label: "RH", value: latest && round(latest.humidity), unit: "%" },
            { icon: Sprout, label: "Soil", value: latest && round(latest.moisture), unit: "%" },
            measuresLightAndNutrients(facility.type) && {
              icon: Sun,
              label: "PPFD",
              value: latest && round(latest.lightInt, 0),
              unit: "",
            },
          ]
            .filter(Boolean)
            .map((m) => (
            <div key={m.label} className="facility-metric">
              <span>
                <m.icon size={11} /> {m.label}
              </span>
              <strong>
                {m.value ?? "--"}
                {m.value !== undefined && m.value !== null && <small>{m.unit}</small>}
              </strong>
            </div>
          ))}
        </div>

        {cycle && (
          <div>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="faint">
                Generation {facility.program.generation} of {facility.program.totalGenerations}
              </span>
              <span className="faint">day {cycle.day}/{facility.program.cycleDays}</span>
            </div>
            <div className="meter" style={{ marginTop: 0 }}>
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${cycle.pct}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
          </div>
        )}

        <div className="facility-foot">
          <span className="faint row" style={{ gap: 6, minWidth: 0 }}>
            {facility.location || (showArea && facility.areaName) ? (
              <>
                <MapPin size={13} style={{ flexShrink: 0 }} />
                <span className="truncate">
                  {[showArea && facility.areaName, facility.location].filter(Boolean).join(" · ")}
                </span>
              </>
            ) : (
              <span>{latest ? `updated ${timeAgo(latest.date)}` : "no readings yet"}</span>
            )}
          </span>
          {facility.permission === "view" && <span className="pill access-pill">View only</span>}
          <Link to={`/facility/${facility._id}`} className="btn btn-ghost btn-sm">
            Open <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
});

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [areas, setAreas] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyFacility);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setRefreshing(true);
      try {
        const res = await api.listFacilities();
        setFacilities(res.data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  usePolling(() => load({ quiet: true }), 20000, [load]);

  // Areas feed the super admin's area filter and the area picker.
  useEffect(() => {
    if (!isAdmin(user)) return;
    api
      .listAreas()
      .then((res) => setAreas(res.data))
      .catch(() => setAreas([]));
  }, [user]);

  const superAdmin = isSuperAdmin(user);
  const showAreaFilter = superAdmin && areas.length > 1;

  const visible = useMemo(
    () =>
      facilities.filter(
        (f) =>
          (filter === "all" || f.type === filter) &&
          (areaFilter === "all" || String(f.area) === areaFilter)
      ),
    [facilities, filter, areaFilter]
  );

  const kpis = useMemo(
    () => ({
      total: facilities.length,
      online: facilities.filter((f) => f.online).length,
      relays: facilities.reduce((sum, f) => sum + (f.activeActuators || 0), 0),
      genotypes: facilities.reduce((sum, f) => sum + (f.genotypeCount || 0), 0),
    }),
    [facilities]
  );

  const counts = useMemo(() => {
    const c = { all: facilities.length };
    for (const f of facilities) c[f.type] = (c[f.type] || 0) + 1;
    return c;
  }, [facilities]);

  const openCreate = () => {
    // Preselect the area when there is only one, or one is being filtered.
    const defaultArea = areaFilter !== "all" ? areaFilter : areas.length === 1 ? areas[0].id : "";
    setForm({ ...emptyFacility, area: defaultArea });
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (facility) => {
    setForm({ ...facilityToForm(facility), area: facility.area ? String(facility.area) : "" });
    setEditing(facility);
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (superAdmin && form.area) payload.area = form.area;
      if (editing) {
        await api.updateFacility(editing._id, payload);
        toast.success("Facility updated");
      } else {
        await api.createFacility(payload);
        toast.success("Facility created");
      }
      setFormOpen(false);
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
      await api.deleteFacility(deleting._id);
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <motion.div
        className="row-between"
        style={{ marginBottom: 26 }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <span className="eyebrow">
            <span className="dot dot-live" /> Control room
          </span>
          <h1 className="section-title" style={{ marginTop: 10 }}>
            Good to see you, {user?.name?.split(" ")[0]}
          </h1>
          <p style={{ marginTop: 6, fontSize: "0.92rem" }}>
            {isAdmin(user)
              ? `${superAdmin ? "All areas" : user.area?.name || "Your area"} · every facility refreshes every 20 seconds.`
              : `${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"} shared with you in ${
                  user?.area?.name || "your area"
                } · refreshed every 20 seconds.`}
          </p>
        </div>

        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={() => load()} disabled={refreshing}>
            <motion.span
              style={{ display: "grid" }}
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { repeat: Infinity, duration: 0.9, ease: "linear" } : { duration: 0 }}
            >
              <RefreshCw size={15} />
            </motion.span>
            Refresh
          </button>
          {isAdmin(user) && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={16} /> New facility
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid kpis" style={{ marginBottom: 26 }}>
        {[
          { icon: Layers, label: "Facilities", value: kpis.total, tone: "var(--accent)" },
          { icon: Wifi, label: "Reporting now", value: kpis.online, tone: "var(--cyan)" },
          { icon: Activity, label: "Relays running", value: kpis.relays, tone: "var(--amber)" },
          { icon: Dna, label: "Genotypes in trials", value: kpis.genotypes, tone: "var(--violet)" },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            className="panel kpi"
            style={{ "--tone": k.tone }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 + i * 0.06 }}
          >
            <span className="metric-icon">
              <k.icon size={17} />
            </span>
            <div>
              <strong className="kpi-value">
                {loading ? "–" : <CountUp to={k.value} duration={0.9} />}
              </strong>
              <span className="faint">{k.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {showAreaFilter && (
        <div className="chips" role="radiogroup" aria-label="Area" style={{ marginBottom: 12 }}>
          {[{ id: "all", name: "All areas" }, ...areas].map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={areaFilter === a.id}
              className={`chip chip-soft${areaFilter === a.id ? " is-active" : ""}`}
              onClick={() => setAreaFilter(a.id)}
            >
              <MapPin size={12} /> {a.name}
            </button>
          ))}
        </div>
      )}

      <div className="row-between" style={{ marginBottom: 18 }}>
        <div className="tabs" role="tablist" aria-label="Filter facilities">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={`tab${filter === f.key ? " tab-active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {filter === f.key && (
                <motion.span
                  className="tab-pill"
                  layoutId="facility-filter"
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                />
              )}
              <span className="tab-label">
                {f.label}
                <span className="tab-count">{counts[f.key] || 0}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid facility-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 420 }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="panel empty">
          <Sprout size={30} style={{ color: "var(--accent)" }} />
          <h3>{facilities.length ? "Nothing of this type yet" : "No facilities yet"}</h3>
          <p style={{ maxWidth: "46ch" }}>
            {isAdmin(user)
              ? "Create one, or run `npm run seed` in the server folder to load the Parlakhemundi demo."
              : "No facilities have been shared with you yet. Ask your area admin to give you access."}
          </p>
          {isAdmin(user) && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={16} /> New facility
            </button>
          )}
        </div>
      ) : (
        <motion.div className="grid facility-grid">
          <AnimatePresence mode="popLayout">
            {visible.map((facility, index) => (
              <FacilityCard
                key={facility._id}
                facility={facility}
                index={index}
                showArea={superAdmin}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit facility" : "New facility"}
        onClose={() => setFormOpen(false)}
        wide
      >
        <FacilityForm
          areas={superAdmin ? areas : null}
          form={form}
          setForm={setForm}
          onSubmit={submit}
          onCancel={() => setFormOpen(false)}
          saving={saving}
          submitLabel={editing ? "Save changes" : "Create facility"}
        />
      </Modal>

      <Modal open={Boolean(deleting)} title="Delete facility" onClose={() => setDeleting(null)}>
        <p>
          <strong style={{ color: "var(--text)" }}>{deleting?.name}</strong> will be removed along
          with all of its sensor readings, targets and phenotyping observations. This cannot be
          undone.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={() => setDeleting(null)}>
            Keep it
          </button>
          <button className="btn btn-danger" onClick={confirmDelete} disabled={saving}>
            {saving ? <Spinner /> : <Trash2 size={15} />} Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
