import { Router } from "express";
import { myLibrary, myOrders } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/orders", protect, myOrders);
router.get("/library", protect, myLibrary);

export default router;
