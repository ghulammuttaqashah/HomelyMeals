import api from "./axios";

/**
 * Get all complaints
 */
export const getAllComplaints = (params = {}) => {
  return api.get("/api/admin/complaints", { params });
};

/**
 * Get single complaint details
 */
export const getComplaintById = (id) => {
  return api.get(`/api/admin/complaints/${id}`);
};

/**
 * Update complaint (status + admin response)
 */
export const updateComplaint = (id, data) => {
  return api.put(`/api/admin/complaints/${id}`, data);
};

/**
 * Send warning to a user
 */
export const sendWarning = (complaintId, data) => {
  return api.post(`/api/admin/complaints/${complaintId}/warn`, data);
};

/**
 * Get warning history for a user
 */
export const getWarningHistory = (userId) => {
  return api.get(`/api/admin/complaints/warnings/${userId}`);
};

/**
 * Delete a complaint (admin only)
 */
export const deleteComplaint = (id) => {
  return api.delete(`/api/admin/complaints/${id}`);
};

