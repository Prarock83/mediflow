import { Document, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { CreateDocumentInput } from "../schemas/document.schema";

export class DocumentService {
  private async verifyMedicalRecordAccess(
    userId: string,
    role: UserRole,
    medicalRecordId: string
  ) {
    const medicalRecord = await prisma.medicalRecord.findUnique({
      where: { id: medicalRecordId },
      include: {
        patient: true,
      },
    });

    if (!medicalRecord) {
      const error: AppError = new Error("Medical record not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    let isAuthorized = false;

    if (role === UserRole.PATIENT) {
      if (medicalRecord.patient.userId === userId) {
        isAuthorized = true;
      }
    } else if (role === UserRole.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId } });
      if (doctor) {
        const hasRelation = await prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId: medicalRecord.patientId,
          },
        });
        if (hasRelation) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      const error: AppError = new Error("Medical record not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return medicalRecord;
  }

  async createDocument(
    userId: string,
    role: UserRole,
    input: CreateDocumentInput
  ): Promise<Document> {
    const medicalRecord = await this.verifyMedicalRecordAccess(
      userId,
      role,
      input.medicalRecordId
    );

    const document = await prisma.document.create({
      data: {
        medicalRecordId: medicalRecord.id,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        fileSize: input.fileSize,
      },
      include: {
        medicalRecord: true,
      },
    });

    return document;
  }

  async getDocumentById(
    userId: string,
    role: UserRole,
    documentId: string
  ): Promise<Document> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        medicalRecord: {
          include: {
            patient: true,
          },
        },
      },
    });

    if (!document || !document.medicalRecordId || !document.medicalRecord) {
      const error: AppError = new Error("Document not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    let isAuthorized = false;

    if (role === UserRole.PATIENT) {
      if (document.medicalRecord.patient.userId === userId) {
        isAuthorized = true;
      }
    } else if (role === UserRole.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId } });
      if (doctor) {
        const hasRelation = await prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId: document.medicalRecord.patientId,
          },
        });
        if (hasRelation) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      const error: AppError = new Error("Document not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return document;
  }

  async getDocumentsByMedicalRecordId(
    userId: string,
    role: UserRole,
    medicalRecordId: string
  ): Promise<Document[]> {
    await this.verifyMedicalRecordAccess(userId, role, medicalRecordId);

    const documents = await prisma.document.findMany({
      where: { medicalRecordId },
      orderBy: { createdAt: "desc" },
    });

    return documents;
  }

  async deleteDocument(
    userId: string,
    role: UserRole,
    documentId: string
  ): Promise<void> {
    const document = await this.getDocumentById(userId, role, documentId);

    await prisma.document.delete({
      where: { id: document.id },
    });
  }
}

export const documentService = new DocumentService();
