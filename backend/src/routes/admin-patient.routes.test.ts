import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { app } from "../server";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

// Mock Prisma client to isolate unit/integration tests from actual database
jest.mock("../lib/prisma", () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;
const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

describe("Admin Patient Management API - /api/admin/patients", () => {
  const adminUserId = "admin-uuid-101";
  const doctorUserId = "doctor-uuid-202";
  const patientUserId = "patient-uuid-303";

  const patientId = "123e4567-e89b-12d3-a456-426614174000";

  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;

  const mockPatientData = {
    id: patientId,
    userId: patientUserId,
    dateOfBirth: new Date("1990-05-15T00:00:00.000Z"),
    gender: "Female",
    bloodGroup: "O+",
    address: "123 Health Ave, Medical City",
    emergencyContact: "555-9999",
    createdAt: new Date("2026-09-29T10:00:00.000Z"),
    updatedAt: new Date("2026-09-29T10:00:00.000Z"),
    user: {
      id: patientUserId,
      email: "alice.smith@mediflow.com",
      firstName: "Alice",
      lastName: "Smith",
      role: UserRole.PATIENT,
      phoneNumber: "555-0100",
      isActive: true,
      createdAt: new Date("2026-09-29T10:00:00.000Z"),
      updatedAt: new Date("2026-09-29T10:00:00.000Z"),
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
      const response = await request(app).get("/api/admin/patients");
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get("/api/admin/patients")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .get("/api/admin/patients")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should allow ADMIN role to access patient listing with HTTP 200", async () => {
      mockPatient.count.mockResolvedValueOnce(1);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
    });
  });

  // ==========================================
  // GET /api/admin/patients - Pagination & Filters
  // ==========================================
  describe("GET /api/admin/patients - Pagination, Filters & Search", () => {
    it("should apply default pagination parameters (page=1, limit=20)", async () => {
      mockPatient.count.mockResolvedValueOnce(25);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });

      expect(mockPatient.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should handle custom valid page and limit parameters", async () => {
      mockPatient.count.mockResolvedValueOnce(30);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients?page=2&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3,
      });

      expect(mockPatient.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        skip: 10,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should reject limit exceeding maximum limit (limit > 100) with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/patients?limit=150")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should reject invalid page parameter (page=0 or string) with HTTP 400", async () => {
      const responseZero = await request(app)
        .get("/api/admin/patients?page=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(responseZero.status).toBe(400);

      const responseString = await request(app)
        .get("/api/admin/patients?page=abc")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(responseString.status).toBe(400);
    });

    it("should reject invalid limit parameter (limit=0) with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/patients?limit=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    it("should search patients by first name", async () => {
      mockPatient.count.mockResolvedValueOnce(1);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients?search=Alice")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockPatient.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { user: { firstName: { contains: "Alice", mode: "insensitive" } } },
            { user: { lastName: { contains: "Alice", mode: "insensitive" } } },
            { user: { email: { contains: "Alice", mode: "insensitive" } } },
            { user: { phoneNumber: { contains: "Alice", mode: "insensitive" } } },
          ],
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should search patients by last name", async () => {
      mockPatient.count.mockResolvedValueOnce(1);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients?search=Smith")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it("should search patients by email", async () => {
      mockPatient.count.mockResolvedValueOnce(1);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients?search=alice.smith@mediflow.com")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it("should search patients by phone number", async () => {
      mockPatient.count.mockResolvedValueOnce(1);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients?search=555-0100")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it("should filter patients by gender", async () => {
      mockPatient.count.mockResolvedValueOnce(1);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients?gender=Female")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockPatient.findMany).toHaveBeenCalledWith({
        where: {
          gender: { equals: "Female", mode: "insensitive" },
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter patients by blood group", async () => {
      mockPatient.count.mockResolvedValueOnce(1);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients?bloodGroup=O%2B")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockPatient.findMany).toHaveBeenCalledWith({
        where: {
          bloodGroup: { equals: "O+", mode: "insensitive" },
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty results gracefully when no patients match query", async () => {
      mockPatient.count.mockResolvedValueOnce(0);
      mockPatient.findMany.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/api/admin/patients?search=nonexistent")
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
  // GET /api/admin/patients/:id - Single Patient Lookup
  // ==========================================
  describe("GET /api/admin/patients/:id", () => {
    it("should return patient details by Patient UUID for ADMIN", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(mockPatientData as any);

      const response = await request(app)
        .get(`/api/admin/patients/${patientId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(patientId);
      expect(response.body.data.user.email).toBe("alice.smith@mediflow.com");
      expect(response.body.data.gender).toBe("Female");
      expect(response.body.data.bloodGroup).toBe("O+");

      expect(mockPatient.findUnique).toHaveBeenCalledWith({
        where: { id: patientId },
        include: {
          user: expect.any(Object),
        },
      });
    });

    it("should return HTTP 404 for non-existent patient ID", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/admin/patients/${patientId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Patient not found");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .get("/api/admin/patients/invalid-uuid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });
  });

  // ==========================================
  // PATCH /api/admin/patients/:id/status - Status Update
  // ==========================================
  describe("PATCH /api/admin/patients/:id/status", () => {
    it("should allow ADMIN to deactivate a patient profile", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: patientId,
        userId: patientUserId,
      } as any);

      mockUser.update.mockResolvedValueOnce({
        id: patientUserId,
        isActive: false,
      } as any);

      const deactivatedPatientData = {
        ...mockPatientData,
        user: { ...mockPatientData.user, isActive: false },
      };

      mockPatient.findUnique.mockResolvedValueOnce(deactivatedPatientData as any);

      const response = await request(app)
        .patch(`/api/admin/patients/${patientId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Patient status updated successfully");
      expect(response.body.data.user.isActive).toBe(false);

      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: patientUserId },
        data: { isActive: false },
      });
    });

    it("should allow ADMIN to activate a patient profile", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: patientId,
        userId: patientUserId,
      } as any);

      mockUser.update.mockResolvedValueOnce({
        id: patientUserId,
        isActive: true,
      } as any);

      mockPatient.findUnique.mockResolvedValueOnce(mockPatientData as any);

      const response = await request(app)
        .patch(`/api/admin/patients/${patientId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(response.status).toBe(200);
      expect(response.body.data.user.isActive).toBe(true);

      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: patientUserId },
        data: { isActive: true },
      });
    });

    it("should return HTTP 404 for non-existent patient ID during status update", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`/api/admin/patients/${patientId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Patient not found");
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 for invalid request body", async () => {
      const response = await request(app)
        .patch(`/api/admin/patients/${patientId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: "not-a-boolean" });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .patch("/api/admin/patients/invalid-uuid/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(400);
    });

    it("should return HTTP 403 for DOCTOR role attempting status update", async () => {
      const response = await request(app)
        .patch(`/api/admin/patients/${patientId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // Security Verification - Password Exclusions
  // ==========================================
  describe("Security - Password Hash Exclusions", () => {
    it("should NEVER return passwordHash in patient listing response", async () => {
      mockPatient.count.mockResolvedValueOnce(1);
      mockPatient.findMany.mockResolvedValueOnce([mockPatientData] as any);

      const response = await request(app)
        .get("/api/admin/patients")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });

    it("should NEVER return passwordHash in single patient detail response", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(mockPatientData as any);

      const response = await request(app)
        .get(`/api/admin/patients/${patientId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });

    it("should NEVER return passwordHash in status update response", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: patientId,
        userId: patientUserId,
      } as any);
      mockUser.update.mockResolvedValueOnce({ id: patientUserId } as any);
      mockPatient.findUnique.mockResolvedValueOnce(mockPatientData as any);

      const response = await request(app)
        .patch(`/api/admin/patients/${patientId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(response.status).toBe(200);
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });
  });
});
