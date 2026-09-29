import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { app } from "../server";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

// Mock Prisma client to isolate unit/integration tests from database
jest.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

describe("Admin User Management API - /api/admin/users", () => {
  const adminUserId = "admin-uuid-101";
  const doctorUserId = "doctor-uuid-202";
  const patientUserId = "patient-uuid-303";
  const targetUserId = "123e4567-e89b-12d3-a456-426614174000";

  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;

  const mockUsersList = [
    {
      id: targetUserId,
      email: "john.doe@mediflow.com",
      firstName: "John",
      lastName: "Doe",
      role: UserRole.DOCTOR,
      phoneNumber: "555-0199",
      isActive: true,
      createdAt: new Date("2026-09-29T10:00:00.000Z"),
      updatedAt: new Date("2026-09-29T10:00:00.000Z"),
    },
    {
      id: "patient-uuid-404",
      email: "alice.smith@mediflow.com",
      firstName: "Alice",
      lastName: "Smith",
      role: UserRole.PATIENT,
      phoneNumber: "555-0188",
      isActive: true,
      createdAt: new Date("2026-09-28T10:00:00.000Z"),
      updatedAt: new Date("2026-09-28T10:00:00.000Z"),
    },
  ];

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
  // GET /api/admin/users - Authorization & Roles
  // ==========================================
  describe("GET /api/admin/users - Access Control", () => {
    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/admin/users");
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should allow ADMIN role to access user listing with HTTP 200", async () => {
      mockUser.count.mockResolvedValueOnce(2);
      mockUser.findMany.mockResolvedValueOnce(mockUsersList as any);

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });
  });

  // ==========================================
  // GET /api/admin/users - Pagination, Filtering & Search
  // ==========================================
  describe("GET /api/admin/users - Pagination & Filters", () => {
    it("should apply default pagination parameters (page=1, limit=20)", async () => {
      mockUser.count.mockResolvedValueOnce(25);
      mockUser.findMany.mockResolvedValueOnce(mockUsersList as any);

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });

      expect(mockUser.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should handle custom valid page and limit parameters", async () => {
      mockUser.count.mockResolvedValueOnce(50);
      mockUser.findMany.mockResolvedValueOnce(mockUsersList as any);

      const response = await request(app)
        .get("/api/admin/users?page=2&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
      });

      expect(mockUser.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        skip: 10,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should reject limit exceeding maximum allowed limit (limit > 100) with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/users?limit=500")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should reject invalid page parameter (e.g. page=0 or page=abc) with HTTP 400", async () => {
      const responseZero = await request(app)
        .get("/api/admin/users?page=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(responseZero.status).toBe(400);

      const responseString = await request(app)
        .get("/api/admin/users?page=invalid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(responseString.status).toBe(400);
    });

    it("should reject invalid limit parameter (e.g. limit=0) with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/users?limit=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    it("should filter users by valid UserRole", async () => {
      mockUser.count.mockResolvedValueOnce(1);
      mockUser.findMany.mockResolvedValueOnce([mockUsersList[0]] as any);

      const response = await request(app)
        .get("/api/admin/users?role=DOCTOR")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].role).toBe("DOCTOR");

      expect(mockUser.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.DOCTOR },
        select: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should reject invalid role filter with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/users?role=SUPERHERO")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should search users by name or email query", async () => {
      mockUser.count.mockResolvedValueOnce(1);
      mockUser.findMany.mockResolvedValueOnce([mockUsersList[0]] as any);

      const response = await request(app)
        .get("/api/admin/users?search=john")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockUser.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: "john", mode: "insensitive" } },
            { lastName: { contains: "john", mode: "insensitive" } },
            { email: { contains: "john", mode: "insensitive" } },
          ],
        },
        select: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should handle empty search results gracefully with HTTP 200 and empty data array", async () => {
      mockUser.count.mockResolvedValueOnce(0);
      mockUser.findMany.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/api/admin/users?search=nonexistentterm")
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
  // GET /api/admin/users/:id - Single User Retrieval
  // ==========================================
  describe("GET /api/admin/users/:id", () => {
    it("should return a single user by valid UUID for ADMIN", async () => {
      mockUser.findUnique.mockResolvedValueOnce(mockUsersList[0] as any);

      const response = await request(app)
        .get(`/api/admin/users/${targetUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(targetUserId);
      expect(response.body.data.email).toBe("john.doe@mediflow.com");

      expect(mockUser.findUnique).toHaveBeenCalledWith({
        where: { id: targetUserId },
        select: expect.any(Object),
      });
    });

    it("should return HTTP 404 for non-existent user ID", async () => {
      mockUser.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/admin/users/${targetUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found");
    });

    it("should return HTTP 400 for invalid UUID format", async () => {
      const response = await request(app)
        .get("/api/admin/users/invalid-uuid-format")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 403 for PATIENT role accessing GET /api/admin/users/:id", async () => {
      const response = await request(app)
        .get(`/api/admin/users/${targetUserId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });

    it("should return HTTP 401 for unauthenticated GET /api/admin/users/:id", async () => {
      const response = await request(app).get(`/api/admin/users/${targetUserId}`);
      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // Security Verification - Password Privacy
  // ==========================================
  describe("Security - Password Hash Exclusions", () => {
    it("should NEVER return passwordHash in user listing responses", async () => {
      mockUser.count.mockResolvedValueOnce(1);
      mockUser.findMany.mockResolvedValueOnce([mockUsersList[0]] as any);

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const user = response.body.data[0];
      expect(user.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });

    it("should NEVER return passwordHash in single user lookup responses", async () => {
      mockUser.findUnique.mockResolvedValueOnce(mockUsersList[0] as any);

      const response = await request(app)
        .get(`/api/admin/users/${targetUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });
  });
});
