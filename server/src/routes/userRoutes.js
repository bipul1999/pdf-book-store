import { Router } from "express";
import { myLibrary, myLibraryBook, myOrders } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/orders", protect, myOrders);
router.get("/library", protect, myLibrary);
router.get("/library/:id", protect, myLibraryBook);

export default router;
