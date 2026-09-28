import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  updateAppointmentStatusSchema,
  doctorAppointmentQuerySchema,
  doctorAppointmentIdParamSchema,
} from "../schemas/doctor-appointment.schema";
import {
  getDoctorAppointmentsHandler,
  getDoctorAppointmentByIdHandler,
  updateAppointmentStatusHandler,
} from "../controllers/doctor-appointment.controller";

const router = Router();

// Apply requireAuth and requireRole(UserRole.DOCTOR) for all doctor appointment routes
router.use(requireAuth, requireRole(UserRole.DOCTOR));

// GET /api/doctors/appointments
router.get(
  "/",
  validate(doctorAppointmentQuerySchema, "query"),
  getDoctorAppointmentsHandler
);

// GET /api/doctors/appointments/:id
router.get(
  "/:id",
  validate(doctorAppointmentIdParamSchema, "params"),
  getDoctorAppointmentByIdHandler
);

// PATCH /api/doctors/appointments/:id/status
router.patch(
  "/:id/status",
  validate(doctorAppointmentIdParamSchema, "params"),
  validate(updateAppointmentStatusSchema, "body"),
  updateAppointmentStatusHandler
);

export default router;
