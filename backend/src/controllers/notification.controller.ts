import { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notification.service";

/**
 * Handler for GET /api/notifications/my
 * Retrieves notifications for the authenticated user.
 */
export const getMyNotificationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = await notificationService.getUserNotifications(userId);

    res.status(200).json({
      status: "success",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for PATCH /api/notifications/:id/read
 * Marks a user's notification as read.
 */
export const markNotificationAsReadHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const updatedNotification = await notificationService.markAsRead(userId, id);

    res.status(200).json({
      status: "success",
      message: "Notification marked as read",
      data: updatedNotification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for DELETE /api/notifications/:id
 * Deletes a user's notification.
 */
export const deleteNotificationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    await notificationService.deleteNotification(userId, id);

    res.status(200).json({
      status: "success",
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
