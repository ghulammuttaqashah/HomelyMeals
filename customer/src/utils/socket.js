import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

let socket = null;

/**
 * Initialize socket connection.
 * Only creates a new socket if none exists.
 * Socket.io handles reconnection automatically.
 */
export const initializeSocket = () => {
  // Return existing socket — socket.io reconnects automatically
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    query: { userType: "customer" },
  });

  socket.on("connect", () => {
    console.log("🔌 Customer socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Customer socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("🔌 Customer socket connection error:", error.message);
  });

  return socket;
};

/**
 * Get socket instance
 */
export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Subscribe to order updates
 */
export const subscribeToOrderUpdates = (callback) => {
  const sock = getSocket();
  
  const events = [
    "orderUpdate",
    "order_confirmed",
    "order_rejected", 
    "order_status_updated",
    "order_delivered",
    "order_cancelled",
    "order_auto_cancelled",
    "payment_verified",
    "payment_rejected",
    "cancellation_accepted",
    "cancellation_rejected",
  ];
  
  const handlers = {};
  
  events.forEach(event => {
    const handler = (data) => {
      callback({ ...data, eventType: event });
    };
    handlers[event] = handler;
    sock.on(event, handler);
  });
  
  return () => {
    events.forEach(event => sock.off(event, handlers[event]));
  };
};

/**
 * Subscribe to new orders (for cooks)
 */
export const subscribeToNewOrders = (callback) => {
  const sock = getSocket();
  sock.on("newOrder", callback);
  return () => sock.off("newOrder", callback);
};

/**
 * Subscribe to dispute updates
 */
export const subscribeToDisputeUpdates = (callback) => {
  const sock = getSocket();
  sock.on("disputeResolved", callback);
  return () => sock.off("disputeResolved", callback);
};

/**
 * Subscribe to payment verification updates
 */
export const subscribeToPaymentUpdates = (callback) => {
  const sock = getSocket();
  sock.on("paymentUpdate", callback);
  return () => sock.off("paymentUpdate", callback);
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  subscribeToOrderUpdates,
  subscribeToNewOrders,
  subscribeToDisputeUpdates,
  subscribeToPaymentUpdates,
};
