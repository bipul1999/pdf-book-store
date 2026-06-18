import { Router } from "express";
import { confirmManualPayment, createManualBookOrder, createManualBookOrderDraft, createOrder, getManualBookOrderPayment, getOrderBookSettings, getRazorpayStatus, razorpayWebhook, startManualBookOrderPayment, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { paymentLimiter } from "../middleware/rateLimiters.js";
import { cachePublicResponse } from "../middleware/publicResponseCache.js";
import { uploadOrderBookProof, uploadPaymentProof } from "../middleware/upload.js";

const router = Router();

router.get("/order-book-settings", cachePublicResponse(60 * 1000), getOrderBookSettings);
router.get("/razorpay-status", getRazorpayStatus);
router.post("/manual-book-order/draft", paymentLimiter, protect, createManualBookOrderDraft);
router.get("/manual-book-order/:id/payment", paymentLimiter, protect, getManualBookOrderPayment);
router.post("/manual-book-order/:id/payment", paymentLimiter, protect, uploadOrderBookProof, startManualBookOrderPayment);
router.post("/manual-book-order", paymentLimiter, protect, uploadOrderBookProof, createManualBookOrder);
router.post("/create-order", paymentLimiter, protect, createOrder);
router.post("/confirm-manual", paymentLimiter, protect, uploadPaymentProof, confirmManualPayment);
router.post("/verify", paymentLimiter, protect, verifyPayment);
router.post("/webhook", razorpayWebhook);

export default router;
