import express from "express";
import { createServer } from "http";
import cors from "cors";
import connectDB from "./shared/config/db.js";
import { PORT } from "./shared/config/env.js";
import cookieParser from "cookie-parser";

import adminRoutes from "./modules/admin/index.js";
import customerRoutes from "./modules/customer/index.js";
import cookRoutes from "./modules/cook/index.js";

import { initializeSocket } from "./shared/utils/socket.js";
import { startOrderJobs } from "./shared/jobs/orderJobs.js";

const app = express();
const server = createServer(app);


const allowedOrigins = [
  "http://localhost:5173",  // customer frontend
  "http://localhost:5174",  // cook frontend
  "http://localhost:5175",  // admin frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (e.g. mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked:", origin);
        callback(new Error("CORS blocked"));
      }
    },
    credentials: true, // allow cookies/token
  })
);

app.use(cookieParser());
app.use(express.json());

// Database
connectDB();

// Initialize Socket.io
initializeSocket(server);

// Start cron jobs
startOrderJobs();

app.get("/", (req, res) => {
  res.send("Homely Meals API is working!");
});

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/cook", cookRoutes);

// Global error-handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});