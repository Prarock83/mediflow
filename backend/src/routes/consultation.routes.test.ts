import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole, AppointmentStatus } from "@prisma/client";
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
    },
    consultation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;
const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;
const mockConsultation = prisma.consultation as jest.Mocked<typeof prisma.consultation>;

describe("Consultation Routes - /api/consultations", () => {
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
  const validConsultationId = "123e4567-e89b-12d3-a456-426614174000";

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
  // POST /api/consultations
  // ==========================================
  describe("POST /api/consultations", () => {
    it("should allow a doctor to create a consultation for a CONFIRMED appointment with HTTP 201", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        patientId,
        status: AppointmentStatus.CONFIRMED,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce(null); // No existing consultation

      (mockConsultation.create as jest.Mock).mockResolvedValueOnce({
        id: validConsultationId,
        appointmentId,
        doctorId,
        diagnosis: "Acute Respiratory Infection",
        notes: "Rest and hydration recommended",
        symptoms: "Cough and fever",
        createdAt: new Date(),
        updatedAt: new Date(),
        appointment: {
          id: appointmentId,
          patient: {
            user: {
              firstName: "Alice",
              lastName: "Smith",
            },
          },
        },
        doctor: {
          id: doctorId,
          user: {
            firstName: "John",
            lastName: "Doe",
          },
        },
      });

      const response = await request(app)
        .post("/api/consultations")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: "Acute Respiratory Infection",
          notes: "Rest and hydration recommended",
          symptoms: "Cough and fever",
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Consultation record created successfully");
      expect(response.body.data.id).toBe(validConsultationId);
      expect(response.body.data.diagnosis).toBe("Acute Respiratory Infection");

      expect(mockConsultation.create).toHaveBeenCalledWith({
        data: {
          appointmentId,
          doctorId,
          diagnosis: "Acute Respiratory Infection",
          notes: "Rest and hydration recommended",
          symptoms: "Cough and fever",
        },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 404 if appointment does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/consultations")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId: "non-existent-app-id",
          diagnosis: "Flu",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Appointment not found");
      expect(mockConsultation.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 if appointment belongs to another doctor", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        doctorId: otherDoctorId, // Belongs to another doctor
        status: AppointmentStatus.CONFIRMED,
      } as any);

      const response = await request(app)
        .post("/api/consultations")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: "Flu",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Appointment not found");
      expect(mockConsultation.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 if appointment status is invalid (e.g. PENDING or CANCELLED)", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        status: AppointmentStatus.PENDING,
      } as any);

      const response = await request(app)
        .post("/api/consultations")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: "Flu",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Consultation can only be created for confirmed or completed appointments"
      );
      expect(mockConsultation.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 409 if a consultation already exists for the appointment", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        status: AppointmentStatus.CONFIRMED,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce({
        id: "existing-consultation-id",
        appointmentId,
      } as any);

      const response = await request(app)
        .post("/api/consultations")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: "Flu",
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        "Consultation already exists for this appointment"
      );
      expect(mockConsultation.create).not.toHaveBeenCalled();
    });

    it("should ignore patientId and doctorId injected in request body", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        doctorId,
        status: AppointmentStatus.CONFIRMED,
      } as any);

      mockConsultation.findUnique.mockResolvedValueOnce(null);

      (mockConsultation.create as jest.Mock).mockResolvedValueOnce({
        id: validConsultationId,
        appointmentId,
        doctorId,
        diagnosis: "Flu",
      });

      const response = await request(app)
        .post("/api/consultations")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: "Flu",
          doctorId: "hacked-doctor-id",
          patientId: "hacked-patient-id",
        });

      expect(response.status).toBe(201);
      expect(mockConsultation.create).toHaveBeenCalledWith({
        data: {
          appointmentId,
          doctorId,
          diagnosis: "Flu",
        },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 400 for missing required fields (e.g. missing diagnosis)", async () => {
      const response = await request(app)
        .post("/api/consultations")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          diagnosis: "",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/consultations")
        .send({
          appointmentId,
          diagnosis: "Flu",
        });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .post("/api/consultations")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          appointmentId,
          diagnosis: "Flu",
        });

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // GET /api/consultations/:id
  // ==========================================
  describe("GET /api/consultations/:id", () => {
    const sampleConsultation = {
      id: validConsultationId,
      appointmentId,
      doctorId,
      diagnosis: "Hypertension",
      notes: "Monitor blood pressure daily",
      symptoms: "Headache",
      createdAt: new Date(),
      updatedAt: new Date(),
      doctor: {
        id: doctorId,
        userId: doctorUserId,
        user: {
          firstName: "John",
          lastName: "Doe",
        },
      },
      appointment: {
        id: appointmentId,
        patientId,
        patient: {
          id: patientId,
          userId: patientUserId,
          user: {
            firstName: "Alice",
            lastName: "Smith",
          },
        },
      },
    };

    it("should allow the assigned doctor to view their own consultation with HTTP 200", async () => {
      mockConsultation.findUnique.mockResolvedValueOnce(sampleConsultation as any);

      const response = await request(app)
        .get(`/api/consultations/${validConsultationId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(validConsultationId);
      expect(response.body.data.diagnosis).toBe("Hypertension");
    });

    it("should allow the patient of the appointment to view their consultation with HTTP 200", async () => {
      mockConsultation.findUnique.mockResolvedValueOnce(sampleConsultation as any);

      const response = await request(app)
        .get(`/api/consultations/${validConsultationId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(validConsultationId);
    });

    it("should return HTTP 404 when another doctor attempts to view the consultation", async () => {
      mockConsultation.findUnique.mockResolvedValueOnce(sampleConsultation as any);

      const response = await request(app)
        .get(`/api/consultations/${validConsultationId}`)
        .set("Authorization", `Bearer ${otherDoctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Consultation not found");
    });

    it("should return HTTP 404 when another patient attempts to view the consultation", async () => {
      mockConsultation.findUnique.mockResolvedValueOnce(sampleConsultation as any);

      const response = await request(app)
        .get(`/api/consultations/${validConsultationId}`)
        .set("Authorization", `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Consultation not found");
    });

    it("should return HTTP 404 for non-existent consultation", async () => {
      mockConsultation.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/consultations/${validConsultationId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Consultation not found");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get(
        `/api/consultations/${validConsultationId}`
      );

      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // GET /api/consultations/my
  // ==========================================
  describe("GET /api/consultations/my", () => {
    it("should return consultations belonging strictly to authenticated PATIENT with HTTP 200", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: patientId,
        userId: patientUserId,
      } as any);

      const mockPatientConsultations = [
        {
          id: validConsultationId,
          appointmentId,
          doctorId,
          diagnosis: "Asthma",
          doctor: {
            id: doctorId,
            user: { firstName: "John", lastName: "Doe" },
          },
        },
      ];

      mockConsultation.findMany.mockResolvedValueOnce(mockPatientConsultations as any);

      const response = await request(app)
        .get("/api/consultations/my")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].diagnosis).toBe("Asthma");

      expect(mockConsultation.findMany).toHaveBeenCalledWith({
        where: {
          appointment: {
            patientId,
          },
        },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return consultations belonging strictly to authenticated DOCTOR with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      const mockDoctorConsultations = [
        {
          id: validConsultationId,
          appointmentId,
          doctorId,
          diagnosis: "Diabetes",
          appointment: {
            patient: {
              user: { firstName: "Alice", lastName: "Smith" },
            },
          },
        },
      ];

      mockConsultation.findMany.mockResolvedValueOnce(mockDoctorConsultations as any);

      const response = await request(app)
        .get("/api/consultations/my")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].diagnosis).toBe("Diabetes");

      expect(mockConsultation.findMany).toHaveBeenCalledWith({
        where: {
          doctorId,
        },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .get("/api/consultations/my")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/consultations/my");

      expect(response.status).toBe(401);
    });
  });
});
