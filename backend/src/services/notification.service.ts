import { Notification } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { CreateNotificationInput } from "../schemas/notification.schema";

export class NotificationService {
  /**
   * Internal service method to create a notification for a user.
   * Can be reused by other workflow services (e.g. appointments, prescriptions).
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<Notification | null> {
    if (!prisma.notification) {
      return null;
    }
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          title: input.title,
          message: input.message,
        },
      });
      return notification;
    } catch (error) {
      console.error("Failed to create notification:", error);
      return null;
    }
  }

  /**
   * Get notifications for the authenticated user.
   * Derives ownership strictly from `userId` (req.user.id).
   * Sorted newest first (createdAt: "desc").
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return notifications;
  }

  /**
   * Mark a notification as read.
   * Verifies that the notification exists AND belongs to `userId`.
   * Returns 404 if non-existent or belonging to another user (preventing IDOR leaks).
   */
  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<Notification> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: userId,
      },
    });

    if (!notification) {
      const error: AppError = new Error("Notification not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updatedNotification;
  }

  /**
   * Delete a notification.
   * Verifies that the notification exists AND belongs to `userId`.
   * Returns 404 if non-existent or belonging to another user.
   */
  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<{ message: string }> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: userId,
      },
    });

    if (!notification) {
      const error: AppError = new Error("Notification not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: "Notification deleted successfully" };
  }
}

export const notificationService = new NotificationService();
