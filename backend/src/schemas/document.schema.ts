import { z } from "zod";

export const createDocumentSchema = z.object({
  medicalRecordId: z
    .string()
    .trim()
    .min(1, "Medical record ID is required"),
  fileName: z
    .string()
    .trim()
    .min(1, "File name is required"),
  fileUrl: z
    .string()
    .trim()
    .min(1, "File URL is required"),
  fileType: z
    .string()
    .trim()
    .min(1, "File type is required"),
  fileSize: z
    .number({ message: "File size must be a number" })
    .int("File size must be an integer")
    .positive("File size must be a positive integer"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const documentIdParamSchema = z.object({
  id: z.string().uuid("Invalid document ID format"),
});

export type DocumentIdParam = z.infer<typeof documentIdParamSchema>;

export const medicalRecordIdParamSchema = z.object({
  medicalRecordId: z.string().uuid("Invalid medical record ID format"),
});

export type MedicalRecordIdParam = z.infer<typeof medicalRecordIdParamSchema>;
