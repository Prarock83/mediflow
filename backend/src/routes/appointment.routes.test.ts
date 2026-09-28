import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole, AppointmentStatus } from "@prisma/client";
import { app } from "../server";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

// Mock Prisma client to isolate unit/integration tests from actual database
jest.mock("../lib/prisma", () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
    },
    doctor: {
      findUnique: jest.fn(),
    },
    doctorAvailability: {
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;
const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockAvailability = prisma.doctorAvailability as jest.Mocked<typeof prisma.doctorAvailability>;
const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;

describe("Appointment Routes - /api/appointments", () => {
  const patientUserId = "patient-uuid-101";
  const patientId = "pat-1";
  const doctorUserId = "doctor-uuid-202";
  const doctorId = "doc-1";
  const adminUserId = "admin-uuid-303";
  const specializationId = "spec-1";

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
  // POST /api/appointments
  // ==========================================
  describe("POST /api/appointments", () => {
    const futureDate = "2027-05-10T00:00:00.000Z";
    const startTime = "2027-05-10T10:00:00.000Z"; // Monday, 10:00 UTC
    const endTime = "2027-05-10T10:30:00.000Z";   // Monday, 10:30 UTC

    it("should successfully book an appointment with HTTP 201 for authenticated PATIENT", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: patientId,
        userId: patientUserId,
      } as any);

      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
        licenseNumber: "MD-12345",
      } as any);

      mockAvailability.findMany.mockResolvedValueOnce([
        {
          id: "slot-1",
          doctorId,
          dayOfWeek: 1, // Monday
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        } as any,
      ]);

      mockAppointment.findMany.mockResolvedValueOnce([]); // No doctor existing appointments
      mockAppointment.findMany.mockResolvedValueOnce([]); // No patient existing appointments

      (mockAppointment.create as jest.Mock).mockResolvedValueOnce({
        id: "app-1",
        patientId,
        doctorId,
        appointmentDate: new Date(futureDate),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: AppointmentStatus.PENDING,
        reason: "General consultation",
        createdAt: new Date(),
        updatedAt: new Date(),
        doctor: {
          id: doctorId,
          specialization: { name: "General Practice" },
          user: {
            id: doctorUserId,
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@mediflow.com",
            phoneNumber: "555-1234",
          },
        },
      });

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
          reason: "General consultation",
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Appointment booked successfully");
      expect(response.body.data.patientId).toBe(patientId);
      expect(response.body.data.doctorId).toBe(doctorId);
      expect(response.body.data.status).toBe("PENDING");

      // Verify credentials are NEVER returned
      expect(response.body.data.doctor.user.passwordHash).toBeUndefined();

      expect(mockAppointment.create).toHaveBeenCalledWith({
        data: {
          patientId,
          doctorId,
          appointmentDate: new Date(futureDate),
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: AppointmentStatus.PENDING,
          reason: "General consultation",
        },
        include: expect.any(Object),
      });
    });

    it("should return HTTP 404 if patient profile does not exist", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Patient profile not found");
      expect(mockAppointment.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 if doctor does not exist", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({ id: patientId } as any);
      mockDoctor.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId: "non-existent-doc-id",
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Doctor not found");
      expect(mockAppointment.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 if appointment start time is in the past", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({ id: patientId } as any);
      mockDoctor.findUnique.mockResolvedValueOnce({ id: doctorId } as any);

      const pastStartTime = "2020-01-01T10:00:00.000Z";
      const pastEndTime = "2020-01-01T10:30:00.000Z";

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId,
          appointmentDate: "2020-01-01T00:00:00.000Z",
          startTime: pastStartTime,
          endTime: pastEndTime,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Appointment time cannot be in the past");
      expect(mockAppointment.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 400 if doctor has no availability covering the requested time", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({ id: patientId } as any);
      mockDoctor.findUnique.mockResolvedValueOnce({ id: doctorId } as any);

      // Doctor is available 09:00-10:00, but appointment requested for 10:00-10:30 (outside) or unavailable
      mockAvailability.findMany.mockResolvedValueOnce([]);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Doctor is not available at the requested time");
      expect(mockAppointment.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 409 if doctor has a conflicting appointment", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({ id: patientId } as any);
      mockDoctor.findUnique.mockResolvedValueOnce({ id: doctorId } as any);
      mockAvailability.findMany.mockResolvedValueOnce([
        {
          id: "slot-1",
          doctorId,
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        } as any,
      ]);

      // Doctor already has an appointment 09:45-10:15 (overlaps 10:00-10:30)
      mockAppointment.findMany.mockResolvedValueOnce([
        {
          id: "app-existing",
          doctorId,
          startTime: new Date("2027-05-10T09:45:00.000Z"),
          endTime: new Date("2027-05-10T10:15:00.000Z"),
          status: AppointmentStatus.PENDING,
        } as any,
      ]);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Doctor already has an appointment at the requested time");
      expect(mockAppointment.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 409 if patient has a conflicting appointment", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({ id: patientId } as any);
      mockDoctor.findUnique.mockResolvedValueOnce({ id: doctorId } as any);
      mockAvailability.findMany.mockResolvedValueOnce([
        {
          id: "slot-1",
          doctorId,
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        } as any,
      ]);

      mockAppointment.findMany.mockResolvedValueOnce([]); // No doctor conflict
      // Patient already has another appointment at 10:15-10:45 (overlaps 10:00-10:30)
      mockAppointment.findMany.mockResolvedValueOnce([
        {
          id: "app-patient-existing",
          patientId,
          startTime: new Date("2027-05-10T10:15:00.000Z"),
          endTime: new Date("2027-05-10T10:45:00.000Z"),
          status: AppointmentStatus.CONFIRMED,
        } as any,
      ]);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Patient already has an appointment at the requested time");
      expect(mockAppointment.create).not.toHaveBeenCalled();
    });

    it("should ignore patientId injected in request body and resolve ownership strictly from req.user.id", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({ id: patientId } as any);
      mockDoctor.findUnique.mockResolvedValueOnce({ id: doctorId } as any);
      mockAvailability.findMany.mockResolvedValueOnce([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        } as any,
      ]);
      mockAppointment.findMany.mockResolvedValueOnce([]);
      mockAppointment.findMany.mockResolvedValueOnce([]);

      (mockAppointment.create as jest.Mock).mockResolvedValueOnce({
        id: "app-2",
        patientId,
        doctorId,
        status: AppointmentStatus.PENDING,
      });

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          patientId: "hacked-patient-id",
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(201);
      expect(mockAppointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId, // Bound strictly to pat-1 from req.user.id
        }),
        include: expect.any(Object),
      });
      expect(mockAppointment.create).not.toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: "hacked-patient-id",
        }),
        include: expect.any(Object),
      });
    });

    it("should return HTTP 400 if endTime is earlier than startTime", async () => {
      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime: "2027-05-10T11:00:00.000Z",
          endTime: "2027-05-10T10:00:00.000Z",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/appointments")
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(403);
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          doctorId,
          appointmentDate: futureDate,
          startTime,
          endTime,
        });

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // GET /api/appointments/my
  // ==========================================
  describe("GET /api/appointments/my", () => {
    it("should return appointments belonging strictly to authenticated patient with HTTP 200", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: patientId,
        userId: patientUserId,
      } as any);

      const mockAppointments = [
        {
          id: "app-1",
          patientId,
          doctorId,
          startTime: new Date("2027-05-10T10:00:00.000Z"),
          endTime: new Date("2027-05-10T10:30:00.000Z"),
          status: AppointmentStatus.PENDING,
          doctor: {
            id: doctorId,
            specialization: { name: "Cardiology" },
            user: {
              firstName: "Jane",
              lastName: "Smith",
              email: "jane.smith@mediflow.com",
            },
          },
        },
      ];

      mockAppointment.findMany.mockResolvedValueOnce(mockAppointments as any);

      const response = await request(app)
        .get("/api/appointments/my")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].patientId).toBe(patientId);

      // Verify credentials are NEVER exposed
      expect(response.body.data[0].doctor.user.passwordHash).toBeUndefined();

      expect(mockAppointment.findMany).toHaveBeenCalledWith({
        where: { patientId },
        include: expect.any(Object),
        orderBy: { startTime: "asc" },
      });
    });

    it("should return HTTP 404 if patient profile does not exist", async () => {
      mockPatient.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/appointments/my")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Patient profile not found");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/appointments/my");
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .get("/api/appointments/my")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .get("/api/appointments/my")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });
  });
});
