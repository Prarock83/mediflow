import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { app } from "../server";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

// Mock Prisma client to isolate unit/integration tests from actual database
jest.mock("../lib/prisma", () => ({
  prisma: {
    doctor: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

describe("Admin Doctor Management API - /api/admin/doctors", () => {
  const adminUserId = "admin-uuid-101";
  const doctorUserId = "doctor-uuid-202";
  const patientUserId = "patient-uuid-303";

  const doctorId = "123e4567-e89b-12d3-a456-426614174000";
  const specializationId = "spec-cardio-1";

  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;

  const mockDoctorData = {
    id: doctorId,
    userId: doctorUserId,
    licenseNumber: "MD-998877",
    specializationId,
    experienceYears: 10,
    bio: "Experienced cardiologist",
    consultationFee: 150.0,
    createdAt: new Date("2026-09-29T10:00:00.000Z"),
    updatedAt: new Date("2026-09-29T10:00:00.000Z"),
    user: {
      id: doctorUserId,
      email: "dr.john@mediflow.com",
      firstName: "John",
      lastName: "Doe",
      role: UserRole.DOCTOR,
      phoneNumber: "555-0199",
      isActive: true,
      createdAt: new Date("2026-09-29T10:00:00.000Z"),
      updatedAt: new Date("2026-09-29T10:00:00.000Z"),
    },
    specialization: {
      id: specializationId,
      name: "Cardiology",
      description: "Heart and cardiovascular system",
    },
    availabilities: [
      {
        id: "avail-1",
        doctorId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        slotDuration: 30,
        isAvailable: true,
      },
    ],
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
      const response = await request(app).get("/api/admin/doctors");
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get("/api/admin/doctors")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .get("/api/admin/doctors")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should allow ADMIN role to access doctor listing with HTTP 200", async () => {
      mockDoctor.count.mockResolvedValueOnce(1);
      mockDoctor.findMany.mockResolvedValueOnce([mockDoctorData] as any);

      const response = await request(app)
        .get("/api/admin/doctors")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
    });
  });

  // ==========================================
  // GET /api/admin/doctors - Pagination & Filters
  // ==========================================
  describe("GET /api/admin/doctors - Pagination, Filters & Search", () => {
    it("should apply default pagination parameters (page=1, limit=20)", async () => {
      mockDoctor.count.mockResolvedValueOnce(25);
      mockDoctor.findMany.mockResolvedValueOnce([mockDoctorData] as any);

      const response = await request(app)
        .get("/api/admin/doctors")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });

      expect(mockDoctor.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should handle custom valid page and limit parameters", async () => {
      mockDoctor.count.mockResolvedValueOnce(30);
      mockDoctor.findMany.mockResolvedValueOnce([mockDoctorData] as any);

      const response = await request(app)
        .get("/api/admin/doctors?page=2&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3,
      });

      expect(mockDoctor.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        skip: 10,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should reject limit exceeding maximum limit (limit > 100) with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/doctors?limit=250")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should reject invalid page parameter (page=0 or string) with HTTP 400", async () => {
      const responseZero = await request(app)
        .get("/api/admin/doctors?page=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(responseZero.status).toBe(400);

      const responseString = await request(app)
        .get("/api/admin/doctors?page=invalid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(responseString.status).toBe(400);
    });

    it("should filter doctors by specializationId", async () => {
      mockDoctor.count.mockResolvedValueOnce(1);
      mockDoctor.findMany.mockResolvedValueOnce([mockDoctorData] as any);

      const response = await request(app)
        .get(`/api/admin/doctors?specializationId=${specializationId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockDoctor.findMany).toHaveBeenCalledWith({
        where: { specializationId },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should search doctors by name, email, or licenseNumber", async () => {
      mockDoctor.count.mockResolvedValueOnce(1);
      mockDoctor.findMany.mockResolvedValueOnce([mockDoctorData] as any);

      const response = await request(app)
        .get("/api/admin/doctors?search=MD-998877")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockDoctor.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { user: { firstName: { contains: "MD-998877", mode: "insensitive" } } },
            { user: { lastName: { contains: "MD-998877", mode: "insensitive" } } },
            { user: { email: { contains: "MD-998877", mode: "insensitive" } } },
            { licenseNumber: { contains: "MD-998877", mode: "insensitive" } },
          ],
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty results gracefully when no doctors match filters", async () => {
      mockDoctor.count.mockResolvedValueOnce(0);
      mockDoctor.findMany.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/api/admin/doctors?search=nonexistent")
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
  // GET /api/admin/doctors/:id - Single Doctor Lookup
  // ==========================================
  describe("GET /api/admin/doctors/:id", () => {
    it("should return doctor details by Doctor UUID for ADMIN", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(mockDoctorData as any);

      const response = await request(app)
        .get(`/api/admin/doctors/${doctorId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(doctorId);
      expect(response.body.data.user.email).toBe("dr.john@mediflow.com");
      expect(response.body.data.specialization.name).toBe("Cardiology");
      expect(response.body.data.availabilities).toHaveLength(1);

      expect(mockDoctor.findUnique).toHaveBeenCalledWith({
        where: { id: doctorId },
        include: {
          user: expect.any(Object),
          specialization: true,
          availabilities: true,
        },
      });
    });

    it("should return HTTP 404 for non-existent doctor ID", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/admin/doctors/${doctorId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Doctor not found");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .get("/api/admin/doctors/invalid-uuid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });
  });

  // ==========================================
  // PATCH /api/admin/doctors/:id/status - Status Update
  // ==========================================
  describe("PATCH /api/admin/doctors/:id/status", () => {
    it("should allow ADMIN to deactivate a doctor profile", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockUser.update.mockResolvedValueOnce({
        id: doctorUserId,
        isActive: false,
      } as any);

      const deactivatedDoctorData = {
        ...mockDoctorData,
        user: { ...mockDoctorData.user, isActive: false },
      };

      mockDoctor.findUnique.mockResolvedValueOnce(deactivatedDoctorData as any);

      const response = await request(app)
        .patch(`/api/admin/doctors/${doctorId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Doctor status updated successfully");
      expect(response.body.data.user.isActive).toBe(false);

      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: doctorUserId },
        data: { isActive: false },
      });
    });

    it("should allow ADMIN to activate a doctor profile", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockUser.update.mockResolvedValueOnce({
        id: doctorUserId,
        isActive: true,
      } as any);

      mockDoctor.findUnique.mockResolvedValueOnce(mockDoctorData as any);

      const response = await request(app)
        .patch(`/api/admin/doctors/${doctorId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(response.status).toBe(200);
      expect(response.body.data.user.isActive).toBe(true);

      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: doctorUserId },
        data: { isActive: true },
      });
    });

    it("should return HTTP 404 for non-existent doctor ID during status update", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`/api/admin/doctors/${doctorId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Doctor not found");
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 for invalid request body", async () => {
      const response = await request(app)
        .patch(`/api/admin/doctors/${doctorId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: "invalid-boolean" });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .patch("/api/admin/doctors/not-a-uuid/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(400);
    });

    it("should return HTTP 403 for DOCTOR role attempting status update", async () => {
      const response = await request(app)
        .patch(`/api/admin/doctors/${doctorId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // Security Verification - Password Exclusions
  // ==========================================
  describe("Security - Password Hash Exclusions", () => {
    it("should NEVER return passwordHash in doctor listing response", async () => {
      mockDoctor.count.mockResolvedValueOnce(1);
      mockDoctor.findMany.mockResolvedValueOnce([mockDoctorData] as any);

      const response = await request(app)
        .get("/api/admin/doctors")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });

    it("should NEVER return passwordHash in single doctor detail response", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(mockDoctorData as any);

      const response = await request(app)
        .get(`/api/admin/doctors/${doctorId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });

    it("should NEVER return passwordHash in status update response", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);
      mockUser.update.mockResolvedValueOnce({ id: doctorUserId } as any);
      mockDoctor.findUnique.mockResolvedValueOnce(mockDoctorData as any);

      const response = await request(app)
        .patch(`/api/admin/doctors/${doctorId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(response.status).toBe(200);
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });
  });
});
