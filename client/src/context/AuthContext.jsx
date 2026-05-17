import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import { clearStoredSession, getStoredToken, getStoredUser, migrateStoredSession, saveStoredSession } from "../utils/authStorage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    const migrated = migrateStoredSession();
    if (migrated.user) setUser(migrated.user);
    if (!migrated.token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  function saveSession(data) {
    saveStoredSession(data);
    setUser(data.user);
  }

  function logout() {
    clearStoredSession();
    sessionStorage.removeItem("pbs_cart");
    localStorage.removeItem("pbs_cart");
    setUser(null);
  }

  const isAuthenticated = Boolean(user || getStoredToken());
  const value = useMemo(() => ({ user, loading, setLoading, saveSession, logout, isAuthenticated, isAdmin: user?.role === "admin" }), [user, loading, isAuthenticated]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
