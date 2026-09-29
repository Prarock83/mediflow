import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  adminUserQuerySchema,
  adminUserIdParamSchema,
} from "../schemas/admin-user.schema";
import {
  getUsersHandler,
  getUserByIdHandler,
} from "../controllers/admin-user.controller";

const router = Router();

// Enforce requireAuth and requireRole(UserRole.ADMIN) on all admin user routes
router.use(requireAuth, requireRole(UserRole.ADMIN));

// GET /api/admin/users
router.get(
  "/",
  validate(adminUserQuerySchema, "query"),
  getUsersHandler
);

// GET /api/admin/users/:id
router.get(
  "/:id",
  validate(adminUserIdParamSchema, "params"),
  getUserByIdHandler
);

export default router;
