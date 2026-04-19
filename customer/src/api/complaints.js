import axiosInstance from "./axios";

export const createComplaint = async (data) => {
  const response = await axiosInstance.post("/api/customer/complaints", data);
  return response.data;
};

export const getMyComplaints = async (page = 1) => {
  const response = await axiosInstance.get("/api/customer/complaints", { params: { page, limit: 8 } });
  return response.data;
};

export const getComplaintById = async (id) => {
  const response = await axiosInstance.get(`/api/customer/complaints/${id}`);
  return response.data;
};

export const getMyWarnings = async () => {
  const response = await axiosInstance.get("/api/customer/complaints/my-warnings");
  return response.data;
};

export const getComplaintsAgainstMe = async (page = 1) => {
  const response = await axiosInstance.get("/api/customer/complaints/against-me", { params: { page, limit: 8 } });
  return response.data;
};

export const submitComplaintReply = async (id, data) => {
  const response = await axiosInstance.post(`/api/customer/complaints/${id}/reply`, data);
  return response.data;
};
