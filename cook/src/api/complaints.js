import axiosInstance from "./axios";

export const createComplaint = async (data) => {
  const response = await axiosInstance.post("/api/cook/complaints", data);
  return response.data;
};

export const getMyComplaints = async (page = 1) => {
  const response = await axiosInstance.get("/api/cook/complaints", { params: { page, limit: 8 } });
  return response.data;
};

export const getComplaintsAgainstMe = async (page = 1) => {
  const response = await axiosInstance.get("/api/cook/complaints/against-me", { params: { page, limit: 8 } });
  return response.data;
};

export const getComplaintById = async (id) => {
  const response = await axiosInstance.get(`/api/cook/complaints/${id}`);
  return response.data;
};

export const getMyWarnings = async () => {
  const response = await axiosInstance.get("/api/cook/complaints/my-warnings");
  return response.data;
};

export const submitComplaintReply = async (id, data) => {
  const response = await axiosInstance.post(`/api/cook/complaints/${id}/reply`, data);
  return response.data;
};
