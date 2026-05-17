import { Router } from "express";
import { body } from "express-validator";
import { adminSignup, adminSignupRules, adminStatus, forgotPassword, login, me, requestLoginOtp, resendAdminSignupOtp, resendSignupOtp, resetPassword, signup, signupRules, verifyAdminSignupOtp, verifyLoginOtp, verifySignupOtp } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimiters.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/signup", otpLimiter, signupRules, validate, signup);
router.post("/signup/resend-otp", otpLimiter, [body("email").isEmail().normalizeEmail()], validate, resendSignupOtp);
router.post("/verify-otp", otpLimiter, [body("email").isEmail().normalizeEmail(), body("code").isLength({ min: 6, max: 6 })], validate, verifySignupOtp);
router.get("/admin/status", adminStatus);
router.post("/admin/signup", otpLimiter, adminSignupRules, validate, adminSignup);
router.post("/admin/resend-otp", otpLimiter, [body("email").isEmail().normalizeEmail()], validate, resendAdminSignupOtp);
router.post("/admin/verify-otp", otpLimiter, [body("email").isEmail().normalizeEmail(), body("code").isLength({ min: 6, max: 6 })], validate, verifyAdminSignupOtp);
router.post("/login", authLimiter, [body("identifier").notEmpty(), body("password").notEmpty()], validate, login);
router.post("/login/request-otp", otpLimiter, [body("identifier").notEmpty()], validate, requestLoginOtp);
router.post("/login/verify-otp", otpLimiter, [body("email").isEmail().normalizeEmail(), body("code").isLength({ min: 6, max: 6 })], validate, verifyLoginOtp);
router.post("/forgot-password", otpLimiter, [body("email").isEmail().normalizeEmail()], validate, forgotPassword);
router.post("/reset-password", otpLimiter, [body("email").isEmail().normalizeEmail(), body("code").isLength({ min: 6, max: 6 }), body("password").isLength({ min: 8 })], validate, resetPassword);
router.get("/me", protect, me);

export default router;
