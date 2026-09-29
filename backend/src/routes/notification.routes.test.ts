import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole, AppointmentStatus } from "@prisma/client";
import { app } from "../server";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { notificationService } from "../services/notification.service";
import { appointmentService } from "../services/appointment.service";
import { doctorAppointmentService } from "../services/doctor-appointment.service";
import { prescriptionService } from "../services/prescription.service";

// Mock Prisma client to isolate unit and integration tests
jest.mock("../lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
    doctor: {
      findUnique: jest.fn(),
    },
    doctorAvailability: {
      findMany: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
    },
    prescription: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const mockNotification = prisma.notification as jest.Mocked<typeof prisma.notification>;
const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;
const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;
const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockAvailability = prisma.doctorAvailability as jest.Mocked<typeof prisma.doctorAvailability>;
const mockConsultation = prisma.consultation as jest.Mocked<typeof prisma.consultation>;
const mockPrescription = prisma.prescription as jest.Mocked<typeof prisma.prescription>;

describe("Notification API - /api/notifications", () => {
  const patientUserId = "patient-uuid-101";
  const doctorUserId = "doctor-uuid-202";
  const adminUserId = "admin-uuid-303";
  const otherUserId = "other-user-uuid-999";

  const validNotificationId = "123e4567-e89b-12d3-a456-426614174000";
  const otherNotificationId = "987e6543-e21b-12d3-a456-426614174999";

  let patientToken: string;
  let doctorToken: string;
  let adminToken: string;

  beforeAll(() => {
    patientToken = jwt.sign(
      { id: patientUserId, role: UserRole.PATIENT },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    doctorToken = jwt.sign(
      { id: doctorUserId, role: UserRole.DOCTOR },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    adminToken = jwt.sign(
      { id: adminUserId, role: UserRole.ADMIN },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // GET /api/notifications/my
  // ==========================================
  describe("GET /api/notifications/my", () => {
    it("should return notifications for authenticated PATIENT sorted newest first", async () => {
      const mockNotifications = [
        {
          id: validNotificationId,
          userId: patientUserId,
          title: "Appointment Reminder",
          message: "You have an appointment tomorrow",
          isRead: false,
          createdAt: new Date("2026-09-29T10:00:00.000Z"),
          updatedAt: new Date("2026-09-29T10:00:00.000Z"),
        },
        {
          id: "old-notification-id",
          userId: patientUserId,
          title: "Welcome",
          message: "Welcome to MediFlow",
          isRead: true,
          createdAt: new Date("2026-09-28T10:00:00.000Z"),
          updatedAt: new Date("2026-09-28T10:00:00.000Z"),
        },
      ];

      mockNotification.findMany.mockResolvedValueOnce(mockNotifications as any);

      const response = await request(app)
        .get("/api/notifications/my")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].id).toBe(validNotificationId);

      expect(mockNotification.findMany).toHaveBeenCalledWith({
        where: { userId: patientUserId },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return notifications for authenticated DOCTOR", async () => {
      const mockDoctorNotifications = [
        {
          id: "doc-notif-1",
          userId: doctorUserId,
          title: "New Appointment Request",
          message: "New appointment requested",
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockNotification.findMany.mockResolvedValueOnce(mockDoctorNotifications as any);

      const response = await request(app)
        .get("/api/notifications/my")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe(doctorUserId);

      expect(mockNotification.findMany).toHaveBeenCalledWith({
        where: { userId: doctorUserId },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return notifications for authenticated ADMIN", async () => {
      const mockAdminNotifications = [
        {
          id: "admin-notif-1",
          userId: adminUserId,
          title: "System Alert",
          message: "Daily backup completed",
          isRead: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockNotification.findMany.mockResolvedValueOnce(mockAdminNotifications as any);

      const response = await request(app)
        .get("/api/notifications/my")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe(adminUserId);
    });

    it("should return empty array when user has no notifications", async () => {
      mockNotification.findMany.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/api/notifications/my")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toEqual([]);
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/notifications/my");
      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // PATCH /api/notifications/:id/read
  // ==========================================
  describe("PATCH /api/notifications/:id/read", () => {
    it("should allow user to mark their own notification as read", async () => {
      mockNotification.findFirst.mockResolvedValueOnce({
        id: validNotificationId,
        userId: patientUserId,
        title: "Appointment Reminder",
        message: "You have an appointment",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockNotification.update.mockResolvedValueOnce({
        id: validNotificationId,
        userId: patientUserId,
        title: "Appointment Reminder",
        message: "You have an appointment",
        isRead: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app)
        .patch(`/api/notifications/${validNotificationId}/read`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Notification marked as read");
      expect(response.body.data.isRead).toBe(true);

      expect(mockNotification.findFirst).toHaveBeenCalledWith({
        where: {
          id: validNotificationId,
          userId: patientUserId,
        },
      });
      expect(mockNotification.update).toHaveBeenCalledWith({
        where: { id: validNotificationId },
        data: { isRead: true },
      });
    });

    it("should return HTTP 404 when attempting to mark another user's notification as read (IDOR protection)", async () => {
      // FindFirst returns null because notification belongs to another user
      mockNotification.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`/api/notifications/${otherNotificationId}/read`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Notification not found");
      expect(mockNotification.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 for non-existent notification ID", async () => {
      mockNotification.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`/api/notifications/${validNotificationId}/read`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Notification not found");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .patch("/api/notifications/invalid-uuid-format/read")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).patch(
        `/api/notifications/${validNotificationId}/read`
      );
      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // DELETE /api/notifications/:id
  // ==========================================
  describe("DELETE /api/notifications/:id", () => {
    it("should allow notification owner to delete their notification", async () => {
      mockNotification.findFirst.mockResolvedValueOnce({
        id: validNotificationId,
        userId: patientUserId,
        title: "Appointment Reminder",
        message: "You have an appointment",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockNotification.delete.mockResolvedValueOnce({
        id: validNotificationId,
      } as any);

      const response = await request(app)
        .delete(`/api/notifications/${validNotificationId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Notification deleted successfully");

      expect(mockNotification.findFirst).toHaveBeenCalledWith({
        where: {
          id: validNotificationId,
          userId: patientUserId,
        },
      });
      expect(mockNotification.delete).toHaveBeenCalledWith({
        where: { id: validNotificationId },
      });
    });

    it("should return HTTP 404 when attempting to delete another user's notification (IDOR protection)", async () => {
      mockNotification.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/notifications/${otherNotificationId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Notification not found");
      expect(mockNotification.delete).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 for non-existent notification", async () => {
      mockNotification.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/notifications/${validNotificationId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Notification not found");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .delete("/api/notifications/invalid-uuid-format")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).delete(
        `/api/notifications/${validNotificationId}`
      );
      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // Notification Creation Service Tests
  // ==========================================
  describe("NotificationService - Internal creation", () => {
    it("should create a notification via internal service call", async () => {
      const input = {
        userId: patientUserId,
        title: "Test Notification",
        message: "Test Message Content",
      };

      const expectedNotification = {
        id: validNotificationId,
        userId: input.userId,
        title: input.title,
        message: input.message,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotification.create.mockResolvedValueOnce(expectedNotification as any);

      const result = await notificationService.createNotification(input);

      expect(result).toBeDefined();
      expect(result?.id).toBe(validNotificationId);
      expect(result?.title).toBe(input.title);
      expect(mockNotification.create).toHaveBeenCalledWith({
        data: {
          userId: input.userId,
          title: input.title,
          message: input.message,
        },
      });
    });

    it("should log error with console.error and return null without throwing when createNotification fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockNotification.create.mockRejectedValueOnce(
        new Error("Database connection error")
      );

      const input = {
        userId: patientUserId,
        title: "Test Notification",
        message: "Test Message Content",
      };

      const result = await notificationService.createNotification(input);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to create notification:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  // ==========================================
  // Workflow Integration Verification
  // ==========================================
  describe("Workflow Integration", () => {
    it("should trigger notification creation on appointment booking", async () => {
      const futureDate = "2027-06-10T00:00:00.000Z";
      const startTime = "2027-06-10T10:00:00.000Z";
      const endTime = "2027-06-10T10:30:00.000Z";

      mockPatient.findUnique.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
      } as any);

      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
      } as any);

      mockAvailability.findMany.mockResolvedValueOnce([
        {
          id: "slot-1",
          doctorId: "doc-1",
          dayOfWeek: 4,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        } as any,
      ]);

      mockAppointment.findMany.mockResolvedValueOnce([]);
      mockAppointment.findMany.mockResolvedValueOnce([]);

      mockAppointment.create.mockResolvedValueOnce({
        id: "app-1",
        patientId: "pat-1",
        doctorId: "doc-1",
        appointmentDate: new Date(futureDate),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: AppointmentStatus.PENDING,
      } as any);

      mockNotification.create.mockResolvedValueOnce({
        id: validNotificationId,
        userId: doctorUserId,
        title: "New Appointment Request",
        message: `New appointment requested for ${new Date(futureDate).toISOString()}`,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await appointmentService.createAppointment(patientUserId, {
        doctorId: "doc-1",
        appointmentDate: new Date(futureDate),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });

      expect(mockNotification.create).toHaveBeenCalledWith({
        data: {
          userId: doctorUserId,
          title: "New Appointment Request",
          message: expect.stringContaining("New appointment requested"),
        },
      });
    });

    it("should trigger notification creation when doctor updates appointment status", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: "app-1",
        doctorId: "doc-1",
        status: AppointmentStatus.PENDING,
      } as any);

      mockAppointment.update.mockResolvedValueOnce({
        id: "app-1",
        status: AppointmentStatus.CONFIRMED,
        patient: {
          userId: patientUserId,
        },
      } as any);

      mockNotification.create.mockResolvedValueOnce({
        id: validNotificationId,
        userId: patientUserId,
        title: "Appointment CONFIRMED",
        message: "Your appointment status has been updated to CONFIRMED",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await doctorAppointmentService.updateAppointmentStatus(doctorUserId, "app-1", {
        status: AppointmentStatus.CONFIRMED,
      });

      expect(mockNotification.create).toHaveBeenCalledWith({
        data: {
          userId: patientUserId,
          title: "Appointment CONFIRMED",
          message: expect.stringContaining("CONFIRMED"),
        },
      });
    });

    it("should trigger notification creation when doctor creates a prescription", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce({
        id: "consult-1",
        doctorId: "doc-1",
        appointment: {
          patientId: "pat-1",
        },
      } as any);

      mockPrescription.findUnique.mockResolvedValueOnce(null);

      mockPrescription.create.mockResolvedValueOnce({
        id: "rx-1",
        consultationId: "consult-1",
        doctorId: "doc-1",
        patientId: "pat-1",
        patient: {
          userId: patientUserId,
        },
      } as any);

      mockNotification.create.mockResolvedValueOnce({
        id: validNotificationId,
        userId: patientUserId,
        title: "New Prescription Issued",
        message: "A new prescription has been issued for your consultation.",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await prescriptionService.createPrescription(doctorUserId, {
        consultationId: "consult-1",
        items: [
          {
            medicationName: "Amoxicillin",
            dosage: "500mg",
            frequency: "3x daily",
            duration: "7 days",
          },
        ],
      });

      expect(mockNotification.create).toHaveBeenCalledWith({
        data: {
          userId: patientUserId,
          title: "New Prescription Issued",
          message: expect.stringContaining("new prescription"),
        },
      });
    });

    it("should allow workflow operations to succeed even if notification creation fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: "app-1",
        doctorId: "doc-1",
        status: AppointmentStatus.PENDING,
      } as any);

      mockAppointment.update.mockResolvedValueOnce({
        id: "app-1",
        status: AppointmentStatus.CONFIRMED,
        patient: {
          userId: patientUserId,
        },
      } as any);

      // Simulate Notification DB failure
      mockNotification.create.mockRejectedValueOnce(
        new Error("Notification DB error")
      );

      const result = await doctorAppointmentService.updateAppointmentStatus(
        doctorUserId,
        "app-1",
        { status: AppointmentStatus.CONFIRMED }
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to create notification:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
