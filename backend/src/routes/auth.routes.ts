import { Router } from "express";
import { registerHandler, loginHandler } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { registerSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

// POST /api/auth/register
router.post("/register", validate(registerSchema, "body"), registerHandler);

// POST /api/auth/login
router.post("/login", validate(loginSchema, "body"), loginHandler);

export default router;

