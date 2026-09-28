import { z } from "zod";

const isoDateSchema = z
  .union([z.string(), z.date()])
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format",
  })
  .transform((val) => new Date(val));

export const createMedicalRecordSchema = z
  .object({
    appointmentId: z
      .string()
      .trim()
      .min(1, "Appointment ID is required")
      .optional(),
    patientId: z
      .string()
      .trim()
      .min(1, "Patient ID is required")
      .optional(),
    title: z
      .string()
      .trim()
      .min(1, "Title is required"),
    description: z
      .string()
      .trim()
      .min(1, "Description cannot be empty")
      .optional(),
    recordDate: isoDateSchema.optional(),
  })
  .refine((data) => Boolean(data.appointmentId || data.patientId), {
    message: "Either appointmentId or patientId must be provided",
    path: ["patientId"],
  });

export type CreateMedicalRecordInput = z.infer<
  typeof createMedicalRecordSchema
>;

export const updateMedicalRecordSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, "Description cannot be empty")
    .optional(),
  recordDate: isoDateSchema.optional(),
});

export type UpdateMedicalRecordInput = z.infer<
  typeof updateMedicalRecordSchema
>;

export const medicalRecordIdParamSchema = z.object({
  id: z.string().uuid("Invalid medical record ID format"),
});

export type MedicalRecordIdParam = z.infer<
  typeof medicalRecordIdParamSchema
>;
