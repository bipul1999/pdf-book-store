import { Router } from "express";
import { body } from "express-validator";
import { createFeedback } from "../controllers/feedbackController.js";
import { optionalProtect } from "../middleware/authMiddleware.js";
import { supportLimiter } from "../middleware/rateLimiters.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post(
  "/",
  supportLimiter,
  optionalProtect,
  [
    body("category").isIn(["website", "book", "purchase", "payment", "problem", "suggestion"]),
    body("rating").isInt({ min: 1, max: 5 }),
    body("message").trim().isLength({ min: 5, max: 2000 }),
    body("name").optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body("email").optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body("phone").optional({ checkFalsy: true }).trim().isLength({ min: 8, max: 20 })
  ],
  validate,
  createFeedback
);

export default router;
