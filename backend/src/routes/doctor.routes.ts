import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createDoctorProfileSchema,
  updateDoctorProfileSchema,
  createDoctorAvailabilitySchema,
  updateDoctorAvailabilitySchema,
  availabilityIdParamSchema,
  patientDoctorQuerySchema,
  doctorIdParamSchema,
  doctorIdSlotsParamSchema,
  doctorSlotsQuerySchema,
} from "../schemas/doctor.schema";
import {
  createDoctorProfileHandler,
  getDoctorProfileHandler,
  updateDoctorProfileHandler,
  createDoctorAvailabilityHandler,
  getDoctorAvailabilitiesHandler,
  updateDoctorAvailabilityHandler,
  deleteDoctorAvailabilityHandler,
  getPublicDoctorsHandler,
  getPublicDoctorByIdHandler,
  getDoctorSlotsHandler,
} from "../controllers/doctor.controller";

const router = Router();

// ==========================================
// PATIENT-only Doctor Discovery Routes
// ==========================================
router.get(
  "/",
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(patientDoctorQuerySchema, "query"),
  getPublicDoctorsHandler
);

// ==========================================
// PATIENT-only Doctor Slot Generation Route
// ==========================================
router.get(
  "/:doctorId/slots",
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(doctorIdSlotsParamSchema, "params"),
  validate(doctorSlotsQuerySchema, "query"),
  getDoctorSlotsHandler
);

// ==========================================
// DOCTOR-only Self Management Routes
// ==========================================
router.post(
  "/profile",
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(createDoctorProfileSchema, "body"),
  createDoctorProfileHandler
);
router.get(
  "/me",
  requireAuth,
  requireRole(UserRole.DOCTOR),
  getDoctorProfileHandler
);
router.put(
  "/me",
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(updateDoctorProfileSchema, "body"),
  updateDoctorProfileHandler
);

// Doctor Availability routes
router.post(
  "/availability",
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(createDoctorAvailabilitySchema, "body"),
  createDoctorAvailabilityHandler
);
router.get(
  "/availability",
  requireAuth,
  requireRole(UserRole.DOCTOR),
  getDoctorAvailabilitiesHandler
);
router.put(
  "/availability/:id",
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(availabilityIdParamSchema, "params"),
  validate(updateDoctorAvailabilitySchema, "body"),
  updateDoctorAvailabilityHandler
);
router.delete(
  "/availability/:id",
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(availabilityIdParamSchema, "params"),
  deleteDoctorAvailabilityHandler
);

// ==========================================
// PATIENT-only Doctor Lookup by UUID
// (Registered after static subroutes like /me or /availability)
// ==========================================
router.get(
  "/:id",
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(doctorIdParamSchema, "params"),
  getPublicDoctorByIdHandler
);

export default router;
