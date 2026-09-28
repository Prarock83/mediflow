import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  medicalRecordIdParamSchema,
} from "../schemas/medical-record.schema";
import {
  createMedicalRecordHandler,
  getMedicalRecordByIdHandler,
  getMyMedicalRecordsHandler,
  updateMedicalRecordHandler,
} from "../controllers/medical-record.controller";

const router = Router();

// Apply requireAuth for all medical record routes
router.use(requireAuth);

// GET /api/medical-records/my (Patient or Doctor) - registered before /:id
router.get(
  "/my",
  requireRole(UserRole.PATIENT, UserRole.DOCTOR),
  getMyMedicalRecordsHandler
);

// GET /api/medical-records/:id (Patient or Doctor)
router.get(
  "/:id",
  validate(medicalRecordIdParamSchema, "params"),
  getMedicalRecordByIdHandler
);

// POST /api/medical-records (Doctor only)
router.post(
  "/",
  requireRole(UserRole.DOCTOR),
  validate(createMedicalRecordSchema, "body"),
  createMedicalRecordHandler
);

// PUT /api/medical-records/:id (Doctor only)
router.put(
  "/:id",
  requireRole(UserRole.DOCTOR),
  validate(medicalRecordIdParamSchema, "params"),
  validate(updateMedicalRecordSchema, "body"),
  updateMedicalRecordHandler
);

export default router;
