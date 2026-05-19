export function notFound(req, res, next) {
  const error = new Error(`Not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const isProduction = process.env.NODE_ENV === "production";
  const message = isProduction && status >= 500 ? "Server error" : error.message || "Server error";
  res.status(status).json({
    message,
    stack: isProduction ? undefined : error.stack
  });
}
