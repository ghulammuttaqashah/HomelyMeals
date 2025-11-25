// shared/middleware/auth.js
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export const protect = (req, res, next) => {
  // Determine which cookie to check based on the route
  let token;
  if (req.path.startsWith("/admin") || req.originalUrl.includes("/admin")) {
    // For admin routes, check adminToken first, then fall back to token (for backward compatibility)
    token = req.cookies?.adminToken || req.cookies?.token || req.headers.authorization?.split(" ")[1];
  } else {
    token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  }

  if (!token) {
    console.log("❌ Auth failed: No token provided");
    console.log("   Cookies received:", Object.keys(req.cookies || {}).join(", ") || "none");
    console.log("   Path:", req.path);
    console.log("   Original URL:", req.originalUrl);
    console.log("   Origin:", req.headers.origin);
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Only attach ID — nothing else
    req.user = {
      _id: decoded.id || decoded._id,   // normalize ID
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      console.log("❌ Auth failed: Token expired");
      return res.status(401).json({
        message: "Session expired. Please sign in again.",
      });
    }

    console.log("❌ Auth failed: Invalid token -", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
