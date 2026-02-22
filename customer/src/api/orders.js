import axiosInstance from "./axios";

/**
 * Calculate delivery info (distance and fee)
 */
export const calculateDeliveryInfo = async (cookId, deliveryAddress) => {
  const response = await axiosInstance.post("/api/customer/orders/calculate-delivery", {
    cookId,
    deliveryAddress,
  });
  return response.data;
};

/**
 * Place an order
 */
export const placeOrder = async (orderData) => {
  const response = await axiosInstance.post("/api/customer/orders", orderData);
  return response.data;
};

/**
 * Get customer orders
 */
export const getOrders = async (params = {}) => {
  const response = await axiosInstance.get("/api/customer/orders", { params });
  return response.data;
};

/**
 * Get single order details
 */
export const getOrderById = async (orderId) => {
  const response = await axiosInstance.get(`/api/customer/orders/${orderId}`);
  return response.data;
};

/**
 * Request cancellation (cook must approve)
 */
export const requestCancellation = async (orderId, reason) => {
  const response = await axiosInstance.post(`/api/customer/orders/${orderId}/request-cancellation`, { reason });
  return response.data;
};

export default {
  calculateDeliveryInfo,
  placeOrder,
  getOrders,
  getOrderById,
  requestCancellation,
};
