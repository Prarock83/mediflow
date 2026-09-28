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
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockAvailability = prisma.doctorAvailability as jest.Mocked<typeof prisma.doctorAvailability>;
const mockSpecialization = prisma.specialization as jest.Mocked<typeof prisma.specialization>;

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
});
