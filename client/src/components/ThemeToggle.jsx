<<<<<<< HEAD
import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

/*
  Theme control for the account panel: a labelled two-way choice rather than
  the icon button that used to sit in the header. The sliding pill is a
  shared layout animation, so the highlight moves between options instead of
  blinking from one to the other.
*/
const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-control">
      <span className="theme-control-label">
        <Monitor size={15} />
        Appearance
      </span>
      <div className="theme-choice" role="radiogroup" aria-label="Appearance">
        {OPTIONS.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`theme-option${active ? " is-active" : ""}`}
              onClick={() => setTheme(option.value)}
            >
              {active && (
                <motion.span
                  className="theme-option-pill"
                  layoutId="theme-pill"
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                />
              )}
              <span className="theme-option-text">
                <option.icon size={15} />
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
=======
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const Icon = theme === "light" ? Moon : Sun;

  return (
    <button
      className="btn btn-ghost btn-icon theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          style={{ display: "grid", placeItems: "center" }}
          initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <Icon size={17} />
        </motion.span>
      </AnimatePresence>
    </button>
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  );
}
