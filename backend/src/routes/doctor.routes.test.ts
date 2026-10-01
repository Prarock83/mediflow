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
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    doctorAvailability: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    specialization: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockAvailability = prisma.doctorAvailability as jest.Mocked<typeof prisma.doctorAvailability>;
const mockSpecialization = prisma.specialization as jest.Mocked<typeof prisma.specialization>;
const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;

describe("Doctor API Routes - /api/doctors", () => {
  const doctorUserId = "doctor-uuid-202";
  const doctorId = "doc-1";
  const patientUserId = "patient-uuid-101";
  const adminUserId = "admin-uuid-303";
  const specializationId = "spec-uuid-555";
  const validAvailabilityId = "123e4567-e89b-12d3-a456-426614174000";

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
  // DOCTOR PROFILE ENDPOINTS
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
        id: doctorId,
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
        id: doctorId,
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
      mockDoctor.findUnique.mockResolvedValueOnce(null);
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-other",
        licenseNumber: "MD-998877",
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
        message: "Doctor license number already exists",
      });
      expect(mockDoctor.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 if specializationId does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);
      mockDoctor.findUnique.mockResolvedValueOnce(null);
      mockSpecialization.findUnique.mockResolvedValueOnce(null);

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
    });
  });

  describe("GET /api/doctors/me", () => {
    it("should successfully fetch own profile with HTTP 200 for authenticated DOCTOR", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
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
      expect(response.body.data.id).toBe(doctorId);
    });

    it("should return HTTP 404 if doctor profile does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/doctors/me")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
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
  });

  describe("PUT /api/doctors/me", () => {
    it("should successfully update profile with HTTP 200 for authenticated DOCTOR", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
        licenseNumber: "MD-998877",
      } as any);

      mockDoctor.update.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
        bio: "Updated bio",
        consultationFee: 175.0,
      } as any);

      const response = await request(app)
        .put("/api/doctors/me")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          bio: "Updated bio",
          consultationFee: 175.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.bio).toBe("Updated bio");
    });
  });

  // ==========================================
  // DOCTOR AVAILABILITY ENDPOINTS
  // ==========================================

  // ------------------------------------------
  // POST /api/doctors/availability
  // ------------------------------------------
  describe("POST /api/doctors/availability", () => {
    it("should successfully create an availability slot with HTTP 201 for authenticated DOCTOR", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAvailability.findMany.mockResolvedValueOnce([]); // No existing overlapping slots

      (mockAvailability.create as jest.Mock).mockResolvedValueOnce({
        id: validAvailabilityId,
        doctorId,
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "12:00",
        slotDuration: 30,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/api/doctors/availability")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          slotDuration: 30,
          isAvailable: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Doctor availability created successfully");
      expect(response.body.data.doctorId).toBe(doctorId);
      expect(response.body.data.dayOfWeek).toBe(1);

      expect(mockAvailability.create).toHaveBeenCalledWith({
        data: {
          doctorId,
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          slotDuration: 30,
          isAvailable: true,
        },
      });
    });

    it("should reject creation of overlapping availability slot with HTTP 409", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAvailability.findMany.mockResolvedValueOnce([
        {
          id: "existing-slot-1",
          doctorId,
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          slotDuration: 30,
          isAvailable: true,
        } as any,
      ]);

      const response = await request(app)
        .post("/api/doctors/availability")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          dayOfWeek: 1,
          startTime: "10:30", // Overlaps with 09:00-12:00
          endTime: "13:30",
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        status: "error",
        message: "Doctor availability slot overlaps with an existing slot",
      });
      expect(mockAvailability.create).not.toHaveBeenCalled();
    });

    it("should ignore doctorId in request body and resolve ownership strictly via req.user.id", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAvailability.findMany.mockResolvedValueOnce([]);

      (mockAvailability.create as jest.Mock).mockResolvedValueOnce({
        id: validAvailabilityId,
        doctorId,
        dayOfWeek: 2,
        startTime: "14:00",
        endTime: "17:00",
      });

      const response = await request(app)
        .post("/api/doctors/availability")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          doctorId: "other-doctor-uuid",
          dayOfWeek: 2,
          startTime: "14:00",
          endTime: "17:00",
        });

      expect(response.status).toBe(201);
      expect(mockAvailability.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          doctorId, // Bound to authenticated doctor
        }),
      });
      expect(mockAvailability.create).not.toHaveBeenCalledWith({
        data: expect.objectContaining({
          doctorId: "other-doctor-uuid",
        }),
      });
    });

    it("should return HTTP 404 if doctor profile does not exist yet", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/doctors/availability")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Doctor profile not found");
    });

    it("should return HTTP 400 if endTime is earlier than or equal to startTime", async () => {
      const response = await request(app)
        .post("/api/doctors/availability")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          dayOfWeek: 1,
          startTime: "14:00",
          endTime: "12:00",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 400 for invalid dayOfWeek or malformed time formats", async () => {
      const response = await request(app)
        .post("/api/doctors/availability")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          dayOfWeek: 7, // Invalid day
          startTime: "9am", // Invalid format
          endTime: "12:00",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/doctors/availability")
        .send({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
        });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .post("/api/doctors/availability")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
        });

      expect(response.status).toBe(403);
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .post("/api/doctors/availability")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
        });

      expect(response.status).toBe(403);
    });
  });

  // ------------------------------------------
  // GET /api/doctors/availability
  // ------------------------------------------
  describe("GET /api/doctors/availability", () => {
    it("should list availability records belonging ONLY to authenticated doctor with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      const mockSlots = [
        {
          id: "slot-1",
          doctorId,
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          slotDuration: 30,
          isAvailable: true,
        },
        {
          id: "slot-2",
          doctorId,
          dayOfWeek: 3,
          startTime: "14:00",
          endTime: "17:00",
          slotDuration: 30,
          isAvailable: true,
        },
      ];

      mockAvailability.findMany.mockResolvedValueOnce(mockSlots as any);

      const response = await request(app)
        .get("/api/doctors/availability")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].doctorId).toBe(doctorId);

      expect(mockAvailability.findMany).toHaveBeenCalledWith({
        where: { doctorId },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
    });

    it("should return HTTP 404 if doctor profile does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/doctors/availability")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/doctors/availability");
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get("/api/doctors/availability")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ------------------------------------------
  // PUT /api/doctors/availability/:id
  // ------------------------------------------
  describe("PUT /api/doctors/availability/:id", () => {
    it("should update availability slot belonging to authenticated doctor with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAvailability.findFirst.mockResolvedValueOnce({
        id: validAvailabilityId,
        doctorId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
        slotDuration: 30,
        isAvailable: true,
      } as any);

      mockAvailability.findMany.mockResolvedValueOnce([]); // No overlaps with other slots

      mockAvailability.update.mockResolvedValueOnce({
        id: validAvailabilityId,
        doctorId,
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "13:00",
        slotDuration: 30,
        isAvailable: true,
      } as any);

      const response = await request(app)
        .put(`/api/doctors/availability/${validAvailabilityId}`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          startTime: "10:00",
          endTime: "13:00",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Doctor availability updated successfully");
      expect(response.body.data.startTime).toBe("10:00");

      expect(mockAvailability.update).toHaveBeenCalledWith({
        where: { id: validAvailabilityId },
        data: {
          startTime: "10:00",
          endTime: "13:00",
        },
      });
    });

    it("should return HTTP 404 if slot does not exist or belongs to another doctor", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAvailability.findFirst.mockResolvedValueOnce(null); // Not found for this doctor

      const response = await request(app)
        .put(`/api/doctors/availability/${validAvailabilityId}`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          startTime: "10:00",
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "Doctor availability slot not found",
      });
      expect(mockAvailability.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 409 if updated slot overlaps with another existing slot", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAvailability.findFirst.mockResolvedValueOnce({
        id: validAvailabilityId,
        doctorId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
      } as any);

      mockAvailability.findMany.mockResolvedValueOnce([
        {
          id: "other-slot",
          doctorId,
          dayOfWeek: 1,
          startTime: "13:00",
          endTime: "16:00",
        } as any,
      ]);

      const response = await request(app)
        .put(`/api/doctors/availability/${validAvailabilityId}`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          endTime: "14:00", // Would overlap with 13:00-16:00
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Doctor availability slot overlaps with an existing slot");
      expect(mockAvailability.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 for malformed availability ID parameter", async () => {
      const response = await request(app)
        .put("/api/doctors/availability/not-a-valid-uuid")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          startTime: "10:00",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });
  });

  // ------------------------------------------
  // DELETE /api/doctors/availability/:id
  // ------------------------------------------
  describe("DELETE /api/doctors/availability/:id", () => {
    it("should delete availability slot belonging to authenticated doctor with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAvailability.findFirst.mockResolvedValueOnce({
        id: validAvailabilityId,
        doctorId,
      } as any);

      mockAvailability.delete.mockResolvedValueOnce({} as any);

      const response = await request(app)
        .delete(`/api/doctors/availability/${validAvailabilityId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Doctor availability deleted successfully");

      expect(mockAvailability.delete).toHaveBeenCalledWith({
        where: { id: validAvailabilityId },
      });
    });

    it("should return HTTP 404 if slot does not exist or belongs to another doctor", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAvailability.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/doctors/availability/${validAvailabilityId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "Doctor availability slot not found",
      });
      expect(mockAvailability.delete).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 for malformed availability ID parameter", async () => {
      const response = await request(app)
        .delete("/api/doctors/availability/malformed-id-123")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).delete(`/api/doctors/availability/${validAvailabilityId}`);
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .delete(`/api/doctors/availability/${validAvailabilityId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // PATIENT DOCTOR DISCOVERY & SEARCH ENDPOINTS
  // ==========================================
  describe("PATIENT Doctor Discovery & Search API", () => {
    const validDoctorUuid = "123e4567-e89b-12d3-a456-426614174000";

    const mockPublicDoctor = {
      id: validDoctorUuid,
      userId: "doc-user-1",
      licenseNumber: "MD-111111",
      experienceYears: 8,
      bio: "Top cardiologist",
      consultationFee: 120.0,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
      specialization: {
        id: specializationId,
        name: "Cardiology",
        description: "Heart care",
      },
      user: {
        id: "doc-user-1",
        email: "cardiologist@mediflow.com",
        firstName: "Sarah",
        lastName: "Jenkins",
        phoneNumber: "+15551234567",
        role: UserRole.DOCTOR,
        isActive: true,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        updatedAt: new Date("2026-09-01T00:00:00.000Z"),
      },
    };

    describe("GET /api/doctors - RBAC & Authentication", () => {
      it("should return HTTP 401 for unauthenticated request", async () => {
        const response = await request(app).get("/api/doctors");
        expect(response.status).toBe(401);
      });

      it("should return HTTP 403 for DOCTOR role", async () => {
        const response = await request(app)
          .get("/api/doctors")
          .set("Authorization", `Bearer ${doctorToken}`);

        expect(response.status).toBe(403);
      });

      it("should return HTTP 403 for ADMIN role", async () => {
        const response = await request(app)
          .get("/api/doctors")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(403);
      });

      it("should allow PATIENT role with HTTP 200", async () => {
        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get("/api/doctors")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("success");
        expect(response.body.data).toHaveLength(1);
      });
    });

    describe("GET /api/doctors - Filters, Pagination, & Search", () => {
      it("should return active doctors and exclude inactive ones", async () => {
        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get("/api/doctors")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(mockDoctor.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              user: { isActive: true },
            }),
          })
        );
      });

      it("should support default pagination (page=1, limit=20)", async () => {
        mockDoctor.count.mockResolvedValueOnce(15);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get("/api/doctors")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 15,
          totalPages: 1,
        });
      });

      it("should support custom pagination (page=2, limit=5)", async () => {
        mockDoctor.count.mockResolvedValueOnce(12);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get("/api/doctors?page=2&limit=5")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination).toEqual({
          page: 2,
          limit: 5,
          total: 12,
          totalPages: 3,
        });
        expect(mockDoctor.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 5,
            take: 5,
          })
        );
      });

      it("should support specializationId filter", async () => {
        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get(`/api/doctors?specializationId=${specializationId}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(mockDoctor.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specializationId,
            }),
          })
        );
      });

      it("should support search across firstName, lastName, email, and licenseNumber", async () => {
        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get("/api/doctors?search=Sarah")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(mockDoctor.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: [
                {
                  OR: [
                    { user: { firstName: { contains: "Sarah", mode: "insensitive" } } },
                    { user: { lastName: { contains: "Sarah", mode: "insensitive" } } },
                    { user: { email: { contains: "Sarah", mode: "insensitive" } } },
                    { licenseNumber: { contains: "Sarah", mode: "insensitive" } },
                  ],
                },
              ],
            }),
          })
        );
      });

      it("should support minimum experience filter (minExperience)", async () => {
        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get("/api/doctors?minExperience=5")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(mockDoctor.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              experienceYears: { gte: 5 },
            }),
          })
        );
      });

      it("should support maximum consultation fee filter (maxFee)", async () => {
        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get("/api/doctors?maxFee=150")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(mockDoctor.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              consultationFee: { lte: 150 },
            }),
          })
        );
      });

      it("should support sorting by experience and consultationFee", async () => {
        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const res1 = await request(app)
          .get("/api/doctors?sortBy=experience")
          .set("Authorization", `Bearer ${patientToken}`);
        expect(res1.status).toBe(200);
        expect(mockDoctor.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: [{ experienceYears: "desc" }, { createdAt: "desc" }],
          })
        );

        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const res2 = await request(app)
          .get("/api/doctors?sortBy=consultationFee")
          .set("Authorization", `Bearer ${patientToken}`);
        expect(res2.status).toBe(200);
        expect(mockDoctor.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: [{ consultationFee: "asc" }, { createdAt: "desc" }],
          })
        );
      });

      it("should return HTTP 400 for invalid query parameters (limit>100, negative minExperience, etc)", async () => {
        const res1 = await request(app)
          .get("/api/doctors?limit=150")
          .set("Authorization", `Bearer ${patientToken}`);
        expect(res1.status).toBe(400);

        const res2 = await request(app)
          .get("/api/doctors?minExperience=-5")
          .set("Authorization", `Bearer ${patientToken}`);
        expect(res2.status).toBe(400);

        const res3 = await request(app)
          .get("/api/doctors?sortBy=invalidSort")
          .set("Authorization", `Bearer ${patientToken}`);
        expect(res3.status).toBe(400);
      });

      it("should NEVER expose passwordHash or auth secrets", async () => {
        mockDoctor.count.mockResolvedValueOnce(1);
        mockDoctor.findMany.mockResolvedValueOnce([mockPublicDoctor] as any);

        const response = await request(app)
          .get("/api/doctors")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        const doctorData = response.body.data[0];
        expect(doctorData.user.passwordHash).toBeUndefined();
        expect(doctorData.passwordHash).toBeUndefined();
      });

      it("should return empty result correctly when no doctors match", async () => {
        mockDoctor.count.mockResolvedValueOnce(0);
        mockDoctor.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
          .get("/api/doctors?search=NonExistent")
          .set("Authorization", `Bearer ${patientToken}`);

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

    describe("GET /api/doctors/:id - Profile Lookup by ID", () => {
      it("should allow PATIENT to retrieve active doctor profile by UUID", async () => {
        mockDoctor.findFirst.mockResolvedValueOnce(mockPublicDoctor as any);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("success");
        expect(response.body.data.id).toBe(validDoctorUuid);
        expect(response.body.data.user.email).toBe("cardiologist@mediflow.com");
        expect(response.body.data.user.passwordHash).toBeUndefined();
      });

      it("should return HTTP 404 if doctor is inactive", async () => {
        mockDoctor.findFirst.mockResolvedValueOnce(null);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Doctor not found");
      });

      it("should return HTTP 404 if doctor does not exist", async () => {
        mockDoctor.findFirst.mockResolvedValueOnce(null);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Doctor not found");
      });

      it("should return HTTP 400 for invalid UUID parameter", async () => {
        const response = await request(app)
          .get("/api/doctors/invalid-uuid-format")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");
      });

      it("should NEVER expose passwordHash in single doctor lookup", async () => {
        mockDoctor.findFirst.mockResolvedValueOnce(mockPublicDoctor as any);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.user.passwordHash).toBeUndefined();
      });
    });
  });

  // ==========================================
  // APPOINTMENT SLOT GENERATION API ENDPOINT
  // ==========================================
  describe("APPOINTMENT SLOT GENERATION API - GET /api/doctors/:doctorId/slots", () => {
    const validDoctorUuid = "123e4567-e89b-12d3-a456-426614174000";

    const mockActiveDoctor = {
      id: validDoctorUuid,
      userId: "doc-user-1",
      licenseNumber: "MD-999999",
      user: {
        id: "doc-user-1",
        isActive: true,
      },
    };

    const getFutureDateInfo = (daysInFuture = 30) => {
      const now = new Date();
      const futureDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysInFuture));
      const year = futureDate.getUTCFullYear();
      const month = String(futureDate.getUTCMonth() + 1).padStart(2, "0");
      const day = String(futureDate.getUTCDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = futureDate.getUTCDay();
      return { dateStr, dayOfWeek, year: Number(year), month: Number(month), day: Number(day) };
    };

    describe("Authentication & RBAC", () => {
      it("should return HTTP 401 for unauthenticated request", async () => {
        const { dateStr } = getFutureDateInfo();
        const response = await request(app).get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`);
        expect(response.status).toBe(401);
      });

      it("should return HTTP 403 for DOCTOR role", async () => {
        const { dateStr } = getFutureDateInfo();
        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${doctorToken}`);

        expect(response.status).toBe(403);
      });

      it("should return HTTP 403 for ADMIN role", async () => {
        const { dateStr } = getFutureDateInfo();
        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(403);
      });

      it("should allow PATIENT role with HTTP 200", async () => {
        const { dateStr, dayOfWeek } = getFutureDateInfo();
        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([
          {
            id: "avail-1",
            doctorId: validDoctorUuid,
            dayOfWeek,
            startTime: "09:00",
            endTime: "11:00",
            slotDuration: 30,
            isAvailable: true,
          } as any,
        ]);
        mockAppointment.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("success");
        expect(response.body.data.doctorId).toBe(validDoctorUuid);
        expect(response.body.data.date).toBe(dateStr);
        expect(response.body.data.slots).toHaveLength(4);
      });
    });

    describe("Doctor Validation", () => {
      it("should return HTTP 400 for invalid doctor UUID parameter", async () => {
        const { dateStr } = getFutureDateInfo();
        const response = await request(app)
          .get(`/api/doctors/invalid-uuid/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");
      });

      it("should return HTTP 404 for nonexistent doctor", async () => {
        const { dateStr } = getFutureDateInfo();
        mockDoctor.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Doctor not found");
      });

      it("should return HTTP 404 for doctor with inactive associated user", async () => {
        const { dateStr } = getFutureDateInfo();
        mockDoctor.findUnique.mockResolvedValueOnce({
          id: validDoctorUuid,
          user: { isActive: false },
        } as any);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Doctor not found");
      });
    });

    describe("Date Validation", () => {
      it("should return HTTP 400 if date query parameter is missing", async () => {
        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");
      });

      it("should return HTTP 400 for malformed date string", async () => {
        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=invalid-date`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");
      });

      it("should return HTTP 400 for impossible calendar date (e.g. 2026-02-31)", async () => {
        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=2026-02-31`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");
      });

      it("should return HTTP 400 for completely past date", async () => {
        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=2020-01-01`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Date cannot be in the past");
      });
    });

    describe("Slot Generation & Availability", () => {
      it("should return empty slots array if doctor has no availability on that day", async () => {
        const { dateStr } = getFutureDateInfo();
        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.slots).toEqual([]);
      });

      it("should generate correct 30-minute slots ending exactly at availability end time", async () => {
        const { dateStr, dayOfWeek, year, month, day } = getFutureDateInfo();
        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([
          {
            id: "avail-1",
            doctorId: validDoctorUuid,
            dayOfWeek,
            startTime: "10:00",
            endTime: "12:00",
            slotDuration: 30,
            isAvailable: true,
          } as any,
        ]);
        mockAppointment.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        const slots = response.body.data.slots;
        expect(slots).toHaveLength(4);

        const pad = (n: number) => String(n).padStart(2, "0");
        const datePrefix = `${year}-${pad(month)}-${pad(day)}`;

        expect(slots[0]).toEqual({
          startTime: `${datePrefix}T10:00:00.000Z`,
          endTime: `${datePrefix}T10:30:00.000Z`,
          available: true,
        });
        expect(slots[3]).toEqual({
          startTime: `${datePrefix}T11:30:00.000Z`,
          endTime: `${datePrefix}T12:00:00.000Z`,
          available: true,
        });
      });

      it("should support custom slotDuration (e.g. 45 minutes) and omit partial slots extending past end time", async () => {
        const { dateStr, dayOfWeek } = getFutureDateInfo();
        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([
          {
            id: "avail-1",
            doctorId: validDoctorUuid,
            dayOfWeek,
            startTime: "10:00",
            endTime: "12:00",
            slotDuration: 45,
            isAvailable: true,
          } as any,
        ]);
        mockAppointment.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        const slots = response.body.data.slots;
        // 10:00-10:45, 10:45-11:30 (next 11:30-12:15 exceeds 12:00 -> omitted)
        expect(slots).toHaveLength(2);
      });
    });

    describe("Existing Appointments Overlap Logic", () => {
      it("should block slots overlapping PENDING, CONFIRMED, COMPLETED, or NO_SHOW appointments, but ignore CANCELLED ones", async () => {
        const { dateStr, dayOfWeek, year, month, day } = getFutureDateInfo();
        const pad = (n: number) => String(n).padStart(2, "0");
        const datePrefix = `${year}-${pad(month)}-${pad(day)}`;

        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([
          {
            id: "avail-1",
            doctorId: validDoctorUuid,
            dayOfWeek,
            startTime: "10:00",
            endTime: "12:00",
            slotDuration: 30,
            isAvailable: true,
          } as any,
        ]);

        mockAppointment.findMany.mockResolvedValueOnce([
          {
            id: "app-pending",
            doctorId: validDoctorUuid,
            status: "PENDING",
            startTime: new Date(`${datePrefix}T10:00:00.000Z`),
            endTime: new Date(`${datePrefix}T10:30:00.000Z`),
          } as any,
        ]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        const slots = response.body.data.slots;
        expect(slots[0].available).toBe(false); // 10:00-10:30 blocked by PENDING
        expect(slots[1].available).toBe(true);  // 10:30-11:00 free
      });

      it("should block all slots overlapped by multi-slot or partially overlapping appointments", async () => {
        const { dateStr, dayOfWeek, year, month, day } = getFutureDateInfo();
        const pad = (n: number) => String(n).padStart(2, "0");
        const datePrefix = `${year}-${pad(month)}-${pad(day)}`;

        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([
          {
            id: "avail-1",
            doctorId: validDoctorUuid,
            dayOfWeek,
            startTime: "10:00",
            endTime: "12:00",
            slotDuration: 30,
            isAvailable: true,
          } as any,
        ]);

        // Appointment 10:15 - 11:15 overlaps 10:00-10:30, 10:30-11:00, and 11:00-11:30
        mockAppointment.findMany.mockResolvedValueOnce([
          {
            id: "app-multi",
            doctorId: validDoctorUuid,
            status: "CONFIRMED",
            startTime: new Date(`${datePrefix}T10:15:00.000Z`),
            endTime: new Date(`${datePrefix}T11:15:00.000Z`),
          } as any,
        ]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        const slots = response.body.data.slots;
        expect(slots[0].available).toBe(false); // 10:00-10:30
        expect(slots[1].available).toBe(false); // 10:30-11:00
        expect(slots[2].available).toBe(false); // 11:00-11:30
        expect(slots[3].available).toBe(true);  // 11:30-12:00
      });
    });

    describe("Multiple Availability Windows & Today Filter", () => {
      it("should generate slots across multiple non-overlapping windows and deduplicate overlapping ones", async () => {
        const { dateStr, dayOfWeek } = getFutureDateInfo();
        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([
          {
            id: "avail-morning",
            doctorId: validDoctorUuid,
            dayOfWeek,
            startTime: "09:00",
            endTime: "10:00",
            slotDuration: 30,
            isAvailable: true,
          } as any,
          {
            id: "avail-afternoon",
            doctorId: validDoctorUuid,
            dayOfWeek,
            startTime: "14:00",
            endTime: "15:00",
            slotDuration: 30,
            isAvailable: true,
          } as any,
        ]);
        mockAppointment.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        const slots = response.body.data.slots;
        expect(slots).toHaveLength(4); // 2 in morning + 2 in afternoon
      });

      it("should exclude already-passed slots when date is today", async () => {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, "0");
        const day = String(now.getUTCDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;
        const dayOfWeek = now.getUTCDay();

        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([
          {
            id: "avail-all-day",
            doctorId: validDoctorUuid,
            dayOfWeek,
            startTime: "00:00",
            endTime: "23:59",
            slotDuration: 30,
            isAvailable: true,
          } as any,
        ]);
        mockAppointment.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${todayStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        const slots = response.body.data.slots;

        // Every returned slot for today must have startTime > now
        for (const slot of slots) {
          expect(new Date(slot.startTime).getTime()).toBeGreaterThan(now.getTime());
        }
      });
    });

    describe("Security & Field Exposure", () => {
      it("should NEVER expose passwordHash or internal auth data in response", async () => {
        const { dateStr } = getFutureDateInfo();
        mockDoctor.findUnique.mockResolvedValueOnce(mockActiveDoctor as any);
        mockAvailability.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
          .get(`/api/doctors/${validDoctorUuid}/slots?date=${dateStr}`)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.passwordHash).toBeUndefined();
        expect(response.body.data.user).toBeUndefined();
      });
    });
  });
});
