import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { createAppointmentSchema } from "../schemas/appointment.schema";
import {
  createAppointmentHandler,
  getPatientAppointmentsHandler,
} from "../controllers/appointment.controller";

const router = Router();

// Apply requireAuth and requireRole(UserRole.PATIENT) for all patient appointment routes
router.use(requireAuth, requireRole(UserRole.PATIENT));

// POST /api/appointments
router.post(
  "/",
  validate(createAppointmentSchema, "body"),
  createAppointmentHandler
);

// GET /api/appointments/my
router.get("/my", getPatientAppointmentsHandler);

export default router;
