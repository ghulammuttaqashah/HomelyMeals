import express from "express";
import cookAuthRoutes from "./routes/cookAuth.routes.js";

const router = express.Router();

router.use("/auth", cookAuthRoutes);

export default router;
