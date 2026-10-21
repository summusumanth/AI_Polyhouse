import { motion } from "framer-motion";
import { Fan } from "lucide-react";
import { EQUIPMENT } from "../lib/facility";

// Shows the decision the server sends to the relay board, with the
// comparison behind each one. The dashboard never works this out on its
// own, so it cannot drift from what the hardware does.
//
// `equipment` lists every fitted relay, so one that cannot be decided yet
// (no sensor, no target) still shows, as "no data".
export default function ActuatorPanel({ actuators, equipment = [], message }) {
  if (!actuators) {
    // The server sends every relay "off" in this state; say why.
    return (
      <div className="relays-off">
        <strong>All relays off</strong>
        <span className="faint">{message || "Set targets and wait for a reading to see relay state."}</span>
      </div>
    );
  }

  const decided = Object.fromEntries(actuators.map((a) => [a.key, a]));
  const rows = equipment.length ? equipment.map((e) => decided[e.key] || { ...e, idle: true }) : actuators;

  return (
    <div className="actuators">
      {rows.map((a, index) => {
        const Icon = EQUIPMENT[a.key]?.icon || Fan;
        const spin = a.on && a.key === "fan";
        const state = a.idle ? "no data" : a.on ? "Running" : a.held ? "Held off" : "Idle";
        return (
          <motion.div
            key={a.key}
            className={`actuator${a.on ? " actuator-on" : ""}${a.held ? " actuator-held" : ""}`}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4) }}
          >
            <span className="actuator-name">
              <motion.span
                className="actuator-icon"
                animate={spin ? { rotate: 360 } : { rotate: 0 }}
                transition={spin ? { repeat: Infinity, duration: 1.4, ease: "linear" } : { duration: 0.3 }}
              >
                <Icon size={17} />
              </motion.span>
              <span>
                {a.label || EQUIPMENT[a.key]?.label}
                <br />
                <span className="faint mono">{a.idle ? "needs its sensor and target" : a.reason}</span>
              </span>
            </span>
            <span className={`pill ${a.on ? "pill-on" : a.held ? "pill-warn" : "pill-off"}`}>
              <span className={`dot${a.on ? " dot-live" : ""}`} />
              {state}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
