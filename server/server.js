


import express from "express";
import cors from "cors";
import connectDB from "./shared/config/db.js";
import { PORT } from "./shared/config/env.js";
import cookieParser from "cookie-parser";
import adminRoutes from "./modules/admin/routes/admin.routes.js";

import customerRoutes from "./modules/customer/index.js";
import cookRoutes from "./modules/cook/index.js";

const app = express();

app.use(cookieParser());

// Middleware
app.use(cors());
app.use(express.json());

// Database
connectDB();
app.get("/", (req, res) => {
  res.send("Homely Meals API is working!");
});



app.use("/api/admin", adminRoutes);
// Routes
app.use("/api/customers", customerRoutes);
app.use("/api/cooks", cookRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});