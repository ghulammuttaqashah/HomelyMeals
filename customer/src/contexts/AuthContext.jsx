import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  customerSignIn,
  customerSignOut,
  getCustomerProfile,
} from "../api/customer.api";

export const AuthContext = createContext();

const STORAGE_KEY = "homelyMeals.customer";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((customer) => {
    if (customer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUser(customer);
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      // Check if there's a cached user in localStorage
      const cached = localStorage.getItem(STORAGE_KEY);
      if (!cached) {
        persistUser(null);
        return null;
      }
      
      // Validate the cached user
      const { data } = await getCustomerProfile();
      const profile = data?.customer ?? data;
      
      if (profile) {
        persistUser(profile);
        return profile;
      } else {
        // Invalid session, clear it
        persistUser(null);
        return null;
      }
    } catch (error) {
      // Any error means invalid session
      persistUser(null);
      throw error;
    }
  }, [persistUser]);

  useEffect(() => {
    fetchSession()
      .catch((error) => {
        // Silently handle errors - user will just not be logged in
        console.log("No active session");
      })
      .finally(() => setLoading(false));
  }, [fetchSession]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await customerSignIn({ email, password });
      const profile = data?.customer ?? null;
      persistUser(profile);
      return profile;
    },
    [persistUser]
  );

  const logout = useCallback(async () => {
    try {
      await customerSignOut();
    } catch (err) {
      console.warn("Customer logout warning:", err?.message || err);
    } finally {
      persistUser(null);
    }
  }, [persistUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshSession: fetchSession,
    }),
    [user, loading, login, logout, fetchSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
