import axiosInstance from "./axios";

/**
 * Get cook's orders
 */
export const getOrders = async (params = {}) => {
  const response = await axiosInstance.get("/api/cook/orders", { params });
  return response.data;
};

/**
 * Get single order details
 */
export const getOrderById = async (orderId) => {
  const response = await axiosInstance.get(`/api/cook/orders/${orderId}`);
  return response.data;
};

/**
 * Update order status (preparing, out_for_delivery, delivered)
 */
export const updateOrderStatus = async (orderId, status, note = "") => {
  const response = await axiosInstance.patch(`/api/cook/orders/${orderId}/status`, {
    status,
    note,
  });
  return response.data;
};

/**
 * Add delivery note
 */
export const addDeliveryNote = async (orderId, note) => {
  const response = await axiosInstance.patch(`/api/cook/orders/${orderId}/delivery-note`, {
    note,
  });
  return response.data;
};

/**
 * Respond to cancellation request (accept/reject)
 */
export const respondToCancellation = async (orderId, action, response = "") => {
  const res = await axiosInstance.patch(`/api/cook/orders/${orderId}/cancellation-response`, {
    action,
    response,
  });
  return res.data;
};

/**
 * Cancel order explicitly by cook
 */
export const cancelOrder = async (orderId, reason) => {
  const res = await axiosInstance.patch(`/api/cook/orders/${orderId}/cancel`, {
    reason,
  });
  return res.data;
};

export default {
  getOrders,
  getOrderById,
  updateOrderStatus,
  addDeliveryNote,
  respondToCancellation,
  cancelOrder,
};
