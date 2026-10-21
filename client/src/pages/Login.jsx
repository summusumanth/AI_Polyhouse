import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
<<<<<<< HEAD
import { ArrowRight, CircleAlert } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Spinner } from "../components/Spinner";
import { BrandLockup } from "../components/Brand";
=======
import { ArrowRight, CircleAlert, Leaf } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Spinner } from "../components/Spinner";
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap auth">
      <motion.div
        className="panel auth-card"
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
<<<<<<< HEAD
        <BrandLockup markSize={68} />
        <h1 style={{ fontSize: "1.6rem", marginTop: 18 }}>Welcome back</h1>
=======
        <span className="brand-mark" style={{ marginBottom: 18 }}>
          <Leaf size={19} />
        </span>
        <h1 style={{ fontSize: "1.6rem" }}>Welcome back</h1>
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
        <p style={{ marginTop: 8, fontSize: "0.92rem" }}>
          Sign in to reach your polyhouse control room.
        </p>

        <form className="stack" style={{ marginTop: 24 }} onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={change("email")}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={form.password}
              onChange={change("password")}
              required
            />
          </div>

          {error && (
            <motion.div
              className="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CircleAlert size={16} />
              {error}
            </motion.div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? <Spinner /> : <ArrowRight size={17} />}
            {busy ? "Signing in" : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          No account? Ask your area admin to create one for you.
        </div>
      </motion.div>
    </div>
  );
}
