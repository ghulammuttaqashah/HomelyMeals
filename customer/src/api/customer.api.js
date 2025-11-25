import axiosInstance from "./axiosInstance";

export const customerSignIn = (data) =>
  axiosInstance.post("/customer/signin", data);

export const customerSignOut = () =>
  axiosInstance.post("/customer/signout");

export const requestSignupOtp = (data) =>
  axiosInstance.post("/customer/signup/request", data);

export const verifySignupOtp = (data) =>
  axiosInstance.post("/customer/signup/verify", data);

export const resendSignupOtp = (data) =>
  axiosInstance.post("/customer/signup/resend", data);

// Note: /customer/me endpoint doesn't exist in backend
// User data is stored in localStorage after login
export const getCustomerProfile = () => {
  // Return cached user from localStorage instead of API call
  const cached = localStorage.getItem("homelyMeals.customer");
  return Promise.resolve({ data: { customer: cached ? JSON.parse(cached) : null } });
};

// Get all meals from database (protected route)
export const getAllMeals = () =>
  axiosInstance.get("/customer/meals");
