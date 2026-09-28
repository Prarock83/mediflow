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
    consultation: {
      findUnique: jest.fn(),
    },
    prescription: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;
const mockConsultation = prisma.consultation as jest.Mocked<typeof prisma.consultation>;
const mockPrescription = prisma.prescription as jest.Mocked<typeof prisma.prescription>;

describe("Prescription Routes - /api/prescriptions", () => {
  const doctorUserId = "doctor-uuid-202";
  const doctorId = "doc-1";
  const otherDoctorUserId = "doctor-uuid-999";
  const otherDoctorId = "doc-999";

  const patientUserId = "patient-uuid-101";
  const patientId = "pat-1";
  const otherPatientUserId = "patient-uuid-888";
  const otherPatientId = "pat-888";

  const adminUserId = "admin-uuid-303";
  const consultationId = "consultation-uuid-123";
  const validPrescriptionId = "123e4567-e89b-12d3-a456-426614174000";

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
  // POST /api/prescriptions
  // ==========================================
  describe("POST /api/prescriptions", () => {
    it("should allow a doctor to create a prescription with items with HTTP 201", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce({
        id: consultationId,
        doctorId,
        appointment: {
          patientId,
        },
      } as any);

      mockPrescription.findUnique.mockResolvedValueOnce(null); // No duplicate

      (mockPrescription.create as jest.Mock).mockResolvedValueOnce({
        id: validPrescriptionId,
        consultationId,
        doctorId,
        patientId,
        instructions: "Take with food",
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: "item-1",
            medicationName: "Amoxicillin",
            dosage: "500mg",
            frequency: "Three times daily",
            duration: "7 days",
          },
        ],
      });

      const response = await request(app)
        .post("/api/prescriptions")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          consultationId,
          instructions: "Take with food",
          items: [
            {
              medicationName: "Amoxicillin",
              dosage: "500mg",
              frequency: "Three times daily",
              duration: "7 days",
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Prescription created successfully");
      expect(response.body.data.id).toBe(validPrescriptionId);
      expect(response.body.data.items).toHaveLength(1);

      expect(mockPrescription.create).toHaveBeenCalledWith({
        data: {
          consultationId,
          doctorId,
          patientId,
          instructions: "Take with food",
          items: {
            create: [
              {
                medicationName: "Amoxicillin",
                dosage: "500mg",
                frequency: "Three times daily",
                duration: "7 days",
              },
            ],
          },
        },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 404 if consultation does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/prescriptions")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          consultationId: "non-existent-id",
          items: [
            {
              medicationName: "Amoxicillin",
              dosage: "500mg",
              frequency: "Daily",
              duration: "5 days",
            },
          ],
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Consultation not found");
      expect(mockPrescription.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 if consultation belongs to another doctor", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce({
        id: consultationId,
        doctorId: otherDoctorId, // Belongs to another doctor
        appointment: { patientId },
      } as any);

      const response = await request(app)
        .post("/api/prescriptions")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          consultationId,
          items: [
            {
              medicationName: "Amoxicillin",
              dosage: "500mg",
              frequency: "Daily",
              duration: "5 days",
            },
          ],
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Consultation not found");
      expect(mockPrescription.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 409 if a prescription already exists for the consultation", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce({
        id: consultationId,
        doctorId,
        appointment: { patientId },
      } as any);

      mockPrescription.findUnique.mockResolvedValueOnce({
        id: "existing-prescription-id",
        consultationId,
      } as any);

      const response = await request(app)
        .post("/api/prescriptions")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          consultationId,
          items: [
            {
              medicationName: "Amoxicillin",
              dosage: "500mg",
              frequency: "Daily",
              duration: "5 days",
            },
          ],
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        "Prescription already exists for this consultation"
      );
      expect(mockPrescription.create).not.toHaveBeenCalled();
    });

    it("should ignore patientId and doctorId injected in request body and resolve strictly via relations", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce({
        id: consultationId,
        doctorId,
        appointment: { patientId },
      } as any);

      mockPrescription.findUnique.mockResolvedValueOnce(null);

      (mockPrescription.create as jest.Mock).mockResolvedValueOnce({
        id: validPrescriptionId,
        consultationId,
        doctorId,
        patientId,
      });

      const response = await request(app)
        .post("/api/prescriptions")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          consultationId,
          patientId: "hacked-patient-id",
          doctorId: "hacked-doctor-id",
          items: [
            {
              medicationName: "Ibuprofen",
              dosage: "400mg",
              frequency: "As needed",
              duration: "3 days",
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(mockPrescription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          doctorId,
          patientId, // Resolved from consultation.appointment.patientId
        }),
        include: expect.any(Object),
      });
    });

    it("should return HTTP 400 for empty items array or missing required item fields", async () => {
      const response = await request(app)
        .post("/api/prescriptions")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          consultationId,
          items: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/prescriptions")
        .send({
          consultationId,
          items: [
            {
              medicationName: "Amoxicillin",
              dosage: "500mg",
              frequency: "Daily",
              duration: "5 days",
            },
          ],
        });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .post("/api/prescriptions")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          consultationId,
          items: [
            {
              medicationName: "Amoxicillin",
              dosage: "500mg",
              frequency: "Daily",
              duration: "5 days",
            },
          ],
        });

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // GET /api/prescriptions/:id
  // ==========================================
  describe("GET /api/prescriptions/:id", () => {
    const samplePrescription = {
      id: validPrescriptionId,
      consultationId,
      doctorId,
      patientId,
      instructions: "Take after meals",
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: "item-1",
          medicationName: "Paracetamol",
          dosage: "500mg",
          frequency: "Twice daily",
          duration: "5 days",
        },
      ],
      doctor: {
        id: doctorId,
        userId: doctorUserId,
        user: {
          firstName: "John",
          lastName: "Doe",
        },
      },
      patient: {
        id: patientId,
        userId: patientUserId,
        user: {
          firstName: "Alice",
          lastName: "Smith",
        },
      },
    };

    it("should allow doctor to view their created prescription with HTTP 200", async () => {
      mockPrescription.findUnique.mockResolvedValueOnce(samplePrescription as any);

      const response = await request(app)
        .get(`/api/prescriptions/${validPrescriptionId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(validPrescriptionId);
      expect(response.body.data.items).toHaveLength(1);
    });

    it("should allow patient to view their own prescription with HTTP 200", async () => {
      mockPrescription.findUnique.mockResolvedValueOnce(samplePrescription as any);

      const response = await request(app)
        .get(`/api/prescriptions/${validPrescriptionId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(validPrescriptionId);
    });

    it("should return HTTP 404 when another doctor attempts to view the prescription", async () => {
      mockPrescription.findUnique.mockResolvedValueOnce(samplePrescription as any);

      const response = await request(app)
        .get(`/api/prescriptions/${validPrescriptionId}`)
        .set("Authorization", `Bearer ${otherDoctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Prescription not found");
    });

    it("should return HTTP 404 when another patient attempts to view the prescription", async () => {
      mockPrescription.findUnique.mockResolvedValueOnce(samplePrescription as any);

      const response = await request(app)
        .get(`/api/prescriptions/${validPrescriptionId}`)
        .set("Authorization", `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Prescription not found");
    });

    it("should return HTTP 404 for non-existent prescription", async () => {
      mockPrescription.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/prescriptions/${validPrescriptionId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Prescription not found");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get(
        `/api/prescriptions/${validPrescriptionId}`
      );

      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // GET /api/prescriptions/my
  // ==========================================
  describe("GET /api/prescriptions/my", () => {
    it("should return prescriptions belonging strictly to authenticated PATIENT with HTTP 200", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: patientId,
        userId: patientUserId,
      } as any);

      const mockPatientPrescriptions = [
        {
          id: validPrescriptionId,
          consultationId,
          doctorId,
          patientId,
          instructions: "Take after meals",
          items: [],
        },
      ];

      mockPrescription.findMany.mockResolvedValueOnce(mockPatientPrescriptions as any);

      const response = await request(app)
        .get("/api/prescriptions/my")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].patientId).toBe(patientId);

      expect(mockPrescription.findMany).toHaveBeenCalledWith({
        where: { patientId },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return prescriptions created by authenticated DOCTOR with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      const mockDoctorPrescriptions = [
        {
          id: validPrescriptionId,
          consultationId,
          doctorId,
          patientId,
          instructions: "Take after meals",
          items: [],
        },
      ];

      mockPrescription.findMany.mockResolvedValueOnce(mockDoctorPrescriptions as any);

      const response = await request(app)
        .get("/api/prescriptions/my")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].doctorId).toBe(doctorId);

      expect(mockPrescription.findMany).toHaveBeenCalledWith({
        where: { doctorId },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .get("/api/prescriptions/my")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/prescriptions/my");

      expect(response.status).toBe(401);
    });
  });
});
