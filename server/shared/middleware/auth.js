// shared/middleware/auth.js
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export const protect = (req, res, next) => {
  // Try reading token from cookie first
  const token =
    req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token)
    return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
