import { z } from "zod";

const isoDateSchema = z
  .union([z.string(), z.date()])
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format",
  })
  .transform((val) => new Date(val));

export const adminAuditLogQuerySchema = z.object({
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
  userId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
});

export type AdminAuditLogQueryInput = z.infer<typeof adminAuditLogQuerySchema>;

export const adminAuditLogIdParamSchema = z.object({
  id: z.string().uuid("Invalid audit log ID format"),
});

export type AdminAuditLogIdParam = z.infer<typeof adminAuditLogIdParamSchema>;

export const createAuditLogSchema = z.object({
  userId: z.string().trim().optional(),
  action: z.string().trim().min(1, "Action is required"),
  entity: z.string().trim().min(1, "Entity is required"),
  entityId: z.string().trim().optional(),
  details: z.string().trim().optional(),
  ipAddress: z.string().trim().optional(),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
