import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  adminPatientQuerySchema,
  adminPatientIdParamSchema,
  updatePatientStatusSchema,
} from "../schemas/admin-patient.schema";
import {
  getPatientsHandler,
  getPatientByIdHandler,
  updatePatientStatusHandler,
} from "../controllers/admin-patient.controller";

const router = Router();

// Enforce requireAuth and requireRole(UserRole.ADMIN) on all admin patient routes
router.use(requireAuth, requireRole(UserRole.ADMIN));

// GET /api/admin/patients
router.get(
  "/",
  validate(adminPatientQuerySchema, "query"),
  getPatientsHandler
);

// GET /api/admin/patients/:id
router.get(
  "/:id",
  validate(adminPatientIdParamSchema, "params"),
  getPatientByIdHandler
);

// PATCH /api/admin/patients/:id/status
router.patch(
  "/:id/status",
  validate(adminPatientIdParamSchema, "params"),
  validate(updatePatientStatusSchema, "body"),
  updatePatientStatusHandler
);

export default router;
