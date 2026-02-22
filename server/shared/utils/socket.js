import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

let io;

/**
 * Initialize Socket.io with the HTTP server
 * @param {Object} server - HTTP server instance
 */
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173", // customer frontend
        "http://localhost:5174", // cook frontend
        "http://localhost:5175", // admin frontend
      ],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) {
        return next(new Error("No cookies provided"));
      }

      // Parse cookies
      const cookieObj = {};
      cookies.split(";").forEach((cookie) => {
        const [key, value] = cookie.trim().split("=");
        cookieObj[key] = value;
      });

      // Use the userType query param to pick the correct token
      const requestedType = socket.handshake.query?.userType;
      let user = null;
      let userType = null;

      if (requestedType === "cook" && cookieObj.cookToken) {
        user = jwt.verify(cookieObj.cookToken, JWT_SECRET);
        userType = "cook";
      } else if (requestedType === "customer" && cookieObj.customerToken) {
        user = jwt.verify(cookieObj.customerToken, JWT_SECRET);
        userType = "customer";
      } else if (requestedType === "admin" && cookieObj.adminToken) {
        user = jwt.verify(cookieObj.adminToken, JWT_SECRET);
        userType = "admin";
      } else if (cookieObj.customerToken) {
        user = jwt.verify(cookieObj.customerToken, JWT_SECRET);
        userType = "customer";
      } else if (cookieObj.cookToken) {
        user = jwt.verify(cookieObj.cookToken, JWT_SECRET);
        userType = "cook";
      } else if (cookieObj.adminToken) {
        user = jwt.verify(cookieObj.adminToken, JWT_SECRET);
        userType = "admin";
      }

      if (!user) {
        return next(new Error("Authentication failed"));
      }

      socket.user = user;
      socket.userType = userType;
      next();
    } catch (error) {
      console.error("Socket auth error:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const { user, userType } = socket;
    const room = `${userType}:${user.id}`;
    
    socket.join(room);
    console.log(`🔌 Socket connected: ${room} (socket.id: ${socket.id})`);

    // Also join type-specific room for broadcasts
    socket.join(userType);

    // Log all rooms this socket has joined
    console.log(`🔌 Socket rooms:`, Array.from(socket.rooms));

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${room}`);
    });
  });

  console.log("🔌 Socket.io initialized");
  return io;
};

/**
 * Get Socket.io instance
 * @returns {Server}
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

/**
 * Emit event to a specific customer
 * @param {string} customerId - Customer's MongoDB ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToCustomer = (customerId, event, data) => {
  if (io) {
    const room = `customer:${customerId}`;
    console.log(`📤 Emitting "${event}" to room "${room}"`);
    io.to(room).emit(event, data);
  } else {
    console.log("❌ Socket.io not initialized, cannot emit to customer");
  }
};

/**
 * Emit event to a specific cook
 * @param {string} cookId - Cook's MongoDB ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToCook = (cookId, event, data) => {
  if (io) {
    const room = `cook:${cookId}`;
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const socketCount = roomSockets ? roomSockets.size : 0;
    console.log(`📤 Emitting "${event}" to room "${room}" (${socketCount} sockets in room)`, data);
    io.to(room).emit(event, data);
  } else {
    console.log("❌ Socket.io not initialized, cannot emit to cook");
  }
};

/**
 * Emit event to all admins
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToAdmins = (event, data) => {
  if (io) {
    io.to("admin").emit(event, data);
  }
};

/**
 * Emit event to a specific admin
 * @param {string} adminId - Admin's MongoDB ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToAdmin = (adminId, event, data) => {
  if (io) {
    io.to(`admin:${adminId}`).emit(event, data);
  }
};
