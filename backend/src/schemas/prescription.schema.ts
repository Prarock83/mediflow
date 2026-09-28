import { z } from "zod";

export const prescriptionItemSchema = z.object({
  medicationName: z
    .string()
    .trim()
    .min(1, "Medication name is required"),
  dosage: z
    .string()
    .trim()
    .min(1, "Dosage is required"),
  frequency: z
    .string()
    .trim()
    .min(1, "Frequency is required"),
  duration: z
    .string()
    .trim()
    .min(1, "Duration is required"),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

export const createPrescriptionSchema = z.object({
  consultationId: z
    .string()
    .trim()
    .min(1, "Consultation ID is required"),
  instructions: z
    .string()
    .trim()
    .min(1, "Instructions cannot be empty")
    .optional(),
  items: z
    .array(prescriptionItemSchema)
    .min(1, "At least one prescription item is required"),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const prescriptionIdParamSchema = z.object({
  id: z.string().uuid("Invalid prescription ID format"),
});

export type PrescriptionIdParam = z.infer<typeof prescriptionIdParamSchema>;
