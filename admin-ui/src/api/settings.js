// admin-ui/src/api/settings.js
import api from "./axios";

export const getDefaultProfileImage = async () => {
  const response = await api.get("/api/admin/settings/default-profile-image");
  return response.data;
};

export const updateDefaultProfileImage = async (imageUrl) => {
  console.log("Calling PUT /api/admin/settings/default-profile-image with:", imageUrl);
  console.log("Base URL:", api.defaults.baseURL);
  const response = await api.put("/api/admin/settings/default-profile-image", { imageUrl });
  console.log("Response:", response.data);
  return response.data;
};

export const deleteDefaultProfileImage = async () => {
  const response = await api.delete("/api/admin/settings/default-profile-image");
  return response.data;
};

export const getAllSettings = async () => {
  const response = await api.get("/api/admin/settings/all");
  return response.data;
};
