import { z } from "zod";

export const createDoctorProfileSchema = z.object({
  licenseNumber: z
    .string()
    .trim()
    .min(1, "License number is required"),
  specializationId: z
    .string()
    .trim()
    .min(1, "Specialization ID is required"),
  experienceYears: z
    .number({ message: "Experience years must be a number" })
    .int("Experience years must be an integer")
    .min(0, "Experience years cannot be negative")
    .optional(),
  bio: z
    .string()
    .trim()
    .min(1, "Bio cannot be empty")
    .optional(),
  consultationFee: z
    .number({ message: "Consultation fee must be a number" })
    .min(0, "Consultation fee cannot be negative"),
});

export type CreateDoctorInput = z.infer<typeof createDoctorProfileSchema>;

export const updateDoctorProfileSchema = z.object({
  licenseNumber: z
    .string()
    .trim()
    .min(1, "License number cannot be empty")
    .optional(),
  specializationId: z
    .string()
    .trim()
    .min(1, "Specialization ID cannot be empty")
    .optional(),
  experienceYears: z
    .number({ message: "Experience years must be a number" })
    .int("Experience years must be an integer")
    .min(0, "Experience years cannot be negative")
    .optional(),
  bio: z
    .string()
    .trim()
    .min(1, "Bio cannot be empty")
    .optional(),
  consultationFee: z
    .number({ message: "Consultation fee must be a number" })
    .min(0, "Consultation fee cannot be negative")
    .optional(),
});

export type UpdateDoctorInput = z.infer<typeof updateDoctorProfileSchema>;
