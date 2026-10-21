import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { PageLoader } from "./components/Spinner";
import ChangePassword from "./components/ChangePassword";
import { Leaf } from "lucide-react";
import { useAuth } from "./lib/auth";
import { isAdmin } from "./lib/roles";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
// Signed-in pages load on demand, so the landing and sign-in pages do not
// download the charting library before anyone has signed in.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const FacilityDetail = lazy(() => import("./pages/FacilityDetail"));
const Breeding = lazy(() => import("./pages/Breeding"));
const Team = lazy(() => import("./pages/Team"));

// Old /polyhouse/:id links (bookmarks, earlier builds) still land correctly.
function LegacyFacilityRedirect() {
  const { id } = useParams();
  return <Navigate to={`/facility/${id}`} replace />;
}

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <PageLoader label="Checking your session" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // A password someone else chose has to be replaced before anything else.
  if (user.mustChangePassword) return <ForcePasswordChange />;
  return children;
}

function ForcePasswordChange() {
  return (
    <div className="wrap auth">
      <div className="panel auth-card">
        <span className="brand-mark" style={{ marginBottom: 18 }}>
          <Leaf size={19} />
        </span>
        <h1 style={{ fontSize: "1.5rem" }}>Set your password</h1>
        <p style={{ marginTop: 8, fontSize: "0.92rem" }}>
          This takes a moment and only happens once.
        </p>
        <div style={{ marginTop: 20 }}>
          <ChangePassword forced />
        </div>
      </div>
    </div>
  );
}

// Team management is for super admins and area admins.
function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!isAdmin(user)) return <Navigate to="/dashboard" replace />;
  return children;
}

function RedirectIfSignedIn({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader label="Checking your session" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// New pages fade in, but never wait for the old page to fade out first:
// waiting for an exit animation delayed every click by about a third of a
// second before the next page could even start loading.
function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="shell">
      <Navbar />
      <main>
        <Suspense fallback={<PageLoader label="Loading" />}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <Page>
                  <Landing />
                </Page>
              }
            />
            <Route
              path="/login"
              element={
                <RedirectIfSignedIn>
                  <Page>
                    <Login />
                  </Page>
                </RedirectIfSignedIn>
              }
            />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Page>
                    <Dashboard />
                  </Page>
                </RequireAuth>
              }
            />
            <Route
              path="/facility/:id"
              element={
                <RequireAuth>
                  <Page>
                    <FacilityDetail />
                  </Page>
                </RequireAuth>
              }
            />
            <Route
              path="/breeding"
              element={
                <RequireAuth>
                  <Page>
                    <Breeding />
                  </Page>
                </RequireAuth>
              }
            />
            <Route path="/phenotyping" element={<Navigate to="/breeding" replace />} />
            <Route
              path="/team"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <Page>
                      <Team />
                    </Page>
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route path="/polyhouse/:id" element={<LegacyFacilityRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
