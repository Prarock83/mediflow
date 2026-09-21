import { Router } from "express";
import { registerHandler } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { registerSchema } from "../schemas/auth.schema";

const router = Router();

// POST /api/auth/register
router.post("/register", validate(registerSchema, "body"), registerHandler);

export default router;
