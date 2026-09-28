import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus, {
    message: "Invalid appointment status",
  }),
});

export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>;

export const doctorAppointmentQuerySchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  date: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: "Invalid date format",
    }),
});

export type DoctorAppointmentQueryInput = z.infer<
  typeof doctorAppointmentQuerySchema
>;

export const doctorAppointmentIdParamSchema = z.object({
  id: z.string().uuid("Invalid appointment ID format"),
});

export type DoctorAppointmentIdParam = z.infer<
  typeof doctorAppointmentIdParamSchema
>;
