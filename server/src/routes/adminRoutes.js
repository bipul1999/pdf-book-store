import { Router } from "express";
import { dashboardStats, listOrders, listUsers, viewOrderProof } from "../controllers/adminController.js";
import { getPaymentSettings, updateDigitalAccess, updateOrderStatus, updatePaymentSettings } from "../controllers/paymentController.js";
import { getQuoteSetting, updateQuoteSetting } from "../controllers/quoteController.js";
import { listSupportTickets, updateSupportTicket } from "../controllers/supportController.js";
import { listFeedback, updateFeedbackStatus } from "../controllers/feedbackController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { adminWriteLimiter } from "../middleware/rateLimiters.js";
import { uploadPaymentQr, uploadQuoteImage } from "../middleware/upload.js";

const router = Router();
router.use(protect, requireRole("admin"));

router.get("/stats", dashboardStats);
router.get("/users", listUsers);
router.get("/support-tickets", listSupportTickets);
router.patch("/support-tickets/:id", adminWriteLimiter, updateSupportTicket);
router.get("/feedback", listFeedback);
router.patch("/feedback/:id", adminWriteLimiter, updateFeedbackStatus);
router.get("/orders", listOrders);
router.get("/orders/:id/proof", viewOrderProof);
router.patch("/orders/:id/status", adminWriteLimiter, updateOrderStatus);
router.patch("/orders/:id/access", adminWriteLimiter, updateDigitalAccess);
router.get("/payment-settings", getPaymentSettings);
router.put("/payment-settings", adminWriteLimiter, uploadPaymentQr, updatePaymentSettings);
router.get("/quote-settings", getQuoteSetting);
router.put("/quote-settings", adminWriteLimiter, uploadQuoteImage, updateQuoteSetting);

export default router;
