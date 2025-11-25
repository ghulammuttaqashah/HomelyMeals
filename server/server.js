import express from "express";
import cors from "cors";
import connectDB from "./shared/config/db.js";
import { PORT } from "./shared/config/env.js";
import cookieParser from "cookie-parser";

import adminRoutes from "./modules/admin/index.js";
import customerRoutes from "./modules/customer/index.js";
import cookRoutes from "./modules/cook/index.js";

const app = express();

// Correct CORS for cookies
app.use(
  cors({
    origin: "http://localhost:5174", // your frontend
    credentials: true, // allow cookies to be sent/received
  })
);

app.use(cookieParser());
app.use(express.json());

// Database
connectDB();

app.get("/", (req, res) => {
  res.send("Homely Meals API is working!");
});

app.use("/api/admin", adminRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/cooks", cookRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
