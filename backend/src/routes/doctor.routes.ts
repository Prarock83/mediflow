import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createDoctorProfileSchema,
  updateDoctorProfileSchema,
} from "../schemas/doctor.schema";
import {
  createDoctorProfileHandler,
  getDoctorProfileHandler,
  updateDoctorProfileHandler,
} from "../controllers/doctor.controller";

const router = Router();

// Apply requireAuth and requireRole(UserRole.DOCTOR) for all doctor profile routes
router.use(requireAuth, requireRole(UserRole.DOCTOR));

// POST /api/doctors/profile
router.post(
  "/profile",
  validate(createDoctorProfileSchema, "body"),
  createDoctorProfileHandler
);

// GET /api/doctors/me
router.get("/me", getDoctorProfileHandler);

// PUT /api/doctors/me
router.put(
  "/me",
  validate(updateDoctorProfileSchema, "body"),
  updateDoctorProfileHandler
);

export default router;
