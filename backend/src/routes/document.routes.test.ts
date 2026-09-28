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
    medicalRecord: {
      findUnique: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
    },
    document: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockDoctor = prisma.doctor as jest.Mocked<typeof prisma.doctor>;
const mockPatient = prisma.patient as jest.Mocked<typeof prisma.patient>;
const mockMedicalRecord = prisma.medicalRecord as jest.Mocked<typeof prisma.medicalRecord>;
const mockAppointment = prisma.appointment as jest.Mocked<typeof prisma.appointment>;
const mockDocument = prisma.document as jest.Mocked<typeof prisma.document>;

describe("Document Routes - /api/documents", () => {
  const doctorUserId = "doctor-uuid-202";
  const doctorId = "doc-1";
  const otherDoctorUserId = "doctor-uuid-999";
  const otherDoctorId = "doc-999";

  const patientUserId = "patient-uuid-101";
  const patientId = "pat-1";
  const otherPatientUserId = "patient-uuid-888";
  const otherPatientId = "pat-888";

  const adminUserId = "admin-uuid-303";
  const medicalRecordId = "123e4567-e89b-12d3-a456-426614174001";
  const validDocumentId = "123e4567-e89b-12d3-a456-426614174000";

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
  // POST /api/documents
  // ==========================================
  describe("POST /api/documents", () => {
    it("should allow a PATIENT to create a document for their own medical record with HTTP 201", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: medicalRecordId,
        patientId,
        patient: {
          id: patientId,
          userId: patientUserId,
        },
      } as any);

      (mockDocument.create as jest.Mock).mockResolvedValueOnce({
        id: validDocumentId,
        medicalRecordId,
        fileName: "lab_report.pdf",
        fileUrl: "https://storage.mediflow.com/docs/lab_report.pdf",
        fileType: "application/pdf",
        fileSize: 1024500,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/api/documents")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          medicalRecordId,
          fileName: "lab_report.pdf",
          fileUrl: "https://storage.mediflow.com/docs/lab_report.pdf",
          fileType: "application/pdf",
          fileSize: 1024500,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Document created successfully");
      expect(response.body.data.id).toBe(validDocumentId);

      expect(mockDocument.create).toHaveBeenCalledWith({
        data: {
          medicalRecordId,
          fileName: "lab_report.pdf",
          fileUrl: "https://storage.mediflow.com/docs/lab_report.pdf",
          fileType: "application/pdf",
          fileSize: 1024500,
        },
        include: {
          medicalRecord: true,
        },
      });
    });

    it("should allow a DOCTOR (with appointment relation) to create a document for a patient with HTTP 201", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: medicalRecordId,
        patientId,
        patient: {
          id: patientId,
          userId: patientUserId,
        },
      } as any);

      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce({
        id: "app-1",
        doctorId,
        patientId,
      } as any);

      (mockDocument.create as jest.Mock).mockResolvedValueOnce({
        id: validDocumentId,
        medicalRecordId,
        fileName: "xray.png",
        fileUrl: "https://storage.mediflow.com/docs/xray.png",
        fileType: "image/png",
        fileSize: 2048000,
      });

      const response = await request(app)
        .post("/api/documents")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          medicalRecordId,
          fileName: "xray.png",
          fileUrl: "https://storage.mediflow.com/docs/xray.png",
          fileType: "image/png",
          fileSize: 2048000,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.fileName).toBe("xray.png");
    });

    it("should return HTTP 404 when a PATIENT tries to upload to another patient's medical record", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: medicalRecordId,
        patientId: otherPatientId,
        patient: {
          id: otherPatientId,
          userId: otherPatientUserId,
        },
      } as any);

      const response = await request(app)
        .post("/api/documents")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          medicalRecordId,
          fileName: "hacked.pdf",
          fileUrl: "https://storage.mediflow.com/hacked.pdf",
          fileType: "application/pdf",
          fileSize: 500,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Medical record not found");
      expect(mockDocument.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 when an unrelated DOCTOR tries to upload a document", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: medicalRecordId,
        patientId,
        patient: { id: patientId, userId: patientUserId },
      } as any);

      mockDoctor.findUnique.mockResolvedValueOnce({
        id: otherDoctorId,
        userId: otherDoctorUserId,
      } as any);

      mockAppointment.findFirst.mockResolvedValueOnce(null); // No relationship

      const response = await request(app)
        .post("/api/documents")
        .set("Authorization", `Bearer ${otherDoctorToken}`)
        .send({
          medicalRecordId,
          fileName: "unauthorized.pdf",
          fileUrl: "https://storage.mediflow.com/unauthorized.pdf",
          fileType: "application/pdf",
          fileSize: 500,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Medical record not found");
      expect(mockDocument.create).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 for nonexistent medicalRecordId", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/documents")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          medicalRecordId,
          fileName: "test.pdf",
          fileUrl: "https://storage.mediflow.com/test.pdf",
          fileType: "application/pdf",
          fileSize: 100,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Medical record not found");
    });

    it("should return HTTP 400 for validation failure (e.g. invalid fileSize)", async () => {
      const response = await request(app)
        .post("/api/documents")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          medicalRecordId,
          fileName: "test.pdf",
          fileUrl: "https://storage.mediflow.com/test.pdf",
          fileType: "application/pdf",
          fileSize: -100, // Invalid size
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return HTTP 401 for unauthenticated request", async () => {
      const response = await request(app)
        .post("/api/documents")
        .send({
          medicalRecordId,
          fileName: "test.pdf",
          fileUrl: "https://storage.mediflow.com/test.pdf",
          fileType: "application/pdf",
          fileSize: 100,
        });

      expect(response.status).toBe(401);
    });

    it("should return HTTP 403 for ADMIN role", async () => {
      const response = await request(app)
        .post("/api/documents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          medicalRecordId,
          fileName: "test.pdf",
          fileUrl: "https://storage.mediflow.com/test.pdf",
          fileType: "application/pdf",
          fileSize: 100,
        });

      expect(response.status).toBe(403);
    });
  });

  // ==========================================
  // GET /api/documents/:id
  // ==========================================
  describe("GET /api/documents/:id", () => {
    const sampleDocument = {
      id: validDocumentId,
      medicalRecordId,
      fileName: "prescription.pdf",
      fileUrl: "https://storage.mediflow.com/docs/prescription.pdf",
      fileType: "application/pdf",
      fileSize: 512000,
      createdAt: new Date(),
      updatedAt: new Date(),
      medicalRecord: {
        id: medicalRecordId,
        patientId,
        patient: {
          id: patientId,
          userId: patientUserId,
        },
      },
    };

    it("should allow PATIENT to view their own document with HTTP 200", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(sampleDocument as any);

      const response = await request(app)
        .get(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(validDocumentId);
      expect(response.body.data.fileName).toBe("prescription.pdf");
    });

    it("should allow authorized DOCTOR to view document with HTTP 200", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(sampleDocument as any);
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);
      mockAppointment.findFirst.mockResolvedValueOnce({
        id: "app-1",
        doctorId,
        patientId,
      } as any);

      const response = await request(app)
        .get(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(validDocumentId);
    });

    it("should return HTTP 404 when another PATIENT attempts to access the document", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(sampleDocument as any);

      const response = await request(app)
        .get(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Document not found");
    });

    it("should return HTTP 404 when an unrelated DOCTOR attempts to access document", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(sampleDocument as any);
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: otherDoctorId,
        userId: otherDoctorUserId,
      } as any);
      mockAppointment.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${otherDoctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Document not found");
    });

    it("should return HTTP 404 for non-existent document", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
    });

    it("should return HTTP 400 for invalid UUID parameter", async () => {
      const response = await request(app)
        .get("/api/documents/invalid-uuid-format")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Validation failed");
    });
  });

  // ==========================================
  // GET /api/documents/medical-record/:medicalRecordId
  // ==========================================
  describe("GET /api/documents/medical-record/:medicalRecordId", () => {
    it("should return list of documents for authorized PATIENT with HTTP 200", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: medicalRecordId,
        patientId,
        patient: {
          id: patientId,
          userId: patientUserId,
        },
      } as any);

      mockDocument.findMany.mockResolvedValueOnce([
        {
          id: validDocumentId,
          medicalRecordId,
          fileName: "doc1.pdf",
        },
      ] as any);

      const response = await request(app)
        .get(`/api/documents/medical-record/${medicalRecordId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].fileName).toBe("doc1.pdf");
    });

    it("should return HTTP 404 for unauthorized access to medical record documents", async () => {
      mockMedicalRecord.findUnique.mockResolvedValueOnce({
        id: medicalRecordId,
        patientId: otherPatientId,
        patient: {
          id: otherPatientId,
          userId: otherPatientUserId,
        },
      } as any);

      const response = await request(app)
        .get(`/api/documents/medical-record/${medicalRecordId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Medical record not found");
    });
  });

  // ==========================================
  // DELETE /api/documents/:id
  // ==========================================
  describe("DELETE /api/documents/:id", () => {
    const sampleDocument = {
      id: validDocumentId,
      medicalRecordId,
      fileName: "to_delete.pdf",
      medicalRecord: {
        id: medicalRecordId,
        patientId,
        patient: {
          id: patientId,
          userId: patientUserId,
        },
      },
    };

    it("should allow PATIENT to delete their own document with HTTP 200", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(sampleDocument as any);
      mockDocument.delete.mockResolvedValueOnce(sampleDocument as any);

      const response = await request(app)
        .delete(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Document deleted successfully");

      expect(mockDocument.delete).toHaveBeenCalledWith({
        where: { id: validDocumentId },
      });
    });

    it("should allow authorized DOCTOR to delete document with HTTP 200", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(sampleDocument as any);
      mockDoctor.findUnique.mockResolvedValueOnce({
        id: doctorId,
        userId: doctorUserId,
      } as any);
      mockAppointment.findFirst.mockResolvedValueOnce({
        id: "app-1",
        doctorId,
        patientId,
      } as any);

      mockDocument.delete.mockResolvedValueOnce(sampleDocument as any);

      const response = await request(app)
        .delete(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Document deleted successfully");
    });

    it("should return HTTP 404 when unauthorized user attempts to delete document", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(sampleDocument as any);

      const response = await request(app)
        .delete(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Document not found");
      expect(mockDocument.delete).not.toHaveBeenCalled();
    });

    it("should return HTTP 404 for non-existent document deletion", async () => {
      mockDocument.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/documents/${validDocumentId}`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
      expect(mockDocument.delete).not.toHaveBeenCalled();
    });
  });
});
