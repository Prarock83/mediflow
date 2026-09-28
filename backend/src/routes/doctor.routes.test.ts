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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    specialization: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockSpecialization = prisma.specialization as jest.Mocked<typeof prisma.specialization>;

describe("Doctor Profile Routes - /api/doctors", () => {
  const doctorUserId = "doctor-uuid-202";
  const patientUserId = "patient-uuid-101";
  const adminUserId = "admin-uuid-303";
  const specializationId = "spec-uuid-555";

  let doctorToken: string;
  let patientToken: string;
  let adminToken: string;

  beforeAll(() => {
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
  // POST /api/doctors/profile
  // ==========================================
  describe("POST /api/doctors/profile", () => {
    it("should successfully create a doctor profile with HTTP 201 for authenticated DOCTOR", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null); // No existing profile
      mockDoctor.findUnique.mockResolvedValueOnce(null); // No existing license
      mockSpecialization.findUnique.mockResolvedValueOnce({
        id: specializationId,
        name: "Cardiology",
        description: "Heart specialists",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      (mockDoctor.create as jest.Mock).mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
        licenseNumber: "MD-998877",
        specializationId,
        experienceYears: 10,
        bio: "Cardiologist with 10 years experience",
        consultationFee: 150.0,
        createdAt: new Date("2026-09-28T00:00:00.000Z"),
        updatedAt: new Date("2026-09-28T00:00:00.000Z"),
        specialization: {
          id: specializationId,
          name: "Cardiology",
          description: "Heart specialists",
        },
      });

      const response = await request(app)
        .post("/api/doctors/profile")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          licenseNumber: "MD-998877",
          specializationId,
          experienceYears: 10,
          bio: "Cardiologist with 10 years experience",
          consultationFee: 150.0,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Doctor profile created successfully");
      expect(response.body.data.userId).toBe(doctorUserId);
      expect(response.body.data.licenseNumber).toBe("MD-998877");
      expect(response.body.data.specializationId).toBe(specializationId);

      // Verify passwordHash or sensitive credentials are NEVER returned
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.password).toBeUndefined();

      // Verify Prisma DB calls
      expect(mockDoctor.create).toHaveBeenCalledWith({
        data: {
          userId: doctorUserId,
          licenseNumber: "MD-998877",
          specializationId,
          experienceYears: 10,
          bio: "Cardiologist with 10 years experience",
          consultationFee: 150.0,
        },
        include: {
          specialization: true,
        },
      });
    });

    it("should reject creation of duplicate doctor profile with HTTP 409", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
      } as any);

      const response = await request(app)
        .post("/api/doctors/profile")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          licenseNumber: "MD-998877",
          specializationId,
          consultationFee: 150.0,
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        status: "error",
        message: "Doctor profile already exists",
      });
      expect(mockDoctor.create).not.toHaveBeenCalled();
    });

    it("should reject creation if license number is already taken with HTTP 409", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null); // Profile does not exist
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-other",
        licenseNumber: "MD-998877",
      } as any); // License already taken

      const response = await request(app)
        .post("/api/doctors/profile")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          licenseNumber: "MD-998877",
          specializationId,
          consultationFee: 150.0,
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        status: "error",
        message: "Doctor license number already exists",
      });
      expect(mockDoctor.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 if specializationId does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null); // No existing profile
      mockDoctor.findUnique.mockResolvedValueOnce(null); // No existing license
      mockSpecialization.findUnique.mockResolvedValueOnce(null); // Specialization not found

      const response = await request(app)
        .post("/api/doctors/profile")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          licenseNumber: "MD-998877",
          specializationId: "invalid-spec-id",
          consultationFee: 150.0,
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "Specialization not found",
      });
      expect(mockDoctor.create).not.toHaveBeenCalled();
    });

    it("should ignore userId passed in request body and bind profile strictly to req.user.id", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);
      mockDoctor.findUnique.mockResolvedValueOnce(null);
      mockSpecialization.findUnique.mockResolvedValueOnce({ id: specializationId } as any);
      (mockDoctor.create as jest.Mock).mockResolvedValueOnce({
        id: "doc-2",
        userId: doctorUserId,
        licenseNumber: "MD-112233",
        specializationId,
        consultationFee: 100.0,
      });

      const response = await request(app)
        .post("/api/doctors/profile")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          userId: "injected-victim-uuid",
          licenseNumber: "MD-112233",
          specializationId,
          consultationFee: 100.0,
        });

      expect(response.status).toBe(201);
      expect(mockDoctor.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: doctorUserId,
          licenseNumber: "MD-112233",
        }),
        include: {
          specialization: true,
        },
      });
      expect(mockDoctor.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "injected-victim-uuid" }),
        })
      );
    });

    it("should return HTTP 400 for missing required fields or invalid data formats", async () => {
      const response = await request(app)
        .post("/api/doctors/profile")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          licenseNumber: "",
          consultationFee: -50.0,
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
      expect(mockDoctor.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/doctors/profile")
        .send({
          licenseNumber: "MD-998877",
          specializationId,
          consultationFee: 150.0,
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe("error");
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .post("/api/doctors/profile")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          licenseNumber: "MD-998877",
          specializationId,
          consultationFee: 150.0,
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .post("/api/doctors/profile")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          licenseNumber: "MD-998877",
          specializationId,
          consultationFee: 150.0,
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe("error");
    });
  });

  // ==========================================
  // GET /api/doctors/me
  // ==========================================
  describe("GET /api/doctors/me", () => {
    it("should successfully fetch own profile with HTTP 200 for authenticated DOCTOR", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
        licenseNumber: "MD-998877",
        specializationId,
        experienceYears: 10,
        bio: "Cardiologist",
        consultationFee: 150.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        specialization: {
          id: specializationId,
          name: "Cardiology",
        },
      } as any);

      const response = await request(app)
        .get("/api/doctors/me")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: "doc-1",
          userId: doctorUserId,
          licenseNumber: "MD-998877",
          specializationId,
        })
      );

      // Verify credentials are NEVER exposed
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.password).toBeUndefined();

      expect(mockDoctor.findUnique).toHaveBeenCalledWith({
        where: { userId: doctorUserId },
        include: {
          specialization: true,
        },
      });
    });

    it("should return HTTP 404 if doctor profile does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/doctors/me")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "Doctor profile not found",
      });
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/doctors/me");

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get("/api/doctors/me")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .get("/api/doctors/me")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // PUT /api/doctors/me
  // ==========================================
  describe("PUT /api/doctors/me", () => {
    it("should successfully update profile with HTTP 200 for authenticated DOCTOR", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
        licenseNumber: "MD-998877",
        specializationId,
        experienceYears: 5,
        bio: "Old bio",
        consultationFee: 100.0,
      } as any);

      mockDoctor.update.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
        licenseNumber: "MD-998877",
        specializationId,
        experienceYears: 6,
        bio: "Updated bio",
        consultationFee: 175.0,
        specialization: {
          id: specializationId,
          name: "Cardiology",
        },
      } as any);

      const response = await request(app)
        .put("/api/doctors/me")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          experienceYears: 6,
          bio: "Updated bio",
          consultationFee: 175.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Doctor profile updated successfully");
      expect(response.body.data.bio).toBe("Updated bio");
      expect(response.body.data.consultationFee).toBe(175.0);

      // Verify credentials are NEVER exposed
      expect(response.body.data.passwordHash).toBeUndefined();

      expect(mockDoctor.findUnique).toHaveBeenCalledWith({
        where: { userId: doctorUserId },
      });
      expect(mockDoctor.update).toHaveBeenCalledWith({
        where: { userId: doctorUserId },
        data: {
          experienceYears: 6,
          bio: "Updated bio",
          consultationFee: 175.0,
        },
        include: {
          specialization: true,
        },
      });
    });

    it("should return HTTP 404 when trying to update non-existent doctor profile", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .put("/api/doctors/me")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          bio: "Updated bio",
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "Doctor profile not found",
      });
      expect(mockDoctor.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 for invalid field inputs (e.g. negative consultationFee)", async () => {
      const response = await request(app)
        .put("/api/doctors/me")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          consultationFee: -100,
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
      expect(mockDoctor.update).not.toHaveBeenCalled();
    });

    it("should not allow modifying userId, role, email, or password via PUT payload", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
        licenseNumber: "MD-998877",
      } as any);

      mockDoctor.update.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
        licenseNumber: "MD-998877",
        bio: "Updated safe bio",
      } as any);

      const response = await request(app)
        .put("/api/doctors/me")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          userId: "hacked-user-id",
          role: "ADMIN",
          email: "hacked@mediflow.com",
          password: "newHackedPassword",
          bio: "Updated safe bio",
        });

      expect(response.status).toBe(200);
      expect(mockDoctor.update).toHaveBeenCalledWith({
        where: { userId: doctorUserId },
        data: {
          bio: "Updated safe bio",
        },
        include: {
          specialization: true,
        },
      });
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .put("/api/doctors/me")
        .send({ bio: "Updated bio" });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .put("/api/doctors/me")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({ bio: "Updated bio" });

      expect(response.status).toBe(403);
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .put("/api/doctors/me")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ bio: "Updated bio" });

      expect(response.status).toBe(403);
    });
  });
});
