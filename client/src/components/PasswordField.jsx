import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/*
  A password input that can be made readable.

  Deliberate details, because this is the screen that was unreadable:
  - The toggle is a real button inside the field, reachable by keyboard and
    labelled for screen readers, not an icon glued on with absolute position
    that overlaps the text.
  - The input reserves room on the right so typed text never runs underneath
    the toggle.
  - `.input-password` in team.css pins the text colour for Chrome's autofill,
    which otherwise paints its own background and can leave text invisible.
*/
export default function PasswordField({
  id,
  label,
  hint,
  value,
  onChange,
  autoComplete = "current-password",
  minLength,
  required = true,
  error,
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const fieldId = id || generatedId;
  const describedBy = [hint && `${fieldId}-hint`, error && `${fieldId}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="password-wrap">
        <input
          id={fieldId}
          className={`input input-password${error ? " input-error" : ""}`}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy || undefined}
          spellCheck="false"
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          title={visible ? "Hide" : "Show"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && !error && (
        <span className="faint" id={`${fieldId}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${fieldId}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// Rough strength guidance, shown while typing. It mirrors the server's only
// hard rule (at least 6 characters) and otherwise just encourages length.
export function passwordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (password.length < 6) return { level: 0, label: "Too short", tone: "var(--rose)" };
  if (score <= 1) return { level: 1, label: "Weak", tone: "var(--rose)" };
  if (score <= 3) return { level: 2, label: "Fair", tone: "var(--amber)" };
  return { level: 3, label: "Strong", tone: "var(--accent)" };
}

export function PasswordStrength({ password }) {
  const strength = passwordStrength(password);
  if (!strength) return null;
  return (
    <div className="strength" aria-live="polite">
      <div className="strength-bars">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="strength-bar"
            style={{ background: i <= strength.level ? strength.tone : "var(--track)" }}
          />
        ))}
      </div>
      <span className="faint" style={{ color: strength.tone }}>
        {strength.label}
      </span>
    </div>
  );
}
