import { z } from "zod";
import { UserRole } from "@prisma/client";

export const adminUserQuerySchema = z.object({
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
  role: z.nativeEnum(UserRole, { message: "Invalid user role" }).optional(),
  search: z.string().trim().optional(),
});

export type AdminUserQueryInput = z.infer<typeof adminUserQuerySchema>;

export const adminUserIdParamSchema = z.object({
  id: z.string().uuid("Invalid user ID format"),
});

export type AdminUserIdParam = z.infer<typeof adminUserIdParamSchema>;
