// cook/src/api/cook.api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/cooks/auth", // <-- matches backend mounting: /api/cooks -> router.use("/auth", ...)
  withCredentials: true,
});

// Step 1 — Request OTP
export const cookSignupRequest = (data) => API.post("/signup/request", data);

// Step 2 — Verify OTP (backend expects { email, otpCode })
export const cookVerifyOtp = (data) => API.post("/signup/verify", data);

// Step 3 — Sign In
export const cookSignIn = (data) => API.post("/signin", data);

// Sign Out
export const cookSignOut = () => API.post("/signout");