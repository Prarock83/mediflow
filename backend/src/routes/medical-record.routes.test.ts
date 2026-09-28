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
    },
    patient: {
      findUnique: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    medicalRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;
const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;
const mockMedicalRecord = prisma.medicalRecord as jest.Mocked<typeof prisma.medicalRecord>;

describe("Medical Record Routes - /api/medical-records", () => {
  const doctorUserId = "doctor-uuid-202";
  const doctorId = "doc-1";
  const otherDoctorUserId = "doctor-uuid-999";
  const otherDoctorId = "doc-999";

  const patientUserId = "patient-uuid-101";
  const patientId = "pat-1";
  const otherPatientUserId = "patient-uuid-888";
  const otherPatientId = "pat-888";

  const adminUserId = "admin-uuid-303";
  const appointmentId = "app-uuid-123";
  const validRecordId = "123e4567-e89b-12d3-a456-426614174000";

  let doctorToken: string;
  let otherDoctorToken: string;
  let patientToken: string;
  let otherPatientToken: string;
  let adminToken: string;

  beforeAll(() => {
    doctorToken = jwt.sign(
      { id: doctorUserId, role: UserRole.DOCTOR },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    otherDoctorToken = jwt.sign(
      { id: otherDoctorUserId, role: UserRole.DOCTOR },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    patientToken = jwt.sign(
      { id: patientUserId, role: UserRole.PATIENT },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    otherPatientToken = jwt.sign(
      { id: otherPatientUserId, role: UserRole.PATIENT },
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
  // POST /api/medical-records
  // ==========================================
  describe("POST /api/medical-records", () => {
    it("should allow a doctor to create a medical record for an appointment with HTTP 201", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        patientId,
      } as any);

      (mockMedicalRecord.create as jest.Mock).mockResolvedValueOnce({
        id: validRecordId,
        patientId,
        title: "Blood Test Results",
        description: "Hemoglobin normal",
        recordDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: patientId,
          user: {
            firstName: "Alice",
            lastName: "Smith",
          },
        },
        documents: [],
      });

      const response = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          title: "Blood Test Results",
          description: "Hemoglobin normal",
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Medical record created successfully");
      expect(response.body.data.id).toBe(validRecordId);
      expect(response.body.data.title).toBe("Blood Test Results");

      expect(mockMedicalRecord.create).toHaveBeenCalledWith({
        data: {
          patientId,
          title: "Blood Test Results",
          description: "Hemoglobin normal",
          recordDate: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 404 if doctor profile does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          title: "Blood Test Results",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Doctor profile not found");

      expect(mockMedicalRecord.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 for an appointment belonging to another doctor", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        doctorId: otherDoctorId, // Belongs to another doctor
        patientId,
      } as any);

      const response = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          title: "Blood Test Results",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Appointment not found");

      expect(mockMedicalRecord.create).not.toHaveBeenCalled();
    });

    it("should ignore patientId and doctorId injected in request body and resolve via relationship", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        patientId,
      } as any);

      (mockMedicalRecord.create as jest.Mock).mockResolvedValueOnce({
        id: validRecordId,
        patientId,
        title: "Blood Test Results",
      });

      const response = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          patientId: "hacked-patient-id",
          doctorId: "hacked-doctor-id",
          title: "Blood Test Results",
        });

      expect(response.status).toBe(201);
      expect(mockMedicalRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId, // Resolved from appointment relationship
        }),
        include: expect.any(Object),
      });
    });

    it("should return HTTP 400 for missing title", async () => {
      const response = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          title: "",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/medical-records")
        .send({
          appointmentId,
          title: "Blood Test Results",
        });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .post("/api/medical-records")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          appointmentId,
          title: "Blood Test Results",
        });

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // GET /api/medical-records/:id
  // ==========================================
  describe("GET /api/medical-records/:id", () => {
    const sampleRecord = {
      id: validRecordId,
      patientId,
      title: "Chest X-Ray",
      description: "Clear lungs",
      recordDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: {
        id: patientId,
        userId: patientUserId,
        user: {
          firstName: "Alice",
          lastName: "Smith",
        },
      },
      documents: [],
    };

    it("should allow patient to access their own medical record with HTTP 200", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce(sampleRecord as any);

      const response = await request(app)
        .get(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(validRecordId);
      expect(response.body.data.title).toBe("Chest X-Ray");
    });

    it("should return HTTP 404 when a patient attempts to access another patient's medical record", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce(sampleRecord as any);

      const response = await request(app)
        .get(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Medical record not found");
    });

    it("should allow an authorized doctor (with appointment relation) to view the medical record with HTTP 200", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce(sampleRecord as any);
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        patientId,
      } as any);

      const response = await request(app)
        .get(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(validRecordId);
    });

    it("should return HTTP 404 when an unrelated doctor (without appointment relation) attempts to view record", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce(sampleRecord as any);
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: otherDoctorId,
        userId: otherDoctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce(null); // No relation

      const response = await request(app)
        .get(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${otherDoctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Medical record not found");
    });

    it("should return HTTP 404 for nonexistent medical record", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get(
        `/api/medical-records/${validRecordId}`
      );

      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // GET /api/medical-records/my
  // ==========================================
  describe("GET /api/medical-records/my", () => {
    it("should return records belonging strictly to authenticated PATIENT with HTTP 200", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: patientId,
        userId: patientUserId,
      } as any);

      const mockPatientRecords = [
        {
          id: validRecordId,
          patientId,
          title: "Annual Checkup Report",
          recordDate: new Date(),
        },
      ];

      mockMedicalRecord.findMany.mockResolvedValueOnce(mockPatientRecords as any);

      const response = await request(app)
        .get("/api/medical-records/my")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe("Annual Checkup Report");

      expect(mockMedicalRecord.findMany).toHaveBeenCalledWith({
        where: { patientId },
        include: expect.any(Object),
        orderBy: { recordDate: "desc" },
      });
    });

    it("should return records for patients belonging to authenticated DOCTOR with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findMany.mockResolvedValueOnce([
        { patientId },
      ] as any);

      const mockDoctorRecords = [
        {
          id: validRecordId,
          patientId,
          title: "Lab Report",
        },
      ];

      mockMedicalRecord.findMany.mockResolvedValueOnce(mockDoctorRecords as any);

      const response = await request(app)
        .get("/api/medical-records/my")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);

      expect(mockMedicalRecord.findMany).toHaveBeenCalledWith({
        where: { patientId: { in: [patientId] } },
        include: expect.any(Object),
        orderBy: { recordDate: "desc" },
      });
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .get("/api/medical-records/my")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/medical-records/my");

      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // PUT /api/medical-records/:id
  // ==========================================
  describe("PUT /api/medical-records/:id", () => {
    it("should allow authorized doctor to update a medical record with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: validRecordId,
        patientId,
        title: "Old Title",
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        patientId,
      } as any);

      mockMedicalRecord.update.mockResolvedValueOnce({
        id: validRecordId,
        patientId,
        title: "Updated Title",
        description: "Updated description",
      } as any);

      const response = await request(app)
        .put(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          title: "Updated Title",
          description: "Updated description",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Medical record updated successfully");
      expect(response.body.data.title).toBe("Updated Title");

      expect(mockMedicalRecord.update).toHaveBeenCalledWith({
        where: { id: validRecordId },
        data: {
          title: "Updated Title",
          description: "Updated description",
        },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 404 if record belongs to a patient outside doctor's scope", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: validRecordId,
        patientId: otherPatientId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce(null); // No relation

      const response = await request(app)
        .put(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          title: "Updated Title",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Medical record not found");
      expect(mockMedicalRecord.update).not.toHaveBeenCalled();
    });

    it("should ignore patientId and doctorId injected in PUT payload", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: validRecordId,
        patientId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        patientId,
      } as any);

      mockMedicalRecord.update.mockResolvedValueOnce({
        id: validRecordId,
        patientId,
        title: "Safe Updated Title",
      } as any);

      const response = await request(app)
        .put(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          patientId: "hacked-patient-id",
          doctorId: "hacked-doctor-id",
          title: "Safe Updated Title",
        });

      expect(response.status).toBe(200);
      expect(mockMedicalRecord.update).toHaveBeenCalledWith({
        where: { id: validRecordId },
        data: {
          title: "Safe Updated Title",
        },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 400 for empty title in update payload", async () => {
      const response = await request(app)
        .put(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          title: "",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .put(`/api/medical-records/${validRecordId}`)
        .send({
          title: "Updated Title",
        });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .put(`/api/medical-records/${validRecordId}`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          title: "Updated Title",
        });

      expect(response.status).toBe(403);
    });
  });
});
