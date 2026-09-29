import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

const isoDateSchema = z
  .union([z.string(), z.date()])
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format",
  })
  .transform((val) => new Date(val));

export const adminAppointmentQuerySchema = z.object({
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
  status: z
    .nativeEnum(AppointmentStatus, { message: "Invalid appointment status" })
    .optional(),
  doctorId: z.string().trim().optional(),
  patientId: z.string().trim().optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  search: z.string().trim().optional(),
});

export type AdminAppointmentQueryInput = z.infer<
  typeof adminAppointmentQuerySchema
>;

export const adminAppointmentIdParamSchema = z.object({
  id: z.string().uuid("Invalid appointment ID format"),
});

export type AdminAppointmentIdParam = z.infer<
  typeof adminAppointmentIdParamSchema
>;

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus, {
    message: "Invalid appointment status",
  }),
});

export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>;
