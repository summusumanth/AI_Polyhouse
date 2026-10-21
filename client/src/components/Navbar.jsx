import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
<<<<<<< HEAD
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { isAdmin, roleLine } from "../lib/roles";
import { BrandMark, BrandWordmark } from "./Brand";
import Modal from "./Modal";
import ChangePassword from "./ChangePassword";
import ThemeToggle from "./ThemeToggle";
=======
import { Leaf, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { isAdmin, roleLine } from "../lib/roles";
import ThemeToggle from "./ThemeToggle";
import Modal from "./Modal";
import ChangePassword from "./ChangePassword";
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

function linksFor(user) {
  if (!user) {
    return [
      { to: "/", label: "Overview" },
      { to: "/login", label: "Sign in" },
    ];
  }
  return [
    { to: "/dashboard", label: "Control room" },
<<<<<<< HEAD
    { to: "/speed-breeding", label: "Speed breeding" },
    { to: "/phenotyping", label: "Phenotyping" },
=======
    { to: "/breeding", label: "Speed breeding & Phenotyping" },
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    ...(isAdmin(user) ? [{ to: "/team", label: "Team" }] : []),
    { to: "/", label: "Overview" },
  ];
}

// The account panel: who you are, and the password form.
function AccountModal({ open, onClose, user }) {
  return (
    <Modal open={open} title="Your account" onClose={onClose}>
      <div className="account-head">
        <span className="avatar avatar-lg">{user?.name?.slice(0, 2).toUpperCase()}</span>
        <div>
          <strong>{user?.name}</strong>
          <div className="faint">{user?.email}</div>
          <div className="faint">{roleLine(user)}</div>
        </div>
      </div>
<<<<<<< HEAD
      <div style={{ marginTop: 18 }}>
        <ThemeToggle />
      </div>

      <h3 className="panel-subtitle" style={{ margin: "20px 0 0" }}>
=======
      <h3 className="panel-subtitle" style={{ margin: "18px 0 0" }}>
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
        Change password
      </h3>
      <div style={{ marginTop: 10 }}>
        <ChangePassword onDone={onClose} />
      </div>
    </Modal>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const links = linksFor(user);
  const initials = user?.name?.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/login");
  };

  return (
    <header className="nav">
      <div className="wrap">
        <div className="nav-inner">
<<<<<<< HEAD
          <Link to={user ? "/dashboard" : "/"} className="brand" aria-label="Polyhouse, AI-powered smart agriculture">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              style={{ display: "grid" }}
            >
              <BrandMark size={38} />
            </motion.span>
            <span className="brand-text">
              <BrandWordmark />
              <span className="brand-tagline">AI-Powered Smart Agriculture</span>
            </span>
          </Link>

          <nav className="nav-links nav-desktop">
=======
          <Link to={user ? "/dashboard" : "/"} className="brand">
            <motion.span
              className="brand-mark"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <Leaf size={19} />
            </motion.span>
            Polyhouse
          </Link>

          <nav className="nav-links nav-desktop">
            <ThemeToggle />
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
              >
                {link.label}
              </NavLink>
            ))}

            {user && (
              <div className="nav-user">
                <button className="nav-account" onClick={() => setAccountOpen(true)} title="Your account and password">
                  <span className="avatar">{initials}</span>
                  <span className="nav-account-text">
                    <span>{user.name}</span>
                    <span className="faint">{roleLine(user)}</span>
                  </span>
                </button>
                <button className="btn btn-quiet btn-sm" onClick={handleLogout}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </nav>

          <div className="row nav-mobile-actions" style={{ gap: 8 }}>
<<<<<<< HEAD
=======
            <ThemeToggle />
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
            <button
              className="nav-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={open}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              className="nav-drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {user && (
                <button
                  className="nav-account"
                  onClick={() => {
                    setOpen(false);
                    setAccountOpen(true);
                  }}
                >
                  <span className="avatar">{initials}</span>
                  <span className="nav-account-text">
                    <span>{user.name}</span>
                    <span className="faint">{roleLine(user)}</span>
                  </span>
                </button>
              )}
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
                >
                  {link.label}
                </NavLink>
              ))}
              {user && (
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  <LogOut size={15} /> Sign out
                </button>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} user={user} />
    </header>
  );
}
