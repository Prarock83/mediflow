import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { notificationIdParamSchema } from "../schemas/notification.schema";
import {
  getMyNotificationsHandler,
  markNotificationAsReadHandler,
  deleteNotificationHandler,
} from "../controllers/notification.controller";

const router = Router();

// Apply requireAuth and requireRole for PATIENT, DOCTOR, ADMIN for all notification routes
router.use(
  requireAuth,
  requireRole(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
);

// GET /api/notifications/my
router.get("/my", getMyNotificationsHandler);

// PATCH /api/notifications/:id/read
router.patch(
  "/:id/read",
  validate(notificationIdParamSchema, "params"),
  markNotificationAsReadHandler
);

// DELETE /api/notifications/:id
router.delete(
  "/:id",
  validate(notificationIdParamSchema, "params"),
  deleteNotificationHandler
);

export default router;
