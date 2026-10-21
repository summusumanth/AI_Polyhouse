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
  );
}
