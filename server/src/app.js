import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
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
import { createRazorpayOrder, verifyRazorpaySignature } from "./controllers/paymentController.js";
import { protect } from "./middleware/authMiddleware.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { apiLimiter, paymentLimiter } from "./middleware/rateLimiters.js";
import { getLastDatabaseError } from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set("trust proxy", 1);
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
  credentials: true
}));
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => res.json({
  status: "ok",
  app: "PDF Book Store",
  database: mongoose.connection.readyState === 1 ? "connected" : "not_connected",
  databaseError: mongoose.connection.readyState === 1 ? "" : getLastDatabaseError()
}));

function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({ message: "Database not connected. Please check Render MONGO_URI and MongoDB Atlas network access." });
}

const staticOptions = {
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
};
app.use("/uploads/covers", express.static(path.join(__dirname, "..", "uploads", "covers"), { ...staticOptions, index: false }));
app.use("/uploads/payment-qrs", express.static(path.join(__dirname, "..", "uploads", "payment-qrs"), { ...staticOptions, index: false }));
app.use("/uploads/quotes", express.static(path.join(__dirname, "..", "uploads", "quotes"), { ...staticOptions, index: false }));
app.use("/api/site", siteRoutes);
app.use("/api/auth", requireDatabase, authRoutes);
app.use("/api/books", requireDatabase, bookRoutes);
app.use("/api/categories", requireDatabase, categoryRoutes);
app.use("/api/payments", requireDatabase, paymentRoutes);
app.post("/api/create-order", requireDatabase, paymentLimiter, protect, createRazorpayOrder);
app.post("/api/verify-payment", requireDatabase, paymentLimiter, protect, verifyRazorpaySignature);
app.use("/api/users", requireDatabase, userRoutes);
app.use("/api/support", requireDatabase, supportRoutes);
app.use("/api/admin", requireDatabase, adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
