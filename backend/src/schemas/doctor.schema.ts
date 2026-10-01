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

const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

export const createDoctorAvailabilitySchema = z
  .object({
    dayOfWeek: z
      .number({ message: "dayOfWeek must be a number" })
      .int("dayOfWeek must be an integer")
      .min(0, "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)")
      .max(6, "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)"),
    startTime: z
      .string()
      .trim()
      .regex(timeRegex, "startTime must be in HH:mm 24-hour format"),
    endTime: z
      .string()
      .trim()
      .regex(timeRegex, "endTime must be in HH:mm 24-hour format"),
    slotDuration: z
      .number({ message: "slotDuration must be a number" })
      .int("slotDuration must be an integer")
      .positive("slotDuration must be positive")
      .optional(),
    isAvailable: z
      .boolean({ message: "isAvailable must be a boolean" })
      .optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be earlier than endTime",
    path: ["endTime"],
  });

export type CreateDoctorAvailabilityInput = z.infer<typeof createDoctorAvailabilitySchema>;

export const updateDoctorAvailabilitySchema = z
  .object({
    dayOfWeek: z
      .number({ message: "dayOfWeek must be a number" })
      .int("dayOfWeek must be an integer")
      .min(0, "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)")
      .max(6, "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)")
      .optional(),
    startTime: z
      .string()
      .trim()
      .regex(timeRegex, "startTime must be in HH:mm 24-hour format")
      .optional(),
    endTime: z
      .string()
      .trim()
      .regex(timeRegex, "endTime must be in HH:mm 24-hour format")
      .optional(),
    slotDuration: z
      .number({ message: "slotDuration must be a number" })
      .int("slotDuration must be an integer")
      .positive("slotDuration must be positive")
      .optional(),
    isAvailable: z
      .boolean({ message: "isAvailable must be a boolean" })
      .optional(),
  });

export type UpdateDoctorAvailabilityInput = z.infer<typeof updateDoctorAvailabilitySchema>;

export const availabilityIdParamSchema = z.object({
  id: z.string().uuid("Invalid availability ID format"),
});

export type AvailabilityIdParam = z.infer<typeof availabilityIdParamSchema>;

export const doctorIdParamSchema = z.object({
  id: z.string().uuid("Invalid doctor ID format"),
});

export type DoctorIdParam = z.infer<typeof doctorIdParamSchema>;

export const patientDoctorQuerySchema = z.object({
  page: z
    .preprocess(
      (val) => (val !== undefined && val !== "" ? Number(val) : 1),
      z.number().int("Page must be an integer").min(1, "Page must be at least 1")
    )
    .default(1),
  limit: z
    .preprocess(
      (val) => (val !== undefined && val !== "" ? Number(val) : 20),
      z
        .number()
        .int("Limit must be an integer")
        .min(1, "Limit must be at least 1")
        .max(100, "Limit cannot exceed 100")
    )
    .default(20),
  search: z.string().trim().optional(),
  specializationId: z.string().trim().optional(),
  minExperience: z
    .preprocess(
      (val) => (val !== undefined && val !== "" ? Number(val) : undefined),
      z
        .number({ message: "minExperience must be a number" })
        .int("minExperience must be an integer")
        .min(0, "minExperience cannot be negative")
        .optional()
    )
    .optional(),
  maxFee: z
    .preprocess(
      (val) => (val !== undefined && val !== "" ? Number(val) : undefined),
      z
        .number({ message: "maxFee must be a number" })
        .min(0, "maxFee cannot be negative")
        .optional()
    )
    .optional(),
  maxConsultationFee: z
    .preprocess(
      (val) => (val !== undefined && val !== "" ? Number(val) : undefined),
      z
        .number({ message: "maxConsultationFee must be a number" })
        .min(0, "maxConsultationFee cannot be negative")
        .optional()
    )
    .optional(),
  sortBy: z
    .enum(["newest", "experience", "consultationFee"])
    .optional(),
  sort: z
    .enum(["newest", "experience", "consultationFee"])
    .optional(),
});

export type PatientDoctorQueryInput = z.infer<typeof patientDoctorQuerySchema>;

export const doctorIdSlotsParamSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID format"),
});

export type DoctorIdSlotsParam = z.infer<typeof doctorIdSlotsParamSchema>;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const doctorSlotsQuerySchema = z.object({
  date: z
    .string({ message: "Date parameter is required" })
    .trim()
    .min(1, "Date parameter is required")
    .regex(dateRegex, "Invalid date format. Expected YYYY-MM-DD")
    .refine(
      (dateStr) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        const parsed = new Date(Date.UTC(year, month - 1, day));
        return (
          parsed.getUTCFullYear() === year &&
          parsed.getUTCMonth() === month - 1 &&
          parsed.getUTCDate() === day
        );
      },
      { message: "Invalid or impossible date" }
    ),
});

export type DoctorSlotsQueryInput = z.infer<typeof doctorSlotsQuerySchema>;
