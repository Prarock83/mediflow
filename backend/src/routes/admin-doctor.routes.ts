import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  adminDoctorQuerySchema,
  adminDoctorIdParamSchema,
  updateDoctorStatusSchema,
} from "../schemas/admin-doctor.schema";
import {
  getDoctorsHandler,
  getDoctorByIdHandler,
  updateDoctorStatusHandler,
} from "../controllers/admin-doctor.controller";

const router = Router();

// Enforce requireAuth and requireRole(UserRole.ADMIN) on all admin doctor routes
router.use(requireAuth, requireRole(UserRole.ADMIN));

// GET /api/admin/doctors
router.get(
  "/",
  validate(adminDoctorQuerySchema, "query"),
  getDoctorsHandler
);

// GET /api/admin/doctors/:id
router.get(
  "/:id",
  validate(adminDoctorIdParamSchema, "params"),
  getDoctorByIdHandler
);

// PATCH /api/admin/doctors/:id/status
router.patch(
  "/:id/status",
  validate(adminDoctorIdParamSchema, "params"),
  validate(updateDoctorStatusSchema, "body"),
  updateDoctorStatusHandler
);

export default router;
