// shared/config/env.js
import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;
export const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const OPENROUTE_API_KEY = process.env.OPENROUTE_API_KEY;

// Frontend URLs
export const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL || "http://localhost:5173";
export const COOK_APP_URL = process.env.COOK_APP_URL || "http://localhost:5174";
export const ADMIN_APP_URL = process.env.ADMIN_APP_URL || "http://localhost:5175";