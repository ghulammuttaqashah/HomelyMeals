// customer/src/api/cook.api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/cooks",
  withCredentials: true,
});

export const cookSignupRequest = (payload) =>
  API.post("/auth/signup/request", payload);

export const cookVerifyOtp = (payload) =>
  API.post("/auth/signup/verify", payload);

export const cookSignIn = (payload) =>
  API.post("/auth/signin", payload);
