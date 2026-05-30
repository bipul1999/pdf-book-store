import { Router } from "express";
import { body } from "express-validator";
import { createBook, deleteBook, downloadBook, getBook, listBooks, updateBook } from "../controllers/bookController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { adminWriteLimiter } from "../middleware/rateLimiters.js";
import { cachePublicResponse } from "../middleware/publicResponseCache.js";
import { uploadBookFiles } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", cachePublicResponse(60 * 1000), listBooks);
router.get("/:id", cachePublicResponse(60 * 1000), getBook);
router.get("/:id/download", protect, downloadBook);
router.post("/", protect, requireRole("admin"), adminWriteLimiter, uploadBookFiles, [body("title").notEmpty(), body("author").notEmpty(), body("description").notEmpty(), body("orderBookPrice").isFloat({ min: 0 })], validate, createBook);
router.put("/:id", protect, requireRole("admin"), adminWriteLimiter, uploadBookFiles, updateBook);
router.delete("/:id", protect, requireRole("admin"), adminWriteLimiter, deleteBook);

export default router;
