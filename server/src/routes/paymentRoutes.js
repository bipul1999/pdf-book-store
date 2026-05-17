import { Router } from "express";
import { confirmManualPayment, createOrder, razorpayWebhook, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadPaymentProof } from "../middleware/upload.js";

const router = Router();

router.post("/create-order", protect, createOrder);
router.post("/confirm-manual", protect, uploadPaymentProof, confirmManualPayment);
router.post("/verify", protect, verifyPayment);
router.post("/webhook", razorpayWebhook);

export default router;
