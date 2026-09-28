import { z } from "zod";

export const createConsultationSchema = z.object({
  appointmentId: z
    .string()
    .trim()
    .min(1, "Appointment ID is required"),
  diagnosis: z
    .string()
    .trim()
    .min(1, "Diagnosis is required"),
  notes: z
    .string()
    .trim()
    .min(1, "Notes cannot be empty")
    .optional(),
  symptoms: z
    .string()
    .trim()
    .min(1, "Symptoms cannot be empty")
    .optional(),
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

export const consultationIdParamSchema = z.object({
  id: z.string().uuid("Invalid consultation ID format"),
});

export type ConsultationIdParam = z.infer<typeof consultationIdParamSchema>;
