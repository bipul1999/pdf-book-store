import { Router } from "express";
import { body } from "express-validator";
import { createSupportTicket } from "../controllers/supportController.js";
import { optionalProtect } from "../middleware/authMiddleware.js";
import { supportLimiter } from "../middleware/rateLimiters.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post(
  "/tickets",
  supportLimiter,
  optionalProtect,
  [
    body("message").trim().isLength({ min: 8, max: 2000 }),
    body("email").optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body("phone").optional({ checkFalsy: true }).trim().isLength({ min: 8, max: 20 }),
    body("name").optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body("pageUrl").optional({ checkFalsy: true }).trim().isLength({ max: 500 })
  ],
  validate,
  createSupportTicket
);

export default router;
