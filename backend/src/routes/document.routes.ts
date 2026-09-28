import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createDocumentSchema,
  documentIdParamSchema,
  medicalRecordIdParamSchema,
} from "../schemas/document.schema";
import {
  createDocumentHandler,
  getDocumentByIdHandler,
  getDocumentsByMedicalRecordIdHandler,
  deleteDocumentHandler,
} from "../controllers/document.controller";

const router = Router();

// Apply requireAuth and requireRole(UserRole.PATIENT, UserRole.DOCTOR) for all document routes
router.use(requireAuth, requireRole(UserRole.PATIENT, UserRole.DOCTOR));

// GET /api/documents/medical-record/:medicalRecordId (registered before /:id)
router.get(
  "/medical-record/:medicalRecordId",
  validate(medicalRecordIdParamSchema, "params"),
  getDocumentsByMedicalRecordIdHandler
);

// GET /api/documents/:id
router.get(
  "/:id",
  validate(documentIdParamSchema, "params"),
  getDocumentByIdHandler
);

// POST /api/documents
router.post(
  "/",
  validate(createDocumentSchema, "body"),
  createDocumentHandler
);

// DELETE /api/documents/:id
router.delete(
  "/:id",
  validate(documentIdParamSchema, "params"),
  deleteDocumentHandler
);

export default router;
