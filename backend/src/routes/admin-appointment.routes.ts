import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  adminAppointmentQuerySchema,
  adminAppointmentIdParamSchema,
  updateAppointmentStatusSchema,
} from "../schemas/admin-appointment.schema";
import {
  getAppointmentsHandler,
  getAppointmentByIdHandler,
  updateAppointmentStatusHandler,
} from "../controllers/admin-appointment.controller";

const router = Router();

// Enforce requireAuth and requireRole(UserRole.ADMIN) on all admin appointment routes
router.use(requireAuth, requireRole(UserRole.ADMIN));

// GET /api/admin/appointments
router.get(
  "/",
  validate(adminAppointmentQuerySchema, "query"),
  getAppointmentsHandler
);

// GET /api/admin/appointments/:id
router.get(
  "/:id",
  validate(adminAppointmentIdParamSchema, "params"),
  getAppointmentByIdHandler
);

// PATCH /api/admin/appointments/:id/status
router.patch(
  "/:id/status",
  validate(adminAppointmentIdParamSchema, "params"),
  validate(updateAppointmentStatusSchema, "body"),
  updateAppointmentStatusHandler
);

export default router;
