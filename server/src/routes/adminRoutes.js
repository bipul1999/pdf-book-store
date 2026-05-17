import { Router } from "express";
import { dashboardStats, listOrders, listUsers } from "../controllers/adminController.js";
import { getPaymentSettings, updateOrderStatus, updatePaymentSettings } from "../controllers/paymentController.js";
import { getQuoteSetting, updateQuoteSetting } from "../controllers/quoteController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadPaymentQr, uploadQuoteImage } from "../middleware/upload.js";

const router = Router();
router.use(protect, requireRole("admin"));

router.get("/stats", dashboardStats);
router.get("/users", listUsers);
router.get("/orders", listOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.get("/payment-settings", getPaymentSettings);
router.put("/payment-settings", uploadPaymentQr, updatePaymentSettings);
router.get("/quote-settings", getQuoteSetting);
router.put("/quote-settings", uploadQuoteImage, updateQuoteSetting);

export default router;
