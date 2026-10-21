import { useState } from "react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "./Toast";
import { Spinner } from "./Spinner";
import PasswordField, { PasswordStrength, passwordStrength } from "./PasswordField";

/*
  One password form, used in two places:
  - from the account panel, by choice;
  - as a full-screen gate when the account still has the starting password
    an admin handed out (`forced`), where there is no way to skip it.

  The server does the real checking: it verifies the current password,
  rejects a new one shorter than six characters or identical to the old one,
  and only then stores a new hash.
*/
export default function ChangePassword({ forced = false, onDone }) {
  const { refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.current) next.current = "Enter your current password";
    if (form.next.length < 6) next.next = "At least 6 characters";
    else if (form.next === form.current) next.next = "Choose something different from your current password";
    if (form.confirm !== form.next) next.confirm = "The two passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await api.changePassword({ currentPassword: form.current, newPassword: form.next });
      // Only now, after the server confirmed it.
      toast.success("Password changed");
      setForm({ current: "", next: "", confirm: "" });
      await refresh();
      onDone?.();
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const strong = passwordStrength(form.next);

  return (
    <form className="stack" onSubmit={submit} noValidate>
      {forced && (
        <div className="notice notice-warn">
          <ShieldAlert size={18} />
          <div>
            <strong>Choose your own password</strong>
            <p>
              You signed in with a starting password set by an administrator. Pick a new one to
              continue.
            </p>
          </div>
        </div>
      )}

      <PasswordField
        id="cp-current"
        label="Current password"
        value={form.current}
        onChange={set("current")}
        autoComplete="current-password"
        error={errors.current}
      />

      <div>
        <PasswordField
          id="cp-next"
          label="New password"
          value={form.next}
          onChange={set("next")}
          autoComplete="new-password"
          minLength={6}
          hint="At least 6 characters. Longer is stronger than complicated."
          error={errors.next}
        />
        <PasswordStrength password={form.next} />
      </div>

      <PasswordField
        id="cp-confirm"
        label="Repeat new password"
        value={form.confirm}
        onChange={set("confirm")}
        autoComplete="new-password"
        minLength={6}
        error={errors.confirm}
      />

      {errors.form && (
        <div className="alert" role="alert">
          {errors.form}
        </div>
      )}

      <div className={forced ? "" : "modal-actions"}>
        {!forced && onDone && (
          <button type="button" className="btn btn-quiet" onClick={onDone}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          className={`btn btn-primary${forced ? " btn-block" : ""}`}
          disabled={busy || (strong && strong.level === 0)}
        >
          {busy ? <Spinner /> : <KeyRound size={16} />}
          {busy ? "Saving" : "Change password"}
        </button>
      </div>
    </form>
  );
}
