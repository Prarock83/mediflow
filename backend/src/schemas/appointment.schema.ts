import { z } from "zod";

const isoDateSchema = z
  .union([z.string(), z.date()])
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format",
  })
  .transform((val) => new Date(val));

export const createAppointmentSchema = z
  .object({
    doctorId: z
      .string()
      .trim()
      .min(1, "Doctor ID is required"),
    appointmentDate: isoDateSchema,
    startTime: isoDateSchema,
    endTime: isoDateSchema,
    reason: z
      .string()
      .trim()
      .min(1, "Reason cannot be empty")
      .optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be earlier than endTime",
    path: ["endTime"],
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
