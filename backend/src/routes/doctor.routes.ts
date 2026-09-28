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
} from "../schemas/doctor.schema";
import {
  createDoctorProfileHandler,
  getDoctorProfileHandler,
  updateDoctorProfileHandler,
  createDoctorAvailabilityHandler,
  getDoctorAvailabilitiesHandler,
  updateDoctorAvailabilityHandler,
  deleteDoctorAvailabilityHandler,
} from "../controllers/doctor.controller";

const router = Router();

// Apply requireAuth and requireRole(UserRole.DOCTOR) for all doctor routes
router.use(requireAuth, requireRole(UserRole.DOCTOR));

// Doctor Profile routes
router.post(
  "/profile",
  validate(createDoctorProfileSchema, "body"),
  createDoctorProfileHandler
);
router.get("/me", getDoctorProfileHandler);
router.put(
  "/me",
  validate(updateDoctorProfileSchema, "body"),
  updateDoctorProfileHandler
);

// Doctor Availability routes
router.post(
  "/availability",
  validate(createDoctorAvailabilitySchema, "body"),
  createDoctorAvailabilityHandler
);
router.get("/availability", getDoctorAvailabilitiesHandler);
router.put(
  "/availability/:id",
  validate(availabilityIdParamSchema, "params"),
  validate(updateDoctorAvailabilitySchema, "body"),
  updateDoctorAvailabilityHandler
);
router.delete(
  "/availability/:id",
  validate(availabilityIdParamSchema, "params"),
  deleteDoctorAvailabilityHandler
);

export default router;
