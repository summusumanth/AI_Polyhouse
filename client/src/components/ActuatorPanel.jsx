import { motion } from "framer-motion";
import { CloudFog, Droplets, Fan, Snowflake } from "lucide-react";

const ICONS = {
  fan: Fan,
  cooler: Snowflake,
  mister: CloudFog,
  irrigation: Droplets,
};

// Shows the decision the server sends to the relay board, with the
// comparison behind each one. The dashboard no longer works this out on its
// own, so it cannot drift from what the hardware does.
export default function ActuatorPanel({ actuators, message }) {
  if (!actuators) {
    // The server sends every relay "off" in this state; say why.
    return (
      <div className="relays-off">
        <strong>All relays off</strong>
        <span className="faint">{message || "Set targets and wait for a reading to see relay state."}</span>
      </div>
    );
  }

  return (
    <div className="actuators">
      {actuators.map((a, index) => {
        const Icon = ICONS[a.key] || Fan;
        return (
          <motion.div
            key={a.key}
            className={`actuator${a.on ? " actuator-on" : ""}`}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
          >
            <span className="actuator-name">
              <motion.span
                className="actuator-icon"
                animate={a.on && a.key === "fan" ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  a.on && a.key === "fan"
                    ? { repeat: Infinity, duration: 1.4, ease: "linear" }
                    : { duration: 0.3 }
                }
              >
                <Icon size={17} />
              </motion.span>
              <span>
                {a.label}
                <br />
                <span className="faint mono">{a.reason}</span>
              </span>
            </span>
            <span className={`pill ${a.on ? "pill-on" : "pill-off"}`}>
              <span className={`dot${a.on ? " dot-live" : ""}`} />
              {a.on ? "Running" : "Idle"}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
