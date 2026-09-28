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
    appointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;

describe("Doctor Appointment Management Routes - /api/doctors/appointments", () => {
  const doctorUserId = "doctor-uuid-202";
  const doctorId = "doc-1";
  const otherDoctorId = "doc-other-999";
  const patientUserId = "patient-uuid-101";
  const patientId = "pat-1";
  const adminUserId = "admin-uuid-303";
  const validAppointmentId = "123e4567-e89b-12d3-a456-426614174000";

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
  // GET /api/doctors/appointments
  // ==========================================
  describe("GET /api/doctors/appointments", () => {
    it("should return appointments belonging ONLY to authenticated doctor with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      const mockDoctorAppointments = [
        {
          id: validAppointmentId,
          doctorId,
          patientId,
          appointmentDate: new Date("2027-05-10T00:00:00.000Z"),
          startTime: new Date("2027-05-10T10:00:00.000Z"),
          endTime: new Date("2027-05-10T10:30:00.000Z"),
          status: AppointmentStatus.PENDING,
          patient: {
            id: patientId,
            user: {
              id: patientUserId,
              firstName: "Alice",
              lastName: "Smith",
              email: "alice@example.com",
              phoneNumber: "555-0101",
            },
          },
        },
      ];

      mockAppointment.findMany.mockResolvedValueOnce(mockDoctorAppointments as any);

      const response = await request(app)
        .get("/api/doctors/appointments")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].doctorId).toBe(doctorId);

      // Verify credentials are NEVER exposed
      expect(response.body.data[0].patient.user.passwordHash).toBeUndefined();

      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: { doctorId },
        include: expect.any(Object),
        orderBy: { startTime: "asc" },
      });
    });

    it("should return HTTP 404 if doctor profile does not exist", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/doctors/appointments")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Doctor profile not found");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/doctors/appointments");
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get("/api/doctors/appointments")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // GET /api/doctors/appointments/:id
  // ==========================================
  describe("GET /api/doctors/appointments/:id", () => {
    it("should fetch appointment details if it belongs to authenticated doctor with HTTP 200", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        patientId,
        status: AppointmentStatus.PENDING,
        patient: {
          id: patientId,
          user: {
            firstName: "Alice",
            lastName: "Smith",
          },
        },
      } as any);

      const response = await request(app)
        .get(`/api/doctors/appointments/${validAppointmentId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(validAppointmentId);
      expect(response.body.data.doctorId).toBe(doctorId);
    });

    it("should return HTTP 404 if appointment belongs to another doctor", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce(null); // findFirst with doctorId returns null

      const response = await request(app)
        .get(`/api/doctors/appointments/${validAppointmentId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Appointment not found");
    });

    it("should return HTTP 404 for nonexistent appointment", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/doctors/appointments/${validAppointmentId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get(
        `/api/doctors/appointments/${validAppointmentId}`
      );
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get(`/api/doctors/appointments/${validAppointmentId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // PATCH /api/doctors/appointments/:id/status
  // ==========================================
  describe("PATCH /api/doctors/appointments/:id/status", () => {
    it("should allow valid transition PENDING -> CONFIRMED", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.PENDING,
      } as any);

      mockAppointment.update.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.CONFIRMED,
      } as any);

      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.status).toBe(AppointmentStatus.CONFIRMED);

      expect(mockAppointment.update).toHaveBeenCalledWith({
        where: { id: validAppointmentId },
        data: { status: AppointmentStatus.CONFIRMED },
        include: expect.any(Object),
      });
    });

    it("should allow valid transition PENDING -> CANCELLED", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.PENDING,
      } as any);

      mockAppointment.update.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.CANCELLED,
      } as any);

      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ status: AppointmentStatus.CANCELLED });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(AppointmentStatus.CANCELLED);
    });

    it("should allow valid transition CONFIRMED -> COMPLETED", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.CONFIRMED,
      } as any);

      mockAppointment.update.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.COMPLETED,
      } as any);

      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ status: AppointmentStatus.COMPLETED });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(AppointmentStatus.COMPLETED);
    });

    it("should allow valid transition CONFIRMED -> CANCELLED", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.CONFIRMED,
      } as any);

      mockAppointment.update.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.CANCELLED,
      } as any);

      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ status: AppointmentStatus.CANCELLED });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(AppointmentStatus.CANCELLED);
    });

    it("should reject invalid status transition (e.g. COMPLETED -> CONFIRMED) with HTTP 409", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.COMPLETED,
      } as any);

      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(409);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("Invalid appointment status transition");
      expect(mockAppointment.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 for nonexistent appointment or appointment belonging to another doctor", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Appointment not found");
      expect(mockAppointment.update).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 for invalid status value in payload", async () => {
      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ status: "INVALID_STATUS_VALUE" });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should ensure only status is updated and ignore injected fields", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.PENDING,
      } as any);

      mockAppointment.update.mockResolvedValueOnce({
        id: validAppointmentId,
        doctorId,
        status: AppointmentStatus.CONFIRMED,
      } as any);

      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          status: AppointmentStatus.CONFIRMED,
          doctorId: "hacked-doctor-id",
          patientId: "hacked-patient-id",
        });

      expect(response.status).toBe(200);
      expect(mockAppointment.update).toHaveBeenCalledWith({
        where: { id: validAppointmentId },
        data: { status: AppointmentStatus.CONFIRMED },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .patch(`/api/doctors/appointments/${validAppointmentId}/status`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({ status: AppointmentStatus.CONFIRMED });

      expect(response.status).toBe(403);
    });
  });
});
