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
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

export async function issueSessionToken(user) {
  user.activeSessionId = crypto.randomUUID();
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
