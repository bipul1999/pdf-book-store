import rateLimit from "express-rate-limit";

function retryAfterSeconds(req) {
  const resetTime = req.rateLimit?.resetTime;
  if (!resetTime) return undefined;
  const resetMs = resetTime instanceof Date ? resetTime.getTime() : Number(resetTime);
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts. Please wait before trying again.",
      retryAfterSeconds: retryAfterSeconds(req)
    });
  }
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many OTP requests. Please wait before requesting another OTP.",
      retryAfterSeconds: retryAfterSeconds(req)
    });
  }
});
