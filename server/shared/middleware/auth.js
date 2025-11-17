// shared/middleware/auth.js
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export const protect = (req, res, next) => {
  const token =
    req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    // ⏳ If token expired
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please sign in again."
      });
    }

    // ❌ Any other token error
    return res.status(401).json({ message: "Invalid token" });
  }
};
