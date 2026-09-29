import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole, AppointmentStatus } from "@prisma/client";
import { app } from "../server";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

// Mock Prisma client to isolate unit/integration tests from actual database
jest.mock("../lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}));

const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;
const mockNotification = prisma.notification as jest.Mocked<typeof prisma.notification>;

describe("Admin Appointment Management API - /api/admin/appointments", () => {
  const adminUserId = "admin-uuid-101";
  const doctorUserId = "doctor-uuid-202";
  const patientUserId = "patient-uuid-303";

  const appointmentId = "123e4567-e89b-12d3-a456-426614174000";
  const doctorId = "doc-1";
  const patientId = "pat-1";

  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;

  const mockAppointmentData = {
    id: appointmentId,
    patientId,
    doctorId,
    appointmentDate: new Date("2027-05-10T00:00:00.000Z"),
    startTime: new Date("2027-05-10T10:00:00.000Z"),
    endTime: new Date("2027-05-10T10:30:00.000Z"),
    status: AppointmentStatus.PENDING,
    reason: "Routine checkup",
    createdAt: new Date("2026-09-29T10:00:00.000Z"),
    updatedAt: new Date("2026-09-29T10:00:00.000Z"),
    patient: {
      id: patientId,
      userId: patientUserId,
      user: {
        id: patientUserId,
        email: "alice.smith@mediflow.com",
        firstName: "Alice",
        lastName: "Smith",
        role: UserRole.PATIENT,
        phoneNumber: "555-0100",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    doctor: {
      id: doctorId,
      userId: doctorUserId,
      licenseNumber: "MD-998877",
      specialization: {
        id: "spec-1",
        name: "General Practice",
      },
      user: {
        id: doctorUserId,
        email: "dr.john@mediflow.com",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.DOCTOR,
        phoneNumber: "555-0199",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  };

  beforeAll(() => {
    adminToken = jwt.sign(
      { id: adminUserId, role: UserRole.ADMIN },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    doctorToken = jwt.sign(
      { id: doctorUserId, role: UserRole.DOCTOR },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    patientToken = jwt.sign(
      { id: patientUserId, role: UserRole.PATIENT },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // Authorization Tests
  // ==========================================
  describe("Authorization & RBAC", () => {
    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/admin/appointments");
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get("/api/admin/appointments")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .get("/api/admin/appointments")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should allow ADMIN role to access global appointment listing with HTTP 200", async () => {
      mockAppointment.count.mockResolvedValueOnce(1);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const response = await request(app)
        .get("/api/admin/appointments")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
    });
  });

  // ==========================================
  // GET /api/admin/appointments - Pagination, Filters & Search
  // ==========================================
  describe("GET /api/admin/appointments - Listing & Filters", () => {
    it("should apply default pagination parameters (page=1, limit=20)", async () => {
      mockAppointment.count.mockResolvedValueOnce(25);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const response = await request(app)
        .get("/api/admin/appointments")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });

      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { startTime: "desc" },
      });
    });

    it("should handle custom valid page and limit parameters", async () => {
      mockAppointment.count.mockResolvedValueOnce(30);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const response = await request(app)
        .get("/api/admin/appointments?page=2&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3,
      });

      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        skip: 10,
        take: 10,
        orderBy: { startTime: "desc" },
      });
    });

    it("should reject limit exceeding maximum limit (limit > 100) with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/appointments?limit=150")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should reject invalid page parameter (page=0 or string) with HTTP 400", async () => {
      const responseZero = await request(app)
        .get("/api/admin/appointments?page=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(responseZero.status).toBe(400);

      const responseString = await request(app)
        .get("/api/admin/appointments?page=abc")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(responseString.status).toBe(400);
    });

    it("should reject invalid limit parameter (limit=0) with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/appointments?limit=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    it("should filter appointments by status", async () => {
      mockAppointment.count.mockResolvedValueOnce(1);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const response = await request(app)
        .get("/api/admin/appointments?status=PENDING")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: { status: AppointmentStatus.PENDING },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { startTime: "desc" },
      });
    });

    it("should filter appointments by doctorId", async () => {
      mockAppointment.count.mockResolvedValueOnce(1);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const response = await request(app)
        .get(`/api/admin/appointments?doctorId=${doctorId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: { doctorId },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { startTime: "desc" },
      });
    });

    it("should filter appointments by patientId", async () => {
      mockAppointment.count.mockResolvedValueOnce(1);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const response = await request(app)
        .get(`/api/admin/appointments?patientId=${patientId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: { patientId },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { startTime: "desc" },
      });
    });

    it("should filter appointments by dateFrom and dateTo range", async () => {
      mockAppointment.count.mockResolvedValueOnce(1);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const dateFrom = "2027-05-01T00:00:00.000Z";
      const dateTo = "2027-05-31T23:59:59.999Z";

      const response = await request(app)
        .get(`/api/admin/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: {
          appointmentDate: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo),
          },
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { startTime: "desc" },
      });
    });

    it("should search appointments by doctor or patient name/email", async () => {
      mockAppointment.count.mockResolvedValueOnce(1);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const response = await request(app)
        .get("/api/admin/appointments?search=Alice")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { patient: { user: { firstName: { contains: "Alice", mode: "insensitive" } } } },
            { patient: { user: { lastName: { contains: "Alice", mode: "insensitive" } } } },
            { patient: { user: { email: { contains: "Alice", mode: "insensitive" } } } },
            { doctor: { user: { firstName: { contains: "Alice", mode: "insensitive" } } } },
            { doctor: { user: { lastName: { contains: "Alice", mode: "insensitive" } } } },
            { doctor: { user: { email: { contains: "Alice", mode: "insensitive" } } } },
          ],
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { startTime: "desc" },
      });
    });

    it("should return empty results gracefully when no appointments match query", async () => {
      mockAppointment.count.mockResolvedValueOnce(0);
      mockAppointment.findMany.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/api/admin/appointments?search=nonexistent")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  // ==========================================
  // GET /api/admin/appointments/:id - Single Appointment Lookup
  // ==========================================
  describe("GET /api/admin/appointments/:id", () => {
    it("should return appointment details by UUID for ADMIN", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce(mockAppointmentData as any);

      const response = await request(app)
        .get(`/api/admin/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(appointmentId);
      expect(response.body.data.patient.user.email).toBe("alice.smith@mediflow.com");
      expect(response.body.data.doctor.user.email).toBe("dr.john@mediflow.com");
      expect(response.body.data.doctor.specialization.name).toBe("General Practice");

      expect(mockAppointment.findUnique).toHaveBeenCalledWith({
        where: { id: appointmentId },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 404 for non-existent appointment ID", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/admin/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Appointment not found");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .get("/api/admin/appointments/invalid-uuid-format")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });
  });

  // ==========================================
  // PATCH /api/admin/appointments/:id/status - Status Update & Transition Rules
  // ==========================================
  describe("PATCH /api/admin/appointments/:id/status", () => {
    it("should allow ADMIN to perform a valid status transition (PENDING -> CONFIRMED)", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        status: AppointmentStatus.PENDING,
        patient: { userId: patientUserId },
      } as any);

      const updatedData = {
        ...mockAppointmentData,
        status: AppointmentStatus.CONFIRMED,
      };

      mockAppointment.update.mockResolvedValueOnce(updatedData as any);
      mockNotification.create.mockResolvedValueOnce({} as any);

      const response = await request(app)
        .patch(`/api/admin/appointments/${appointmentId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Appointment status updated successfully");
      expect(response.body.data.status).toBe("CONFIRMED");

      expect(mockAppointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CONFIRMED },
        include: expect.any(Object),
      });

      // Verify notification trigger
      expect(mockNotification.create).toHaveBeenCalledWith({
        data: {
          userId: patientUserId,
          title: "Appointment CONFIRMED",
          message: "Your appointment status has been updated to CONFIRMED",
        },
      });
    });

    it("should return HTTP 409 when attempting an invalid status transition (PENDING -> COMPLETED)", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        status: AppointmentStatus.PENDING,
      } as any);

      const response = await request(app)
        .patch(`/api/admin/appointments/${appointmentId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AppointmentStatus.COMPLETED });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        "Invalid appointment status transition from PENDING to COMPLETED"
      );
      expect(mockAppointment.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 409 when attempting to transition from a terminal status (CANCELLED -> CONFIRMED)", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        status: AppointmentStatus.CANCELLED,
      } as any);

      const response = await request(app)
        .patch(`/api/admin/appointments/${appointmentId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        "Invalid appointment status transition from CANCELLED to CONFIRMED"
      );
      expect(mockAppointment.update).not.toHaveBeenCalled();
    });

    it("should return same appointment without error if target status is identical to current status", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce(mockAppointmentData as any);

      const response = await request(app)
        .patch(`/api/admin/appointments/${appointmentId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AppointmentStatus.PENDING });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("PENDING");
      expect(mockAppointment.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 for non-existent appointment ID during status update", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`/api/admin/appointments/${appointmentId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Appointment not found");
    });

    it("should return HTTP 400 for invalid status in request body", async () => {
      const response = await request(app)
        .patch(`/api/admin/appointments/${appointmentId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "INVALID_STATUS_ENUM" });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .patch("/api/admin/appointments/invalid-uuid/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(400);
    });
  });

  // ==========================================
  // Security Verification - Password Exclusions
  // ==========================================
  describe("Security - Password Hash Exclusions", () => {
    it("should NEVER return passwordHash in appointment listing response", async () => {
      mockAppointment.count.mockResolvedValueOnce(1);
      mockAppointment.findMany.mockResolvedValueOnce([mockAppointmentData] as any);

      const response = await request(app)
        .get("/api/admin/appointments")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].patient.user.passwordHash).toBeUndefined();
      expect(response.body.data[0].doctor.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });

    it("should NEVER return passwordHash in single appointment detail response", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce(mockAppointmentData as any);

      const response = await request(app)
        .get(`/api/admin/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.patient.user.passwordHash).toBeUndefined();
      expect(response.body.data.doctor.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });

    it("should NEVER return passwordHash in status update response", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        status: AppointmentStatus.PENDING,
      } as any);

      mockAppointment.update.mockResolvedValueOnce(mockAppointmentData as any);
      mockNotification.create.mockResolvedValueOnce({} as any);

      const response = await request(app)
        .patch(`/api/admin/appointments/${appointmentId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(200);
      expect(response.body.data.patient.user.passwordHash).toBeUndefined();
      expect(response.body.data.doctor.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });
  });
});
