import { Router } from "express";
import { confirmManualPayment, createManualBookOrder, createOrder, getOrderBookSettings, razorpayWebhook, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { paymentLimiter } from "../middleware/rateLimiters.js";
import { uploadOrderBookProof, uploadPaymentProof } from "../middleware/upload.js";

const router = Router();

router.get("/order-book-settings", getOrderBookSettings);
router.post("/manual-book-order", paymentLimiter, protect, uploadOrderBookProof, createManualBookOrder);
router.post("/create-order", paymentLimiter, protect, createOrder);
router.post("/confirm-manual", paymentLimiter, protect, uploadPaymentProof, confirmManualPayment);
router.post("/verify", paymentLimiter, protect, verifyPayment);
router.post("/webhook", razorpayWebhook);

export default router;
