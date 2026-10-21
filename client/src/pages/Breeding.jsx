import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Dna, MapPin, Microscope, Trophy, Zap } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isAdmin } from "../lib/roles";
import { timeAgo } from "../lib/format";
import { TRAITS, TRAIT_KEYS, cycleProgress, formatTrait, typeMeta } from "../lib/facility";
import { useToast } from "../components/Toast";
import { BreedingArt } from "../components/art/FacilityArt";
import { GenerationTracker, PhotoperiodRing } from "../components/SpeedBreedingPanel";
import { TraitRanking } from "../components/TraitCharts";
import { CountUp } from "../components/ui";

// Speed breeding and phenotyping belong together: rooms cycle generations
// fast, and phenotyping decides which lines go on to the next generation.
// The rooms come first, then the trait rankings across every trial.

function RoomCard({ room, lines, index }) {
  const cycle = cycleProgress(room.program);
  const leader = lines
    .filter((l) => Number.isFinite(l.plantHeight))
    .sort((a, b) => b.plantHeight - a.plantHeight)[0];

  return (
    <motion.article
      className="panel room-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
    >
      <div className="room-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title">{room.name}</h2>
          <div className="facility-sub">
            {[room.crop, room.variety].filter(Boolean).join(" · ") || "No crop set"}
          </div>
          <span className="row faint" style={{ gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            {room.location && (
              <span className="row" style={{ gap: 5 }}>
                <MapPin size={12} /> {room.location}
              </span>
            )}
            <span className="row" style={{ gap: 6 }}>
              <span className={`dot${room.online ? " dot-live" : ""}`} />
              {room.latest ? `updated ${timeAgo(room.latest.date)}` : "no readings yet"}
            </span>
          </span>
        </div>
        <Link to={`/facility/${room._id}`} className="btn btn-ghost btn-sm">
          Open <ArrowRight size={15} />
        </Link>
      </div>

      <div className="room-body">
        {room.photoperiod?.lightHours ? (
          <PhotoperiodRing lightHours={room.photoperiod.lightHours} />
        ) : (
          <span className="faint">No photoperiod set.</span>
        )}
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          {cycle && room.program?.totalGenerations ? (
            <GenerationTracker program={room.program} />
          ) : (
            <span className="faint">Set the generation programme on the facility to track cycles.</span>
          )}
        </div>
      </div>

      <div className="room-lines">
        <span className="row" style={{ gap: 8 }}>
          <Dna size={15} style={{ color: "var(--violet)" }} />
          <strong>{lines.length}</strong>
          <span className="muted">{lines.length === 1 ? "line" : "lines"} in this generation's trial</span>
        </span>
        {leader && (
          <span className="room-leader">
            <Trophy size={14} style={{ color: "var(--amber)" }} />
            <strong>{leader.genotype}</strong>
            <span className="faint">
              tallest · {formatTrait("plantHeight", leader.plantHeight)} cm · {leader.growthStage}
            </span>
          </span>
        )}
      </div>
    </motion.article>
  );
}

export default function Breeding() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState("all");
  const [trait, setTrait] = useState("ndvi");

  useEffect(() => {
    Promise.all([api.latestPhenotypes(), api.listFacilities()])
      .then(([pheno, facilities]) => {
        setRows(pheno.data);
        setRooms(facilities.data.filter((f) => f.type === "speed_breeding"));
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  // Every facility that has a trial, for the ranking filter.
  const trialFacilities = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.facility)) {
        map.set(r.facility, { id: r.facility, name: r.facilityName, type: r.facilityType });
      }
    }
    return [...map.values()];
  }, [rows]);

  const visible = useMemo(
    () => (facility === "all" ? rows : rows.filter((r) => r.facility === facility)),
    [rows, facility]
  );

  const leader = useMemo(
    () => visible.filter((r) => Number.isFinite(r[trait])).sort((a, b) => b[trait] - a[trait])[0] || null,
    [visible, trait]
  );

  const generationsPerYear = rooms.reduce(
    (best, r) => Math.max(best, cycleProgress(r.program)?.generationsPerYear || 0),
    0
  );
  const observationCount = rows.reduce((sum, r) => sum + r.observations, 0);
  const meta = TRAITS[trait];

  return (
    <div className="wrap" style={{ paddingTop: 36 }}>
      <section className="pheno-hero panel">
        <motion.div
          className="pheno-hero-copy"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className="eyebrow">
            <Zap size={14} /> Speed breeding <span aria-hidden="true">&</span> <Microscope size={14} /> Phenotyping
          </span>
          <h1 className="section-title">Breed faster, then measure which lines to keep</h1>
          <p>
            Speed breeding rooms run 22-hour days to fit up to six generations into a year.
            Phenotyping measures every line in each generation, so the best ones go forward to the
            next cycle.
          </p>
        </motion.div>
        <motion.div
          className="pheno-hero-art"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
        >
          <BreedingArt />
        </motion.div>
      </section>

      <div className="grid kpis" style={{ margin: "22px 0" }}>
        {[
          { icon: Zap, label: "Speed breeding rooms", value: rooms.length, tone: "var(--violet)" },
          { icon: Zap, label: "Generations a year", value: generationsPerYear, tone: "var(--accent)" },
          { icon: Dna, label: "Genotypes measured", value: rows.length, tone: "var(--amber)" },
          { icon: Microscope, label: "Observations", value: observationCount, tone: "var(--cyan)" },
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

      {/* Speed breeding rooms */}
      <div className="section-head" style={{ marginBottom: 16 }}>
        <span className="eyebrow">
          <Zap size={13} /> Speed breeding rooms
        </span>
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : rooms.length === 0 ? (
        <div className="panel empty">
          <Zap size={28} style={{ color: "var(--violet)" }} />
          <h3>No speed breeding rooms yet</h3>
          <p style={{ maxWidth: "46ch" }}>
            {isAdmin(user)
              ? "Create a facility of type Speed breeding in the Control room to track its photoperiod and generations here."
              : "An administrator needs to add a speed breeding facility first."}
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 18 }}>
          {rooms.map((room, i) => (
            <RoomCard
              key={room._id}
              room={room}
              index={i}
              lines={rows.filter((r) => r.facility === String(room._id))}
            />
          ))}
        </div>
      )}

      {/* Phenotyping across every trial */}
      <div className="section-head" style={{ margin: "36px 0 16px" }}>
        <span className="eyebrow">
          <Microscope size={13} /> Phenotyping
        </span>
        <p style={{ maxWidth: "62ch" }}>
          Latest measurements from every trial, including polyhouse and grow chamber trials. Open a
          facility for the full growth curves.
        </p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 380 }} />
      ) : rows.length === 0 ? (
        <div className="panel empty">
          <Microscope size={30} style={{ color: "var(--accent)" }} />
          <h3>No phenotyping data yet</h3>
          <p>Record observations from a facility's Phenotyping tab, or run the seed script.</p>
        </div>
      ) : (
        <>
          <div className="stack" style={{ gap: 12, marginBottom: 18 }}>
            <div className="chips" role="radiogroup" aria-label="Facility">
              <button
                role="radio"
                aria-checked={facility === "all"}
                className={`chip${facility === "all" ? " is-active" : ""}`}
                onClick={() => setFacility("all")}
              >
                All trials
              </button>
              {trialFacilities.map((f) => {
                const m = typeMeta(f.type);
                return (
                  <button
                    key={f.id}
                    role="radio"
                    aria-checked={facility === f.id}
                    className={`chip${facility === f.id ? " is-active" : ""}`}
                    onClick={() => setFacility(f.id)}
                  >
                    <m.icon size={13} /> {f.name}
                  </button>
                );
              })}
            </div>
            <div className="chips" role="radiogroup" aria-label="Trait">
              {TRAIT_KEYS.map((key) => (
                <button
                  key={key}
                  role="radio"
                  aria-checked={trait === key}
                  className={`chip chip-soft${trait === key ? " is-active" : ""}`}
                  onClick={() => setTrait(key)}
                >
                  {TRAITS[key].label}
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
                  <span className="faint">latest observation of each genotype</span>
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
                <span className="faint">latest values · open a facility for full growth curves</span>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Genotype</th>
                    <th>Facility</th>
                    <th>Stage</th>
                    {TRAIT_KEYS.map((k) => (
                      <th key={k} className={k === trait ? "th-active" : ""}>
                        {TRAITS[k].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const m = typeMeta(r.facilityType);
                    return (
                      <tr key={`${r.facility}-${r.genotype}`}>
                        <td style={{ fontFamily: "var(--font)", fontWeight: 600 }}>{r.genotype}</td>
                        <td style={{ fontFamily: "var(--font)" }}>
                          <Link to={`/facility/${r.facility}`} className="row link-quiet" style={{ gap: 6 }}>
                            <m.icon size={13} style={{ color: m.tone }} /> {r.facilityName}
                          </Link>
                        </td>
                        <td style={{ fontFamily: "var(--font)" }}>{r.growthStage || "--"}</td>
                        {TRAIT_KEYS.map((k) => (
                          <td key={k} className={k === trait ? "td-active" : ""}>
                            {formatTrait(k, r[k])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
