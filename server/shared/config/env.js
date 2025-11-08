// shared/config/env.js
import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;
export const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
