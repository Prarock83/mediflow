import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createPatientProfileSchema,
  updatePatientProfileSchema,
} from "../schemas/patient.schema";
import {
  createPatientProfileHandler,
  getPatientProfileHandler,
  updatePatientProfileHandler,
} from "../controllers/patient.controller";

const router = Router();

// Apply requireAuth and requireRole(UserRole.PATIENT) for all patient profile routes
router.use(requireAuth, requireRole(UserRole.PATIENT));

// POST /api/patients/profile
router.post(
  "/profile",
  validate(createPatientProfileSchema, "body"),
  createPatientProfileHandler
);

// GET /api/patients/me
router.get("/me", getPatientProfileHandler);

// PUT /api/patients/me
router.put(
  "/me",
  validate(updatePatientProfileSchema, "body"),
  updatePatientProfileHandler
);

export default router;
