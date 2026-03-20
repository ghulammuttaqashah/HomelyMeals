import axiosInstance from "./axios";

/**
 * Create a complaint
 */
export const createComplaint = async (data) => {
  const response = await axiosInstance.post("/api/customer/complaints", data);
  return response.data;
};

/**
 * Get my complaints
 */
export const getMyComplaints = async () => {
  const response = await axiosInstance.get("/api/customer/complaints");
  return response.data;
};

/**
 * Get single complaint details
 */
export const getComplaintById = async (id) => {
  const response = await axiosInstance.get(`/api/customer/complaints/${id}`);
  return response.data;
};

/**
 * Get my warnings
 */
export const getMyWarnings = async () => {
  const response = await axiosInstance.get("/api/customer/complaints/my-warnings");
  return response.data;
};
