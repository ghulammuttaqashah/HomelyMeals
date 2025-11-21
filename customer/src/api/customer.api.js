import axiosInstance from "./axiosInstance";

export const customerSignIn = (data) =>
  axiosInstance.post("/customer/signin", data);

export const customerSignOut = () =>
  axiosInstance.post("/customer/signout");

export const requestSignupOtp = (data) =>
  axiosInstance.post("/customer/signup/request", data);

export const verifySignupOtp = (data) =>
  axiosInstance.post("/customer/signup/verify", data);

export const getCustomerProfile = () =>
  axiosInstance.get("/customer/me"); // protected — backend should verify cookie
