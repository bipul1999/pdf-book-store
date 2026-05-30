import jwt from "jsonwebtoken";
import User from "../models/User.js";

const MIN_JWT_SECRET_LENGTH = 24;

function hasSecureJwtSecret() {
  return Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= MIN_JWT_SECRET_LENGTH);
}

export async function protect(req, res, next) {
  try {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    if (!hasSecureJwtSecret()) {
      return res.status(500).json({ message: "Server authentication is not configured securely" });
    }
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    if (!decoded.sid || decoded.sid !== user.activeSessionId) {
      return res.status(401).json({ message: "This account is logged in on another device. Please login again." });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function optionalProtect(req, _res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;
    if (!token || !hasSecureJwtSecret()) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && decoded.sid && decoded.sid === user.activeSessionId) req.user = user;
    return next();
  } catch {
    return next();
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
