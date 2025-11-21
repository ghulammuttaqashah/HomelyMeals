import { createContext, useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // No auto-login because backend has no /customer/me route
  useEffect(() => {
    setLoading(false);
  }, []);

  // Login
  async function login(email, password) {
    const res = await axiosInstance.post("/customer/signin", {
      email,
      password,
    });

    // { message, customer }
    setUser(res.data.customer);
  }

  // Logout
  async function logout() {
    try {
      await axiosInstance.post("/customer/signout"); // cookie cleared
    } catch (err) {
      console.warn("Logout error ignored:", err);
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
