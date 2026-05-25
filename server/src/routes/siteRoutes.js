import { Router } from "express";
import { getQuoteSetting } from "../controllers/quoteController.js";
import { cachePublicResponse } from "../middleware/publicResponseCache.js";

const router = Router();

router.get("/quote", cachePublicResponse(5 * 60 * 1000), getQuoteSetting);

export default router;
