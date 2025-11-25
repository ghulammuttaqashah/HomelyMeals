import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cookSignIn, cookSignOut } from "../api/cook.api";

export const AuthContext = createContext();

const STORAGE_KEY = "cook";

// --- Verification helpers shared across cook flows ---
export const normalizeVerificationStatus = (status) => {
  if (!status) return "not_submitted";

  const normalized = String(status).toLowerCase();

  if (normalized === "not_started") return "not_submitted";
  if (normalized === "submitted") return "pending";
  if (normalized === "verified") return "approved";

  return normalized;
};

export const resolveCookRoute = (status) => {
  const normalized = normalizeVerificationStatus(status);
  return normalized === "approved" ? "/cook/dashboard" : "/cook/documents";
};

const readCachedCook = () => {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) return null;

  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

const enrichCookProfile = (cook) => {
  if (!cook) return null;
  const verificationStatusNormalized = normalizeVerificationStatus(
    cook.verificationStatus || cook.verificationStatusNormalized
  );

  return {
    ...cook,
    verificationStatusNormalized,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((cook) => {
    const enriched = enrichCookProfile(cook);

    if (enriched) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUser(enriched);
  }, []);

  const fetchSession = useCallback(async () => {
    const cached = readCachedCook();

    if (!cached) {
      persistUser(null);
      return null;
    }

    // Validate the cached session
    const enriched = enrichCookProfile(cached);
    persistUser(enriched);
    return enriched;
  }, [persistUser]);

  useEffect(() => {
    fetchSession()
      .catch(() => {
        console.log("No active cook session");
      })
      .finally(() => setLoading(false));
  }, [fetchSession]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await cookSignIn({ email, password });
      const profile = enrichCookProfile(data?.cook ?? null);
      persistUser(profile);
      return profile;
    },
    [persistUser]
  );

  const logout = useCallback(async () => {
    try {
      await cookSignOut();
    } catch (err) {
      console.warn("Cook logout warning:", err?.message || err);
    } finally {
      persistUser(null);
    }
  }, [persistUser]);

  const updateVerificationStatus = useCallback((nextStatus) => {
    setUser((prev) => {
      if (!prev) return prev;

      const merged = {
        ...prev,
        verificationStatus: nextStatus,
      };

      const enriched = enrichCookProfile(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));

      return enriched;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshSession: fetchSession,
      updateVerificationStatus,
      resolveCookRoute,
    }),
    [user, loading, login, logout, fetchSession, updateVerificationStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
