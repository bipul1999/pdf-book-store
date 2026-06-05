import jwt from "jsonwebtoken";
import crypto from "crypto";

const MIN_JWT_SECRET_LENGTH = 24;

export function signToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    const error = new Error("Server authentication is not configured securely");
    error.statusCode = 500;
    throw error;
  }
  return jwt.sign({ id: user._id, role: user.role, sid: user.activeSessionId }, process.env.JWT_SECRET, {
    expiresIn: user.role === "admin"
      ? (process.env.ADMIN_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "12h")
      : (process.env.JWT_EXPIRES_IN || "7d"),
    issuer: process.env.JWT_ISSUER || "pdf-book-store",
    audience: process.env.JWT_AUDIENCE || "pdf-book-store-users"
  });
}

export async function issueSessionToken(user, loginAudit = {}) {
  user.activeSessionId = crypto.randomUUID();
  if (!user.firstLoginAt) user.firstLoginAt = loginAudit.at || new Date();
  user.lastLoginAt = loginAudit.at || new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  user.lastLoginIp = loginAudit.ip || "";
  user.lastLoginUserAgent = loginAudit.userAgent || "";
  await user.save({ validateBeforeSave: false });
  return signToken(user);
}

export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified
  };
}
