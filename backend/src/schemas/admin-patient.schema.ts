import { z } from "zod";

export const adminPatientQuerySchema = z.object({
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
  gender: z.string().trim().optional(),
  bloodGroup: z.string().trim().optional(),
});

export type AdminPatientQueryInput = z.infer<typeof adminPatientQuerySchema>;

export const adminPatientIdParamSchema = z.object({
  id: z.string().uuid("Invalid patient ID format"),
});

export type AdminPatientIdParam = z.infer<typeof adminPatientIdParamSchema>;

export const updatePatientStatusSchema = z.object({
  isActive: z.boolean({
    message: "isActive must be a boolean",
  }),
});

export type UpdatePatientStatusInput = z.infer<typeof updatePatientStatusSchema>;
