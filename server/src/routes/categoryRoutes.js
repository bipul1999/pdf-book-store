import { Router } from "express";
import { body } from "express-validator";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../controllers/categoryController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", listCategories);
router.post("/", protect, requireRole("admin"), [body("name").notEmpty()], validate, createCategory);
router.put("/:id", protect, requireRole("admin"), updateCategory);
router.delete("/:id", protect, requireRole("admin"), deleteCategory);

export default router;
