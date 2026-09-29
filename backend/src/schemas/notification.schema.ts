import { z } from "zod";

export const createNotificationSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, "User ID is required"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required"),
  message: z
    .string()
    .trim()
    .min(1, "Message is required"),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export const notificationIdParamSchema = z.object({
  id: z.string().uuid("Invalid notification ID format"),
});

export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
