import axiosInstance from "./axios";

/**
 * Create a complaint
 */
export const createComplaint = async (data) => {
  const response = await axiosInstance.post("/api/cook/complaints", data);
  return response.data;
};

/**
 * Get my complaints
 */
export const getMyComplaints = async () => {
  const response = await axiosInstance.get("/api/cook/complaints");
  return response.data;
};

/**
 * Get complaints against me
 */
export const getComplaintsAgainstMe = async () => {
  const response = await axiosInstance.get("/api/cook/complaints/against-me");
  return response.data;
};

/**
 * Get single complaint details
 */
export const getComplaintById = async (id) => {
  const response = await axiosInstance.get(`/api/cook/complaints/${id}`);
  return response.data;
};

/**
 * Get my warnings
 */
export const getMyWarnings = async () => {
  const response = await axiosInstance.get("/api/cook/complaints/my-warnings");
  return response.data;
};
