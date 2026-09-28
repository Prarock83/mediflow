import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createConsultationSchema,
  consultationIdParamSchema,
} from "../schemas/consultation.schema";
import {
  createConsultationHandler,
  getConsultationByIdHandler,
  getMyConsultationsHandler,
} from "../controllers/consultation.controller";

const router = Router();

// Apply requireAuth for all consultation routes
router.use(requireAuth);

// GET /api/consultations/my (Patient or Doctor)
router.get(
  "/my",
  requireRole(UserRole.PATIENT, UserRole.DOCTOR),
  getMyConsultationsHandler
);

// GET /api/consultations/:id (Patient or Doctor)
router.get(
  "/:id",
  validate(consultationIdParamSchema, "params"),
  getConsultationByIdHandler
);

// POST /api/consultations (Doctor only)
router.post(
  "/",
  requireRole(UserRole.DOCTOR),
  validate(createConsultationSchema, "body"),
  createConsultationHandler
);

export default router;
