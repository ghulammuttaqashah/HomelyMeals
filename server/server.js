import express from "express";
import cors from "cors";
import connectDB from "./shared/config/db.js";
import { PORT } from "./shared/config/env.js";
import cookieParser from "cookie-parser";

import adminRoutes from "./modules/admin/index.js";
import customerRoutes from "./modules/customer/index.js";
import cookRoutes from "./modules/cook/index.js";

const app = express();


const allowedOrigins = [
  "http://localhost:5173",  // admin frontend
  "http://localhost:5174",  // cusrtomer frontend
  "http://localhost:5175",  // cook frontend (if you use it)
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

app.get("/", (req, res) => {
  res.send("Homely Meals API is working!");
});

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/cook", cookRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
