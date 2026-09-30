import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  adminAuditLogQuerySchema,
  adminAuditLogIdParamSchema,
} from "../schemas/audit-log.schema";
import {
  getAuditLogsHandler,
  getAuditLogByIdHandler,
} from "../controllers/audit-log.controller";

const router = Router();

// Enforce requireAuth and requireRole(UserRole.ADMIN) on all audit log routes
router.use(requireAuth, requireRole(UserRole.ADMIN));

// GET /api/admin/audit-logs
router.get(
  "/",
  validate(adminAuditLogQuerySchema, "query"),
  getAuditLogsHandler
);

// GET /api/admin/audit-logs/:id
router.get(
  "/:id",
  validate(adminAuditLogIdParamSchema, "params"),
  getAuditLogByIdHandler
);

export default router;
