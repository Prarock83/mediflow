import { z } from "zod";

const dateSchema = z
  .union([z.string(), z.date()])
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format for dateOfBirth",
  })
  .transform((val) => new Date(val))
  .optional();

export const createPatientProfileSchema = z.object({
  dateOfBirth: dateSchema,
  gender: z
    .string()
    .trim()
    .min(1, "Gender cannot be empty")
    .optional(),
  bloodGroup: z
    .string()
    .trim()
    .min(1, "Blood group cannot be empty")
    .optional(),
  address: z
    .string()
    .trim()
    .min(1, "Address cannot be empty")
    .optional(),
  emergencyContact: z
    .string()
    .trim()
    .min(1, "Emergency contact cannot be empty")
    .optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientProfileSchema>;

export const updatePatientProfileSchema = createPatientProfileSchema;

export type UpdatePatientInput = z.infer<typeof updatePatientProfileSchema>;
