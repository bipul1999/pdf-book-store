import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import siteRoutes from "./routes/siteRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { blockExecutableUploadNames, blockPdfDirectAccess, rejectNoSqlOperators } from "./middleware/security.js";
import { getLastDatabaseError } from "./config/db.js";
import { logRequestEvent } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set("trust proxy", 1);
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV === "production" && allowedOrigins.some((origin) => origin === "*")) {
  throw new Error("CLIENT_URL must list explicit origins in production");
}

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameSrc: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
      formAction: ["'self'"]
    }
  },
  hsts: process.env.NODE_ENV === "production"
    ? { maxAge: 15552000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: "no-referrer" }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== "production" && (origin.endsWith(".loca.lt") || origin.endsWith(".trycloudflare.com"))) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use(compression({
  threshold: 1024,
  filter(req, res) {
    if (req.path.endsWith("/download")) return false;
    return compression.filter(req, res);
  }
}));
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb", parameterLimit: 100 }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(blockPdfDirectAccess);
app.use(blockExecutableUploadNames);
app.use(rejectNoSqlOperators);
app.use((req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 500) logRequestEvent("error", "server_error_response", req, { statusCode: res.statusCode });
  });
  next();
});
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.json({
    status: "ok",
    app: "PDF Book Store",
    database: databaseConnected ? "connected" : "not_connected",
    databaseError: !databaseConnected && process.env.NODE_ENV !== "production" ? getLastDatabaseError() : ""
  });
});

function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({ message: "Database not connected. Please check Render MONGO_URI and MongoDB Atlas network access." });
}

const staticOptions = {
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
  }
};
app.use("/uploads/covers", express.static(path.join(__dirname, "..", "uploads", "covers"), { ...staticOptions, index: false }));
app.use("/uploads/payment-qrs", express.static(path.join(__dirname, "..", "uploads", "payment-qrs"), { ...staticOptions, index: false }));
app.use("/uploads/quotes", express.static(path.join(__dirname, "..", "uploads", "quotes"), { ...staticOptions, index: false }));
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false }));
}
app.use("/api/site", requireDatabase, siteRoutes);
app.use("/api/auth", (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  next();
}, requireDatabase, authRoutes);
app.use("/api/books", requireDatabase, bookRoutes);
app.use("/api/categories", requireDatabase, categoryRoutes);
app.use("/api/payments", requireDatabase, paymentRoutes);
app.use("/api/users", requireDatabase, userRoutes);
app.use("/api/support", requireDatabase, supportRoutes);
app.use("/api/feedback", requireDatabase, feedbackRoutes);
app.use("/api/admin", requireDatabase, adminRoutes);
if (fs.existsSync(clientDist)) {
  app.get(/^(?!\/api\/|\/uploads\/).*$/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}
app.use(notFound);
app.use(errorHandler);

export default app;
