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
    query: { userType: "cook" },
  });

  socket.on("connect", () => {
    console.log("🔌 Cook socket connected:", socket.id);
    console.log("🔌 Socket transport:", socket.io?.engine?.transport?.name);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Cook socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("🔌 Cook socket connection error:", error.message);
  });

  // Debug: listen for all events
  socket.onAny((event, ...args) => {
    console.log(`🔔 Socket event received: ${event}`, args);
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
 * Subscribe to new orders
 */
export const subscribeToNewOrders = (callback) => {
  const sock = getSocket();
  
  const events = ["newOrder", "new_order"];
  const handlers = {};
  
  events.forEach(event => {
    const handler = (data) => {
      console.log(`🔔 Cook received new order event: ${event}`, data);
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
 * Subscribe to order updates
 */
export const subscribeToOrderUpdates = (callback) => {
  const sock = getSocket();
  
  const events = [
    "orderUpdate",
    "order_delivered",
    "order_status_updated",
    "order_cancelled",
    "order_auto_cancelled",
    "cancellation_request",
    "dispute_created",
    "payment_proof_uploaded",
  ];
  
  const handlers = {};
  
  events.forEach(event => {
    const handler = (data) => {
      console.log(`🔔 Cook received event: ${event}`, data);
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
 * Subscribe to dispute updates
 */
export const subscribeToDisputeUpdates = (callback) => {
  const sock = getSocket();
  sock.on("disputeResolved", callback);
  return () => sock.off("disputeResolved", callback);
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  subscribeToNewOrders,
  subscribeToOrderUpdates,
  subscribeToDisputeUpdates,
};
