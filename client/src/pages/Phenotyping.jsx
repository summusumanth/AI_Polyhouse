import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Check, Dna, Flower2, MapPin, Microscope, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isAdmin } from "../lib/roles";
import { timeAgo } from "../lib/format";
import {
  ALL_TRAITS,
  DERIVED,
  MEASUREMENT_MAP,
  PHENO_DEVICES,
  PHENO_DEVICE_KEYS,
  formatChannel,
  formatTrait,
  traitOrder,
} from "../lib/facility";
import { useToast } from "../components/Toast";
import { PhenotypingArt } from "../components/art/FacilityArt";
import { TraitRanking } from "../components/TraitCharts";
import { CountUp } from "../components/ui";

function StationCard({ station, lines, index }) {
  const fitted = new Set(station.phenoDevices || []);
  return (
    <motion.article
      className="panel station-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.06 }}
    >
      <div className="room-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title">{station.name}</h2>
          <div className="facility-sub">{[station.crop, station.variety].filter(Boolean).join(" · ") || "No crop set"}</div>
          <span className="row faint" style={{ gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            {station.location && (
              <span className="row" style={{ gap: 5 }}>
                <MapPin size={12} /> {station.location}
              </span>
            )}
            <span className="row" style={{ gap: 6 }}>
              <span className={`dot${station.online ? " dot-live" : ""}`} />
              {station.latest ? `sensors ${timeAgo(station.latest.date)}` : "no sensor readings"}
            </span>
          </span>
        </div>
        <Link to={`/facility/${station._id}`} className="btn btn-ghost btn-sm">
          Open <ArrowRight size={15} />
        </Link>
      </div>

      <div className="device-icons">
        {PHENO_DEVICE_KEYS.map((key) => {
          const d = PHENO_DEVICES[key];
          const on = fitted.has(key);
          return (
            <span key={key} className={`device-icon${on ? " is-fitted" : ""}`} title={`${d.label}${on ? "" : " (not installed)"}`}>
              <d.icon size={15} />
            </span>
          );
        })}
      </div>

      <div className="station-stats">
        <span>
          <strong className="mono">{lines.length}</strong> <span className="faint">genotypes</span>
        </span>
        <span>
          <strong className="mono">{lines.reduce((n, l) => n + l.observations, 0)}</strong> <span className="faint">observations</span>
        </span>
        <span>
          <Camera size={13} /> <strong className="mono">{station.cameraCount || 0}</strong> <span className="faint">cameras</span>
        </span>
        {station.latest?.lightInt !== undefined && (
          <span>
            <strong className="mono">{formatChannel("lightInt", station.latest.lightInt)}</strong>{" "}
            <span className="faint">µmol/m²/s PAR</span>
          </span>
        )}
      </div>
    </motion.article>
  );
}

export default function Phenotyping() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState("all");
  const [trait, setTrait] = useState("plantHeight");

  useEffect(() => {
    Promise.all([api.latestPhenotypes(), api.listFacilities()])
      .then(([pheno, facilities]) => {
        setRows(pheno.data);
        setStations(facilities.data.filter((f) => f.type === "phenotyping"));
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const visible = useMemo(() => (facility === "all" ? rows : rows.filter((r) => r.facility === facility)), [rows, facility]);

  const present = useMemo(
    () => Object.keys(ALL_TRAITS).filter((k) => visible.some((r) => Number.isFinite(r[k]))),
    [visible]
  );

  useEffect(() => {
    if (present.length && !present.includes(trait)) setTrait(present[0]);
  }, [present, trait]);

  const leader = useMemo(
    () => visible.filter((r) => Number.isFinite(r[trait])).sort(traitOrder(trait))[0] || null,
    [visible, trait]
  );

  const observationCount = rows.reduce((sum, r) => sum + r.observations, 0);
  const flowering = rows.filter((r) => r.flowering).length;
  const meta = ALL_TRAITS[trait] || ALL_TRAITS.plantHeight;

  // How many stations can measure each trait.
  const coverage = MEASUREMENT_MAP.map((m) => ({
    ...m,
    stations: stations.filter((s) => m.needs.every((n) => (s.phenoDevices || []).includes(n))).length,
  }));

  return (
    <div className="wrap" style={{ paddingTop: 36 }}>
      <section className="pheno-hero panel">
        <motion.div className="pheno-hero-copy" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}>
          <span className="eyebrow">
            <Microscope size={14} /> Phenotyping
          </span>
          <h1 className="section-title">Measure every line, then keep the best</h1>
          <p>
            Phenotyping stations record plant height, leaf count and area, leaf colour, canopy temperature, NDVI, stem
            thickness, flowering time and yield, using RGB, thermal and multispectral cameras, a PAR sensor, a stem
            sensor and a scale.
          </p>
        </motion.div>
        <motion.div className="pheno-hero-art" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
          <PhenotypingArt />
        </motion.div>
      </section>

      <div className="grid kpis" style={{ margin: "22px 0" }}>
        {[
          { icon: Microscope, label: "Phenotyping stations", value: stations.length, tone: "var(--cyan)" },
          { icon: Dna, label: "Genotypes measured", value: rows.length, tone: "var(--violet)" },
          { icon: Check, label: "Observations", value: observationCount, tone: "var(--accent)" },
          { icon: Flower2, label: "Lines flowering", value: flowering, tone: "var(--rose)" },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            className="panel kpi"
            style={{ "--tone": k.tone }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
          >
            <span className="metric-icon">
              <k.icon size={17} />
            </span>
            <div>
              <strong className="kpi-value">{loading ? "–" : <CountUp to={k.value} duration={0.9} />}</strong>
              <span className="faint">{k.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="section-head" style={{ marginBottom: 16 }}>
        <span className="eyebrow">
          <Microscope size={13} /> Stations
        </span>
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : stations.length === 0 ? (
        <div className="panel empty">
          <Microscope size={28} style={{ color: "var(--cyan)" }} />
          <h3>No phenotyping stations yet</h3>
          <p style={{ maxWidth: "48ch" }}>
            {isAdmin(user)
              ? "Create a facility of type Phenotyping in the Control room, tick the devices it has and give its cameras their URLs."
              : "An administrator needs to add a phenotyping station first, or give you access to one."}
          </p>
        </div>
      ) : (
        <div className="grid station-grid">
          {stations.map((s, i) => (
            <StationCard key={s._id} station={s} index={i} lines={rows.filter((r) => r.facility === String(s._id))} />
          ))}
        </div>
      )}

      <div className="section-head" style={{ margin: "36px 0 16px" }}>
        <span className="eyebrow">
          <Trophy size={13} /> Trait rankings
        </span>
        <p style={{ maxWidth: "62ch" }}>Latest value of every genotype. Open a station for growth curves and to record observations.</p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 380 }} />
      ) : rows.length === 0 ? (
        <div className="panel empty">
          <Microscope size={30} style={{ color: "var(--accent)" }} />
          <h3>No phenotyping data yet</h3>
          <p>Record observations from a station's Traits tab, or run the seed script.</p>
        </div>
      ) : (
        <>
          <div className="stack" style={{ gap: 12, marginBottom: 18 }}>
            {stations.length > 1 && (
              <div className="chips" role="radiogroup" aria-label="Station">
                {[{ _id: "all", name: "All stations" }, ...stations].map((s) => (
                  <button
                    key={s._id}
                    role="radio"
                    aria-checked={facility === s._id}
                    className={`chip${facility === s._id ? " is-active" : ""}`}
                    onClick={() => setFacility(s._id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            <div className="chips" role="radiogroup" aria-label="Trait">
              {present.map((key) => (
                <button
                  key={key}
                  role="radio"
                  aria-checked={trait === key}
                  className={`chip chip-soft${trait === key ? " is-active" : ""}${DERIVED[key] ? " chip-derived" : ""}`}
                  onClick={() => setTrait(key)}
                >
                  {ALL_TRAITS[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid detail-grid">
            <motion.section
              className="panel"
              key={`${facility}-${trait}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">
                    Ranking by {meta.label.toLowerCase()} {meta.unit && <span className="faint">({meta.unit})</span>}
                  </h2>
                  <span className="faint">
                    {meta.better === "low" ? "lowest first" : "highest first"} · measured with {PHENO_DEVICES[meta.device].label}
                  </span>
                </div>
              </div>
              <TraitRanking rows={visible} trait={trait} />
            </motion.section>

            <motion.section
              className="panel leader-panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.06 }}
            >
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">Top performer</h2>
                  <span className="faint">{meta.label}</span>
                </div>
                <Trophy size={20} style={{ color: "var(--amber)" }} />
              </div>
              {leader && (
                <motion.div
                  key={`${trait}-${leader.facility}-${leader.genotype}`}
                  className="leader"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20 }}
                >
                  <strong className="leader-name">{leader.genotype}</strong>
                  <span className="leader-value mono">
                    {formatTrait(trait, leader[trait])} <small>{meta.unit}</small>
                  </span>
                  <span className="faint">
                    {leader.crop} · {leader.growthStage}
                  </span>
                  <Link to={`/facility/${leader.facility}`} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
                    {leader.facilityName} <ArrowRight size={14} />
                  </Link>
                </motion.div>
              )}
            </motion.section>
          </div>

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-head">
              <div>
                <h2 className="panel-title">All genotypes</h2>
                <span className="faint">latest values; shaded columns are worked out from the observations</span>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Genotype</th>
                    <th>Station</th>
                    <th>Stage</th>
                    {present.map((k) => (
                      <th key={k} className={`${k === trait ? "th-active" : ""}${DERIVED[k] ? " th-derived" : ""}`}>
                        {ALL_TRAITS[k].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={`${r.facility}-${r.genotype}`}>
                      <td style={{ fontFamily: "var(--font)", fontWeight: 600 }}>
                        {r.genotype} {r.flowering && <Flower2 size={12} style={{ color: "var(--rose)" }} />}
                      </td>
                      <td style={{ fontFamily: "var(--font)" }}>
                        <Link to={`/facility/${r.facility}`} className="link-quiet">
                          {r.facilityName}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font)" }}>{r.growthStage || "--"}</td>
                      {present.map((k) => (
                        <td key={k} className={`${k === trait ? "td-active" : ""}${DERIVED[k] ? " td-derived" : ""}`}>
                          {formatTrait(k, r[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <div>
            <h2 className="panel-title">What the portal can measure</h2>
            <span className="faint">each plant trait, the device or method behind it, and how many stations are equipped for it</span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data measure-table">
            <thead>
              <tr>
                <th>Plant trait</th>
                <th>Device or method</th>
                <th>Stations equipped</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((m) => (
                <tr key={m.trait}>
                  <td style={{ fontFamily: "var(--font)", fontWeight: 600 }}>{m.trait}</td>
                  <td style={{ fontFamily: "var(--font)" }}>{m.method}</td>
                  <td>
                    {m.stations} / {stations.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
