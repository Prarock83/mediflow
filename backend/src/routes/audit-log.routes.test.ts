import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { app } from "../server";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { auditLogService } from "../services/audit-log.service";
import { adminDoctorService } from "../services/admin-doctor.service";
import { adminPatientService } from "../services/admin-patient.service";
import { adminAppointmentService } from "../services/admin-appointment.service";
import { doctorAppointmentService } from "../services/doctor-appointment.service";
import { prescriptionService } from "../services/prescription.service";
import { medicalRecordService } from "../services/medical-record.service";
import { consultationService } from "../services/consultation.service";

// Mock Prisma client to isolate unit/integration tests
jest.mock("../lib/prisma", () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
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
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    prescription: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    medicalRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockAuditLog = prisma.auditLog as jest.Mocked<typeof prisma.auditLog>;
const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;
const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;
const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;
const mockPrescription = prisma.prescription as jest.Mocked<typeof prisma.prescription>;
const mockMedicalRecord = prisma.medicalRecord as jest.Mocked<typeof prisma.medicalRecord>;
const mockConsultation = prisma.consultation as jest.Mocked<typeof prisma.consultation>;

describe("Audit Logs API - /api/admin/audit-logs", () => {
  const adminUserId = "11111111-1111-1111-1111-111111111111";
  const doctorUserId = "22222222-2222-2222-2222-222222222222";
  const patientUserId = "33333333-3333-3333-3333-333333333333";
  const auditLogId = "44444444-4444-4444-8444-444444444444";

  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;

  const mockAuditLogData = {
    id: auditLogId,
    userId: adminUserId,
    action: "UPDATE_DOCTOR_STATUS",
    entity: "Doctor",
    entityId: "doc-123",
    details: "Doctor status changed to active",
    ipAddress: null,
    createdAt: new Date("2026-09-29T12:00:00.000Z"),
    user: {
      id: adminUserId,
      firstName: "Admin",
      lastName: "User",
      email: "admin@mediflow.com",
      role: UserRole.ADMIN,
    },
  };

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
  // Authorization Tests
  // ==========================================
  describe("Authorization & RBAC", () => {
    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/admin/audit-logs");
      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for PATIENT role", async () => {
      const response = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should return HTTP 403 for DOCTOR role", async () => {
      const response = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access forbidden: insufficient permissions");
    });

    it("should allow ADMIN role with HTTP 200", async () => {
      mockAuditLog.count.mockResolvedValueOnce(1);
      mockAuditLog.findMany.mockResolvedValueOnce([mockAuditLogData] as any);

      const response = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
    });
  });

  // ==========================================
  // GET /api/admin/audit-logs - Pagination & Filters
  // ==========================================
  describe("GET /api/admin/audit-logs - Listing & Filters", () => {
    it("should return paginated audit logs with default pagination (page=1, limit=20)", async () => {
      mockAuditLog.count.mockResolvedValueOnce(25);
      mockAuditLog.findMany.mockResolvedValueOnce([mockAuditLogData] as any);

      const response = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });
      expect(mockAuditLog.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              phoneNumber: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should handle custom valid page and limit parameters", async () => {
      mockAuditLog.count.mockResolvedValueOnce(30);
      mockAuditLog.findMany.mockResolvedValueOnce([mockAuditLogData] as any);

      const response = await request(app)
        .get("/api/admin/audit-logs?page=2&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3,
      });
      expect(mockAuditLog.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        skip: 10,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should reject limit > 100 with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/audit-logs?limit=150")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should reject invalid page parameter with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/audit-logs?page=0")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    it("should reject invalid limit parameter with HTTP 400", async () => {
      const response = await request(app)
        .get("/api/admin/audit-logs?limit=-5")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    it("should support filters: action, entity, userId, entityId, dateFrom, dateTo", async () => {
      mockAuditLog.count.mockResolvedValueOnce(1);
      mockAuditLog.findMany.mockResolvedValueOnce([mockAuditLogData] as any);

      const response = await request(app)
        .get(
          `/api/admin/audit-logs?action=UPDATE_DOCTOR_STATUS&entity=Doctor&userId=${adminUserId}&entityId=doc-123&dateFrom=2026-01-01T00:00:00.000Z&dateTo=2026-12-31T23:59:59.999Z`
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(mockAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: { equals: "UPDATE_DOCTOR_STATUS", mode: "insensitive" },
          entity: { equals: "Doctor", mode: "insensitive" },
          userId: adminUserId,
          entityId: "doc-123",
          createdAt: {
            gte: new Date("2026-01-01T00:00:00.000Z"),
            lte: new Date("2026-12-31T23:59:59.999Z"),
          },
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty results when no logs match filters", async () => {
      mockAuditLog.count.mockResolvedValueOnce(0);
      mockAuditLog.findMany.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/api/admin/audit-logs?action=NON_EXISTENT")
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
  // GET /api/admin/audit-logs/:id
  // ==========================================
  describe("GET /api/admin/audit-logs/:id - Lookup by ID", () => {
    it("should return single audit log by valid UUID", async () => {
      mockAuditLog.findUnique.mockResolvedValueOnce(mockAuditLogData as any);

      const response = await request(app)
        .get(`/api/admin/audit-logs/${auditLogId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(auditLogId);
      expect(response.body.data.user.email).toBe("admin@mediflow.com");
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it("should return HTTP 400 for invalid UUID parameter", async () => {
      const response = await request(app)
        .get("/api/admin/audit-logs/not-a-uuid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 404 when audit log is not found", async () => {
      mockAuditLog.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/admin/audit-logs/${auditLogId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Audit log not found");
    });
  });

  // ==========================================
  // Internal Service & Failure Isolation
  // ==========================================
  describe("Audit Log Creation Service & Failure Isolation", () => {
    it("should create internal audit log successfully", async () => {
      mockAuditLog.create.mockResolvedValueOnce(mockAuditLogData as any);

      const result = await auditLogService.createAuditLog({
        userId: adminUserId,
        action: "TEST_ACTION",
        entity: "TestEntity",
        entityId: "123",
        details: "Test detail",
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(auditLogId);
    });

    it("should return null and log console error on DB failure without throwing", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      mockAuditLog.create.mockRejectedValueOnce(new Error("DB Connection Error"));

      const result = await auditLogService.createAuditLog({
        userId: adminUserId,
        action: "FAIL_ACTION",
        entity: "TestEntity",
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to create audit log:",
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  // ==========================================
  // Domain Workflows Integration Tests
  // ==========================================
  describe("Domain Workflows Integration", () => {
    it("1. Admin doctor status change creates audit log and succeeds if audit log fails", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
      } as any);
      mockUser.update.mockResolvedValueOnce({ id: doctorUserId, isActive: false } as any);
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: "doc-1",
        userId: doctorUserId,
        user: { id: doctorUserId, isActive: false },
      } as any);

      mockAuditLog.create.mockRejectedValueOnce(new Error("Audit DB Error"));
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await adminDoctorService.updateDoctorStatus("doc-1", { isActive: false }, adminUserId);

      expect(result).toBeDefined();
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminUserId,
          action: "UPDATE_DOCTOR_STATUS",
          entity: "Doctor",
          entityId: "doc-1",
        }),
      });
      consoleErrorSpy.mockRestore();
    });

    it("2. Admin patient status change creates audit log", async () => {
      mockPatient.findUnique.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
      } as any);
      mockUser.update.mockResolvedValueOnce({ id: patientUserId, isActive: false } as any);
      mockPatient.findUnique.mockResolvedValueOnce({
        id: "pat-1",
        userId: patientUserId,
        user: { id: patientUserId, isActive: false },
      } as any);
      mockAuditLog.create.mockResolvedValueOnce(mockAuditLogData as any);

      const result = await adminPatientService.updatePatientStatus("pat-1", { isActive: false }, adminUserId);

      expect(result).toBeDefined();
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminUserId,
          action: "UPDATE_PATIENT_STATUS",
          entity: "Patient",
          entityId: "pat-1",
        }),
      });
    });

    it("3. Admin appointment status change creates audit log", async () => {
      mockAppointment.findUnique.mockResolvedValueOnce({
        id: "app-1",
        status: "PENDING",
      } as any);
      mockAppointment.update.mockResolvedValueOnce({
        id: "app-1",
        status: "CANCELLED",
      } as any);
      mockAuditLog.create.mockResolvedValueOnce(mockAuditLogData as any);

      const result = await adminAppointmentService.updateAppointmentStatus("app-1", { status: "CANCELLED" }, adminUserId);

      expect(result).toBeDefined();
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminUserId,
          action: "UPDATE_APPOINTMENT_STATUS_ADMIN",
          entity: "Appointment",
          entityId: "app-1",
        }),
      });
    });

    it("4. Doctor appointment status change creates audit log", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({ id: "doc-1", userId: doctorUserId } as any);
      mockAppointment.findFirst.mockResolvedValueOnce({
        id: "app-1",
        doctorId: "doc-1",
        status: "PENDING",
      } as any);
      mockAppointment.update.mockResolvedValueOnce({
        id: "app-1",
        status: "CONFIRMED",
      } as any);
      mockAuditLog.create.mockResolvedValueOnce(mockAuditLogData as any);

      const result = await doctorAppointmentService.updateAppointmentStatus(doctorUserId, "app-1", { status: "CONFIRMED" });

      expect(result).toBeDefined();
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: doctorUserId,
          action: "UPDATE_APPOINTMENT_STATUS_DOCTOR",
          entity: "Appointment",
          entityId: "app-1",
        }),
      });
    });

    it("5. Prescription creation creates audit log", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({ id: "doc-1", userId: doctorUserId } as any);
      mockConsultation.findUnique.mockResolvedValueOnce({
        id: "consult-1",
        doctorId: "doc-1",
        appointment: { id: "app-1", patientId: "pat-1" },
      } as any);
      mockPrescription.findUnique.mockResolvedValueOnce(null);
      mockPrescription.create.mockResolvedValueOnce({
        id: "presc-1",
        consultationId: "consult-1",
      } as any);
      mockAuditLog.create.mockResolvedValueOnce(mockAuditLogData as any);

      const result = await prescriptionService.createPrescription(doctorUserId, {
        consultationId: "consult-1",
        instructions: "Take with water",
        items: [{ medicationName: "Med A", dosage: "500mg", frequency: "Daily", duration: "5 days" }],
      });

      expect(result).toBeDefined();
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: doctorUserId,
          action: "CREATE_PRESCRIPTION",
          entity: "Prescription",
          entityId: "presc-1",
        }),
      });
    });

    it("6. Medical record creation and update create audit logs", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({ id: "doc-1", userId: doctorUserId } as any);
      mockAppointment.findUnique.mockResolvedValueOnce({
        id: "app-1",
        doctorId: "doc-1",
        patientId: "pat-1",
      } as any);
      mockMedicalRecord.create.mockResolvedValueOnce({
        id: "med-rec-1",
        title: "Blood Test",
      } as any);
      mockAuditLog.create.mockResolvedValueOnce(mockAuditLogData as any);

      await medicalRecordService.createMedicalRecord(doctorUserId, {
        appointmentId: "app-1",
        title: "Blood Test",
        description: "Normal",
      });

      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: doctorUserId,
          action: "CREATE_MEDICAL_RECORD",
          entity: "MedicalRecord",
          entityId: "med-rec-1",
        }),
      });

      mockDoctor.findUnique.mockResolvedValueOnce({ id: "doc-1", userId: doctorUserId } as any);
      mockMedicalRecord.findUnique.mockResolvedValueOnce({ id: "med-rec-1", patientId: "pat-1" } as any);
      mockAppointment.findFirst.mockResolvedValueOnce({ id: "app-1" } as any);
      mockMedicalRecord.update.mockResolvedValueOnce({ id: "med-rec-1", title: "Updated Blood Test" } as any);

      await medicalRecordService.updateMedicalRecord(doctorUserId, "med-rec-1", {
        title: "Updated Blood Test",
      });

      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: doctorUserId,
          action: "UPDATE_MEDICAL_RECORD",
          entity: "MedicalRecord",
          entityId: "med-rec-1",
        }),
      });
    });

    it("7. Consultation creation creates audit log", async () => {
      mockDoctor.findUnique.mockResolvedValueOnce({ id: "doc-1", userId: doctorUserId } as any);
      mockAppointment.findUnique.mockResolvedValueOnce({
        id: "app-1",
        doctorId: "doc-1",
        status: "CONFIRMED",
      } as any);
      mockConsultation.findUnique.mockResolvedValueOnce(null);
      mockConsultation.create.mockResolvedValueOnce({
        id: "consult-1",
        appointmentId: "app-1",
      } as any);
      mockAuditLog.create.mockResolvedValueOnce(mockAuditLogData as any);

      await consultationService.createConsultation(doctorUserId, {
        appointmentId: "app-1",
        diagnosis: "Flu",
        symptoms: "Fever, cough",
      });

      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: doctorUserId,
          action: "CREATE_CONSULTATION",
          entity: "Consultation",
          entityId: "consult-1",
        }),
      });
    });
  });
});
