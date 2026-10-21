import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore, UNAUTHORIZED_EVENT } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session on first paint if a token is already stored.
  useEffect(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  // Any request that comes back 401 signs the whole app out, so the UI never
  // shows a signed-in screen whose every request is failing.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await api.login(credentials);
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  // Re-reads the signed-in user, e.g. after changing a password clears
  // mustChangePassword.
  const refresh = useCallback(async () => {
    try {
      const res = await api.me();
      setUser(res.user);
      return res.user;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout, refresh }),
    [user, ready, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
