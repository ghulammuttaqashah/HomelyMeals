// src/contexts/AuthContext.jsx
import React, { createContext, useEffect, useState } from "react";
import axios from "axios";

import { getCookie, setCookie, removeCookie } from "../utils/cookies";


export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Check login status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getCookie("token");
      if (token) {
        try {
          const res = await axios.get("/api/customer/me", { withCredentials: true });
          setUser(res.data.customer || res.data); // make sure structure matches backend
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // ✅ Login function
  const login = async (formData) => {
    const res = await axios.post("/api/customer/signin", formData, { withCredentials: true });
    setUser(res.data.customer);
    // token is HttpOnly — backend sets it; frontend can just note existence
    setCookie("token", "present"); 
  };

  // ✅ Logout function
  const logout = async () => {
    await axios.post("/api/customer/signout", {}, { withCredentials: true });
    setUser(null);
    removeCookie("token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
