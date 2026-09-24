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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;

describe("Patient Profile Routes - /api/patients", () => {
  const patientUserId = "patient-uuid-101";
  const doctorUserId = "doctor-uuid-202";
  const adminUserId = "admin-uuid-303";

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
  // POST /api/patients/profile
  // ==========================================
  describe("POST /api/patients/profile", () => {
    it("should successfully create a patient profile with HTTP 201 for authenticated PATIENT", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(null);
      (mockPatient.create as jest.Mock).mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
        dateOfBirth: new Date("1995-04-12T00:00:00.000Z"),
        gender: "Female",
        bloodGroup: "O+",
        address: "123 Health Way",
        emergencyContact: "555-0199",
        createdAt: new Date("2026-09-24T00:00:00.000Z"),
        updatedAt: new Date("2026-09-24T00:00:00.000Z"),
      });

      const response = await request(app)
        .post("/api/patients/profile")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          dateOfBirth: "1995-04-12",
          gender: "Female",
          bloodGroup: "O+",
          address: "123 Health Way",
          emergencyContact: "555-0199",
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Patient profile created successfully");
      expect(response.body.data.userId).toBe(patientUserId);
      expect(response.body.data.gender).toBe("Female");

      // Verify passwordHash or credentials are NEVER returned
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.password).toBeUndefined();

      // Verify Prisma DB calls
      expect(mockPatient.findUnique).toHaveBeenCalledWith({
        where: { userId: patientUserId },
      });
      expect(mockPatient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: patientUserId,
          gender: "Female",
          bloodGroup: "O+",
          address: "123 Health Way",
          emergencyContact: "555-0199",
        }),
      });
    });

    it("should reject creation of duplicate profile with HTTP 409", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
      } as any);

      const response = await request(app)
        .post("/api/patients/profile")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          gender: "Female",
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        status: "error",
        message: "Patient profile already exists",
      });
      expect(mockPatient.create).not.toHaveBeenCalled();
    });

    it("should ignore userId passed in body and bind profile strictly to req.user.id", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(null);
      (mockPatient.create as jest.Mock).mockResolvedValueOnce({
        id: "pat-2",
        userId: patientUserId,
        gender: "Male",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/api/patients/profile")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          userId: "hacked-victim-uuid",
          gender: "Male",
        });

      expect(response.status).toBe(201);
      expect(mockPatient.findUnique).toHaveBeenCalledWith({
        where: { userId: patientUserId },
      });
      expect(mockPatient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: patientUserId,
          gender: "Male",
        }),
      });
      expect(mockPatient.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "hacked-victim-uuid" }),
        })
      );
    });

    it("should return HTTP 400 for invalid date format", async () => {
      const response = await request(app)
        .post("/api/patients/profile")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          dateOfBirth: "invalid-date-string",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
      expect(mockPatient.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/patients/profile")
        .send({ gender: "Male" });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe("error");
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .post("/api/patients/profile")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ gender: "Male" });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .post("/api/patients/profile")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ gender: "Male" });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe("error");
    });
  });

  // ==========================================
  // GET /api/patients/me
  // ==========================================
  describe("GET /api/patients/me", () => {
    it("should successfully fetch own profile with HTTP 200 for authenticated PATIENT", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
        dateOfBirth: new Date("1995-04-12T00:00:00.000Z"),
        gender: "Female",
        bloodGroup: "O+",
        address: "123 Health Way",
        emergencyContact: "555-0199",
        createdAt: new Date("2026-09-24T00:00:00.000Z"),
        updatedAt: new Date("2026-09-24T00:00:00.000Z"),
      } as any);

      const response = await request(app)
        .get("/api/patients/me")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: "pat-1",
          userId: patientUserId,
          gender: "Female",
          bloodGroup: "O+",
        })
      );

      // Verify credentials are NEVER exposed
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.password).toBeUndefined();

      expect(mockPatient.findUnique).toHaveBeenCalledWith({
        where: { userId: patientUserId },
      });
    });

    it("should return HTTP 404 if profile does not exist", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/patients/me")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "Patient profile not found",
      });
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/patients/me");

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .get("/api/patients/me")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .get("/api/patients/me")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // PUT /api/patients/me
  // ==========================================
  describe("PUT /api/patients/me", () => {
    it("should successfully update profile with HTTP 200 for authenticated PATIENT", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
        gender: "Female",
        address: "Old Address",
      } as any);

      mockPatient.update.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
        gender: "Female",
        address: "789 Updated Blvd",
        emergencyContact: "555-9999",
      } as any);

      const response = await request(app)
        .put("/api/patients/me")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          address: "789 Updated Blvd",
          emergencyContact: "555-9999",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Patient profile updated successfully");
      expect(response.body.data.address).toBe("789 Updated Blvd");

      // Verify password credentials are not exposed
      expect(response.body.data.passwordHash).toBeUndefined();

      expect(mockPatient.findUnique).toHaveBeenCalledWith({
        where: { userId: patientUserId },
      });
      expect(mockPatient.update).toHaveBeenCalledWith({
        where: { userId: patientUserId },
        data: {
          address: "789 Updated Blvd",
          emergencyContact: "555-9999",
        },
      });
    });

    it("should return HTTP 404 when trying to update non-existent profile", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .put("/api/patients/me")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          address: "123 New Place",
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "Patient profile not found",
      });
      expect(mockPatient.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 for invalid field inputs (e.g. empty string fields)", async () => {
      const response = await request(app)
        .put("/api/patients/me")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          gender: "   ",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
      expect(mockPatient.update).not.toHaveBeenCalled();
    });

    it("should not allow modifying userId, role, email, or password via PUT payload", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
      } as any);

      mockPatient.update.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
        address: "Safe Address",
      } as any);

      const response = await request(app)
        .put("/api/patients/me")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          userId: "new-hacked-user-id",
          role: "ADMIN",
          email: "hacked@mediflow.com",
          password: "newHackedPassword",
          address: "Safe Address",
        });

      expect(response.status).toBe(200);
      expect(mockPatient.update).toHaveBeenCalledWith({
        where: { userId: patientUserId },
        data: {
          address: "Safe Address",
        },
      });
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .put("/api/patients/me")
        .send({ address: "New address" });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .put("/api/patients/me")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ address: "Doctor address" });

      expect(response.status).toBe(403);
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .put("/api/patients/me")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ address: "Admin address" });

      expect(response.status).toBe(403);
    });
  });
});
