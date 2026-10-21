import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { cycleProgress } from "../lib/facility";

const R = 52;
const C = 2 * Math.PI * R;

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};

// A 24-hour dial: the lit arc is the photoperiod, the needle is now.
// `schedule` is the server's view (lightsOnAt, minutesNow, lightsOn), so the
// dial agrees with what the grow lights are actually doing. Without it, the
// dial assumes the dark period ends at midnight, as the server does.
export function PhotoperiodRing({ lightHours = 22, schedule = null }) {
  const hours = schedule?.lightHours ?? lightHours;
  const darkHours = 24 - hours;
  const onAt = schedule?.lightsOnAt ?? `${String(Math.floor(darkHours)).padStart(2, "0")}:${String(Math.round((darkHours % 1) * 60)).padStart(2, "0")}`;
  const now = new Date();
  const nowMin = schedule?.minutesNow ?? now.getHours() * 60 + now.getMinutes();
  const hour = nowMin / 60;
  const start = toMinutes(onAt);
  const lightsOn = schedule ? schedule.lightsOn : (nowMin - start + 1440) % 1440 < hours * 60;
  const lit = (hours / 24) * C;
  const startDeg = (start / 1440) * 360 - 90;
  const offAt = schedule?.lightsOffAt;

  return (
    <div className="photoperiod">
      <svg viewBox="0 0 140 140" className="photoperiod-svg" role="img" aria-label={`${hours} hours light from ${onAt}, ${darkHours} hours dark`}>
        <circle cx="70" cy="70" r={R} fill="none" className="photoperiod-track" strokeWidth="12" />
        <motion.circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          className="photoperiod-lit"
          strokeWidth="12"
          strokeLinecap="round"
          transform={`rotate(${startDeg} 70 70)`}
          initial={{ strokeDasharray: `0 ${C}` }}
          animate={{ strokeDasharray: `${lit} ${C}` }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        {[0, 6, 12, 18].map((h) => {
          const a = (h / 24) * 2 * Math.PI - Math.PI / 2;
          return (
            <text key={h} x={70 + Math.cos(a) * 34} y={70 + Math.sin(a) * 34 + 3} textAnchor="middle" className="photoperiod-hour">
              {String(h).padStart(2, "0")}
            </text>
          );
        })}
        <g transform="translate(70 70)">
          {/* Framer Motion rotates SVG around the element's bounding box.
              The invisible circle makes that box centred on the hub. */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: (hour / 24) * 360 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <circle r="48" fill="none" stroke="none" />
            <line x1="0" y1="0" x2="0" y2="-48" className="photoperiod-needle" strokeWidth="2.4" strokeLinecap="round" />
            <circle r="4" className="photoperiod-hub" />
          </motion.g>
        </g>
      </svg>
      <div className="photoperiod-meta">
        <span className={`pill ${lightsOn ? "pill-on" : ""}`}>
          {lightsOn ? <Sun size={13} /> : <Moon size={13} />}
          {lightsOn ? "Lights on" : "Dark period"}
        </span>
        <strong className="mono" style={{ fontSize: "1.4rem" }}>
          {hours}/{darkHours}
        </strong>
        <span className="faint">hours light / dark</span>
        <span className="faint mono" style={{ fontSize: "0.78rem" }}>
          on {onAt}
          {offAt ? ` · off ${offAt}` : ""}
        </span>
      </div>
    </div>
  );
}

export function GenerationTracker({ program }) {
  const progress = cycleProgress(program);
  if (!progress || !program.totalGenerations) return null;
  const generations = Array.from({ length: program.totalGenerations }, (_, i) => i + 1);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="generations">
        {generations.map((g) => {
          const state = g < program.generation ? "done" : g === program.generation ? "current" : "next";
          return (
            <motion.div
              key={g}
              className={`generation generation-${state}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: g * 0.07, type: "spring", stiffness: 260, damping: 18 }}
            >
              G{g}
            </motion.div>
          );
        })}
      </div>

      <div>
        <div className="row-between" style={{ marginBottom: 6 }}>
          <span className="faint">
            Generation {program.generation}: day {progress.day} of {program.cycleDays}
          </span>
          <span className="faint">{progress.daysLeft} days to harvest</span>
        </div>
        <div className="meter" style={{ "--tone": "var(--violet)", marginTop: 0 }}>
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${progress.pct}%` }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="compare">
        <div className="compare-row">
          <span className="faint">Speed breeding</span>
          <div className="compare-bar">
            <motion.span
              style={{ background: "var(--violet)" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (progress.generationsPerYear / 6) * 100)}%` }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </div>
          <strong className="mono">{progress.generationsPerYear}/yr</strong>
        </div>
        <div className="compare-row">
          <span className="faint">Field season</span>
          <div className="compare-bar">
            <motion.span
              style={{ background: "var(--text-faint)" }}
              initial={{ width: 0 }}
              animate={{ width: `${(1.5 / 6) * 100}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
          <strong className="mono">1–2/yr</strong>
        </div>
      </div>
    </div>
  );
}
