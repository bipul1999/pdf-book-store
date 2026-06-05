import { logRequestEvent } from "../utils/logger.js";

export function notFound(req, res, next) {
  const error = new Error(`Not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
}

export function errorHandler(error, req, res, _next) {
  const status = error.statusCode || (error.name === "MulterError" ? 422 : (res.statusCode === 200 ? 500 : res.statusCode));
  const isProduction = process.env.NODE_ENV === "production";
  const message = isProduction && status >= 500 ? "Server error" : error.message || "Server error";
  logRequestEvent(status >= 500 ? "error" : "security", status >= 500 ? "request_error" : "request_rejected", req, {
    statusCode: status,
    error: error.message,
    name: error.name
  });
  res.status(status).json({
    message,
    stack: isProduction ? undefined : error.stack
  });
}
