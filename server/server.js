import express from "express";
import { createServer } from "http";
import cors from "cors";
import connectDB from "./shared/config/db.js";
import { PORT, CUSTOMER_APP_URL, COOK_APP_URL, ADMIN_APP_URL } from "./shared/config/env.js";
import cookieParser from "cookie-parser";

import adminRoutes from "./modules/admin/index.js";
import customerRoutes from "./modules/customer/index.js";
import cookRoutes from "./modules/cook/index.js";
import webhookRoutes from "./shared/routes/webhook.routes.js";

import { initializeSocket } from "./shared/utils/socket.js";
import { startOrderJobs } from "./shared/jobs/orderJobs.js";

const app = express();
const server = createServer(app);
import dotenv from "dotenv";
dotenv.config();

const allowedOrigins = [
  CUSTOMER_APP_URL,  // customer frontend
  COOK_APP_URL,      // cook frontend
  ADMIN_APP_URL,     // admin frontend
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

// Webhook routes MUST come before express.json() to preserve raw body
app.use("/api/webhooks", webhookRoutes);

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

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server unning on http://localhost:${PORT}`);
});