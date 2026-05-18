import { Router } from "express";
import { confirmManualPayment, createOrder, razorpayWebhook, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { paymentLimiter } from "../middleware/rateLimiters.js";
import { uploadPaymentProof } from "../middleware/upload.js";

const router = Router();

router.post("/create-order", paymentLimiter, protect, createOrder);
router.post("/confirm-manual", paymentLimiter, protect, uploadPaymentProof, confirmManualPayment);
router.post("/verify", paymentLimiter, protect, verifyPayment);
router.post("/webhook", razorpayWebhook);

export default router;
