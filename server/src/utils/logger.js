import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = process.env.LOG_DIR || path.resolve(__dirname, "..", "..", "..", "logs");

function safeDetails(details = {}) {
  const redacted = { ...details };
  ["password", "token", "authorization", "razorpaySignature", "paymentProofData"].forEach((key) => {
    if (key in redacted) redacted[key] = "[redacted]";
  });
  return redacted;
}

export function clientIp(req) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req?.ip || req?.socket?.remoteAddress || "";
}

export function logEvent(channel, event, details = {}) {
  const entry = {
    at: new Date().toISOString(),
    event,
    ...safeDetails(details)
  };
  const line = `${JSON.stringify(entry)}\n`;
  fs.promises.mkdir(logDir, { recursive: true })
    .then(() => fs.promises.appendFile(path.join(logDir, `${channel}.log`), line))
    .catch((error) => {
      if (process.env.NODE_ENV !== "production") console.error("Log write failed:", error.message);
    });
}

export function logRequestEvent(channel, event, req, details = {}) {
  logEvent(channel, event, {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?._id,
    role: req.user?.role,
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
    ...details
  });
}
