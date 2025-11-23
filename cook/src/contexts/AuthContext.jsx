import { createContext, useState, useContext } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // IMPORTANT: must be named "user" so ProtectedRoute can read it
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const res = await fetch("http://localhost:5000/api/cooks/auth/signin", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      setUser(data.cook);     // store logged-in cook here
      return { ok: true, cook: data.cook };
    }

    return { ok: false, message: data.message };
  };

  const logout = () => {
    setUser(null);
  };

  const refreshUser = (updated) => setUser(updated);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
