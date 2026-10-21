import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowRight, MapPin, TriangleAlert, Video, Zap } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePolling } from "../lib/usePolling";
import { isAdmin } from "../lib/roles";
import { timeAgo } from "../lib/format";
import { CHANNELS, EQUIPMENT, SPEED_BREEDING_SENSORS, cycleProgress, formatChannel } from "../lib/facility";
import { useToast } from "../components/Toast";
import { SpeedBreedingArt } from "../components/art/FacilityArt";
import { GenerationTracker, PhotoperiodRing } from "../components/SpeedBreedingPanel";
import CameraView, { useCameras } from "../components/CameraView";
import { CountUp } from "../components/ui";

// The schedule the dial needs, from what the facility list carries.
function scheduleOf(room) {
  const hours = room.photoperiod?.lightHours;
  if (hours === undefined || hours === null) return null;
  return { lightHours: hours, lightsOnAt: room.photoperiod.lightsOnAt, lightsOn: room.lightsOn };
}

function RoomCamera({ room }) {
  const { cameras } = useCameras(room._id, true);
  if (!cameras?.length) return null;
  return (
    <div className="room-camera">
      <CameraView info={cameras[0]} compact />
    </div>
  );
}

function RoomCard({ room, index }) {
  const cycle = cycleProgress(room.program);
  const schedule = scheduleOf(room);
  const latest = room.latest;
  const running = Object.entries(room.actuators || {}).filter(([, on]) => on).map(([k]) => k);

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
          <div className="facility-sub">{[room.crop, room.variety].filter(Boolean).join(" · ") || "No crop set"}</div>
          <span className="row faint" style={{ gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            {room.location && (
              <span className="row" style={{ gap: 5 }}>
                <MapPin size={12} /> {room.location}
              </span>
            )}
            <span className="row" style={{ gap: 6 }}>
              <span className={`dot${room.online ? " dot-live" : ""}`} />
              {latest ? `updated ${timeAgo(latest.date)}` : "no readings yet"}
            </span>
            {room.alertCount > 0 && (
              <span className="row" style={{ gap: 5, color: "var(--amber)" }}>
                <TriangleAlert size={12} /> {room.alertCount} {room.alertCount === 1 ? "alert" : "alerts"}
              </span>
            )}
          </span>
        </div>
        <Link to={`/facility/${room._id}`} className="btn btn-ghost btn-sm">
          Open <ArrowRight size={15} />
        </Link>
      </div>

      <div className={`room-body${room.cameras?.room ? " room-body-camera" : ""}`}>
        {room.cameras?.room && <RoomCamera room={room} />}
        {schedule ? <PhotoperiodRing schedule={schedule} /> : <span className="faint">No photoperiod set.</span>}
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          {cycle && room.program?.totalGenerations ? (
            <GenerationTracker program={room.program} />
          ) : (
            <span className="faint">Set the generation programme on the facility to track cycles.</span>
          )}
        </div>
      </div>

      <div className="sensor-strip">
        {SPEED_BREEDING_SENSORS.filter((s) => CHANNELS[s.key]).map((s) => {
          const c = CHANNELS[s.key];
          const value = latest?.[s.key];
          return (
            <div key={s.key} className={`sensor-chip${value === undefined || value === null ? " is-missing" : ""}`} title={s.why}>
              <c.icon size={13} style={{ color: c.tone }} />
              <span className="faint">{c.label}</span>
              <strong className="mono">
                {formatChannel(s.key, value)}
                <small> {c.unit}</small>
              </strong>
            </div>
          );
        })}
      </div>

      <div className="room-lines">
        {room.actuators ? (
          <span className="row" style={{ gap: 8 }}>
            <Activity size={15} style={{ color: "var(--violet)" }} />
            <strong>{running.length}</strong>
            <span className="muted">{running.length === 1 ? "relay running" : "relays running"}</span>
          </span>
        ) : (
          <span className="row faint" style={{ gap: 8 }}>
            <Activity size={15} />
            {room.latest
              ? "Sensor node silent for over 5 minutes: all relays held off"
              : "No targets or readings yet: all relays off"}
          </span>
        )}
        {running.length > 0 && (
          <span className="running-list">
            {running.map((k) => {
              const E = EQUIPMENT[k];
              return (
                <span key={k} className="pill pill-on">
                  {E && <E.icon size={12} />} {E?.label || k}
                </span>
              );
            })}
          </span>
        )}
      </div>
    </motion.article>
  );
}

export default function SpeedBreeding() {
  const { user } = useAuth();
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.listFacilities();
      setRooms(res.data.filter((f) => f.type === "speed_breeding"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  usePolling(load, 20000, [load]);

  const generationsPerYear = rooms.reduce((best, r) => Math.max(best, cycleProgress(r.program)?.generationsPerYear || 0), 0);
  const relays = rooms.reduce((n, r) => n + (r.activeActuators || 0), 0);
  const alerts = rooms.reduce((n, r) => n + (r.alertCount || 0), 0);
  const cameras = rooms.filter((r) => r.cameras?.room).length;

  return (
    <div className="wrap" style={{ paddingTop: 36 }}>
      <section className="pheno-hero panel">
        <motion.div className="pheno-hero-copy" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}>
          <span className="eyebrow">
            <Zap size={14} /> Speed breeding
          </span>
          <h1 className="section-title">Fixed targets, long days, more generations a year</h1>
          <p>
            Each room is held to fixed targets for temperature, humidity, CO₂, light and soil moisture, and the grow
            lights follow its photoperiod. Ten sensors report every 30 seconds and the server switches fans, heating,
            vents, humidifier, dehumidifier, irrigation, CO₂, lights and shade to match.
          </p>
        </motion.div>
        <motion.div className="pheno-hero-art" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
          <SpeedBreedingArt />
        </motion.div>
      </section>

      <div className="grid kpis" style={{ margin: "22px 0" }}>
        {[
          { icon: Zap, label: "Speed breeding rooms", value: rooms.length, tone: "var(--violet)" },
          { icon: Zap, label: "Generations a year", value: generationsPerYear, tone: "var(--accent)" },
          { icon: Activity, label: "Relays running", value: relays, tone: "var(--amber)" },
          alerts > 0
            ? { icon: TriangleAlert, label: "Alerts", value: alerts, tone: "var(--rose)" }
            : { icon: Video, label: "Rooms with a camera", value: cameras, tone: "var(--cyan)" },
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

      {loading ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : rooms.length === 0 ? (
        <div className="panel empty">
          <Zap size={28} style={{ color: "var(--violet)" }} />
          <h3>No speed breeding rooms yet</h3>
          <p style={{ maxWidth: "46ch" }}>
            {isAdmin(user)
              ? "Create a facility of type Speed breeding in the Control room. Give it a photoperiod, fixed targets and the room camera's URL."
              : "An administrator needs to add a speed breeding room first, or give you access to one."}
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 18 }}>
          {rooms.map((room, i) => (
            <RoomCard key={room._id} room={room} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
