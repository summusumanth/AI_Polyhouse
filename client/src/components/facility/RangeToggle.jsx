import { motion } from "framer-motion";

const RANGES = [
  { hours: 24, label: "24 h" },
  { hours: 24 * 7, label: "7 days" },
];

export default function RangeToggle({ hours, setHours }) {
  return (
    <div className="tabs tabs-sm" role="tablist" aria-label="Chart range">
      {RANGES.map((r) => (
        <button
          key={r.hours}
          role="tab"
          aria-selected={hours === r.hours}
          className={`tab${hours === r.hours ? " tab-active" : ""}`}
          onClick={() => setHours(r.hours)}
        >
          {hours === r.hours && (
            <motion.span
              className="tab-pill"
              layoutId="range-pill"
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
            />
          )}
          <span className="tab-label">{r.label}</span>
        </button>
      ))}
    </div>
  );
}
