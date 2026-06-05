import { Router } from "express";
import { getQuoteSetting } from "../controllers/quoteController.js";
import { trackVisit } from "../controllers/visitorController.js";
import { optionalProtect } from "../middleware/authMiddleware.js";
import { cachePublicResponse } from "../middleware/publicResponseCache.js";

const router = Router();

router.get("/quote", cachePublicResponse(5 * 60 * 1000), getQuoteSetting);
router.post("/visit", optionalProtect, trackVisit);

export default router;
