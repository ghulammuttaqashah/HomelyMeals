// modules/cook/routes/cook.routes.js
import express from "express";
import { signUpCook } from "../controllers/cook.controller.js";

const router = express.Router();

router.post("/signup", signUpCook);

export default router;