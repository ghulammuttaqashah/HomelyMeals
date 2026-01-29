// shared/middleware/auth.js
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

/**
 * Optional authentication middleware
 * Attaches user info if token exists, but doesn't fail if not
 * Useful for endpoints that work for both guests and logged-in users
 */
export const optionalAuth = (req, res, next) => {
  let token;
  
  if (req.originalUrl.includes("/customer")) {
    token = req.cookies?.customerToken || req.headers.authorization?.split(" ")[1];
  } else if (req.originalUrl.includes("/cook")) {
    token = req.cookies?.cookToken || req.headers.authorization?.split(" ")[1];
  } else if (req.originalUrl.includes("/admin")) {
    token = req.cookies?.adminToken || req.headers.authorization?.split(" ")[1];
  } else {
    token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  }

  if (!token) {
    // No token - continue without user info (guest)
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      _id: decoded.id || decoded._id,
    };
    next();
  } catch (err) {
    // Invalid/expired token - continue as guest
    req.user = null;
    next();
  }
};

export const protect = (req, res, next) => {
  // Determine which cookie to check based on the route
  let token;
  if (req.path.startsWith("/admin") || req.originalUrl.includes("/admin")) {
    // For admin routes, check adminToken
    token = req.cookies?.adminToken || req.headers.authorization?.split(" ")[1];
  } else if (req.originalUrl.includes("/cook")) {
    // For cook routes, check cookToken
    token = req.cookies?.cookToken || req.headers.authorization?.split(" ")[1];
  } else if (req.originalUrl.includes("/customer")) {
    // For customer routes, check customerToken
    token = req.cookies?.customerToken || req.headers.authorization?.split(" ")[1];
  } else {
    // Fallback to generic token
    token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  }

  if (!token) {
    // Only log if it's not a /me endpoint (which is expected to fail when not logged in)
    if (!req.originalUrl.includes("/me")) {
     // console.log("❌ Auth failed: No token provided");
      //console.log("   Cookies received:", Object.keys(req.cookies || {}).join(", ") || "none");
      //console.log("   Path:", req.path);
      //console.log("   Original URL:", req.originalUrl);
      //console.log("   Origin:", req.headers.origin);
    }
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
      //console.log("❌ Auth failed: Token expired");
      return res.status(401).json({
        message: "Session expired. Please sign in again.",
      });
    }

    //console.log("❌ Auth failed: Invalid token -", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
