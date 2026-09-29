import { z } from "zod";

export const adminDoctorQuerySchema = z.object({
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
  specializationId: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export type AdminDoctorQueryInput = z.infer<typeof adminDoctorQuerySchema>;

export const adminDoctorIdParamSchema = z.object({
  id: z.string().uuid("Invalid doctor ID format"),
});

export type AdminDoctorIdParam = z.infer<typeof adminDoctorIdParamSchema>;

export const updateDoctorStatusSchema = z.object({
  isActive: z.boolean({
    message: "isActive must be a boolean",
  }),
});

export type UpdateDoctorStatusInput = z.infer<typeof updateDoctorStatusSchema>;
