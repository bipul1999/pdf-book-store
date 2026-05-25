import { Router } from "express";
import { body } from "express-validator";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../controllers/categoryController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { adminWriteLimiter } from "../middleware/rateLimiters.js";
import { cachePublicResponse } from "../middleware/publicResponseCache.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", cachePublicResponse(5 * 60 * 1000), listCategories);
router.post("/", protect, requireRole("admin"), adminWriteLimiter, [body("name").notEmpty()], validate, createCategory);
router.put("/:id", protect, requireRole("admin"), adminWriteLimiter, updateCategory);
router.delete("/:id", protect, requireRole("admin"), adminWriteLimiter, deleteCategory);

export default router;
