import { Router } from "express";
import { getQuoteSetting } from "../controllers/quoteController.js";

const router = Router();

router.get("/quote", getQuoteSetting);

export default router;
