import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

// Counts up to the value whenever it changes, so refreshes feel live.
function AnimatedNumber({ value, digits = 1 }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 });
  const text = useTransform(spring, (latest) =>
    Number.isFinite(latest) ? latest.toFixed(digits) : "--"
  );

  useEffect(() => {
    motionValue.set(Number.isFinite(Number(value)) ? Number(value) : 0);
  }, [value, motionValue]);

  if (value === null || value === undefined || !Number.isFinite(Number(value))) return <>--</>;
  return <motion.span>{text}</motion.span>;
}

export default function MetricTile({
  icon: Icon,
  label,
  value,
  unit,
  tone = "var(--accent)",
  max = 100,
  target,
  targetLabel = "target",
  note,
  digits = 1,
  delay = 0,
}) {
  const numeric = Number(value);
  const percent = Number.isFinite(numeric) ? Math.min(100, Math.max(0, (numeric / max) * 100)) : 0;

  return (
    <motion.div
      className="panel panel-hover metric"
      style={{ "--tone": tone }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="metric-top">
        <span className="metric-icon">
          <Icon size={18} />
        </span>
        {target !== undefined && target !== null && (
          <span className="pill">
            {targetLabel} {target}
          </span>
        )}
      </div>

      <div className="metric-value">
        <AnimatedNumber value={value} digits={digits} />
        {unit && <small>{unit}</small>}
      </div>
      <div className="metric-label">{label}</div>
      {note && <div className="metric-note faint">{note}</div>}

      <div className="meter">
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.9, delay: delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}
