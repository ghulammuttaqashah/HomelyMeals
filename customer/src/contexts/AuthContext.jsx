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
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  });
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
      const { data } = await getCustomerProfile();
      const profile = data?.customer ?? data;
      persistUser(profile);
      return profile;
    } catch (error) {
      if (error?.response?.status === 401) {
        persistUser(null);
      }
      throw error;
    }
  }, [persistUser]);

  useEffect(() => {
    fetchSession()
      .catch((error) => {
        if (error?.response?.status !== 401) {
          console.warn("Customer session check failed:", error?.message || error);
        }
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
