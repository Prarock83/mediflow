import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long"),
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"], {
    message: "Role must be one of PATIENT, DOCTOR, or ADMIN",
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
