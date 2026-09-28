import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createPrescriptionSchema,
  prescriptionIdParamSchema,
} from "../schemas/prescription.schema";
import {
  createPrescriptionHandler,
  getPrescriptionByIdHandler,
  getMyPrescriptionsHandler,
} from "../controllers/prescription.controller";

const router = Router();

// Apply requireAuth for all prescription routes
router.use(requireAuth);

// GET /api/prescriptions/my (Patient or Doctor) - registered before /:id
router.get(
  "/my",
  requireRole(UserRole.PATIENT, UserRole.DOCTOR),
  getMyPrescriptionsHandler
);

// GET /api/prescriptions/:id (Patient or Doctor)
router.get(
  "/:id",
  validate(prescriptionIdParamSchema, "params"),
  getPrescriptionByIdHandler
);

// POST /api/prescriptions (Doctor only)
router.post(
  "/",
  requireRole(UserRole.DOCTOR),
  validate(createPrescriptionSchema, "body"),
  createPrescriptionHandler
);

export default router;
