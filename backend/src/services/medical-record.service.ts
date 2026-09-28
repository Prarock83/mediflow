import { MedicalRecord, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  CreateMedicalRecordInput,
  UpdateMedicalRecordInput,
} from "../schemas/medical-record.schema";

export class MedicalRecordService {
  async createMedicalRecord(
    userId: string,
    input: CreateMedicalRecordInput
  ): Promise<MedicalRecord> {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    let targetPatientId: string;

    if (input.appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: input.appointmentId },
      });

      if (!appointment || appointment.doctorId !== doctor.id) {
        const error: AppError = new Error("Appointment not found");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      targetPatientId = appointment.patientId;
    } else if (input.patientId) {
      const appointmentRelation = await prisma.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          patientId: input.patientId,
        },
      });

      if (!appointmentRelation) {
        const error: AppError = new Error("Patient not found or not authorized");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      targetPatientId = input.patientId;
    } else {
      const error: AppError = new Error("Either appointmentId or patientId must be provided");
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const medicalRecord = await prisma.medicalRecord.create({
      data: {
        patientId: targetPatientId,
        title: input.title,
        description: input.description,
        recordDate: input.recordDate ?? new Date(),
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        documents: true,
      },
    });

    return medicalRecord;
  }

  async getMedicalRecordById(
    userId: string,
    role: UserRole,
    recordId: string
  ): Promise<MedicalRecord> {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: recordId },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        documents: true,
      },
    });

    if (!record) {
      const error: AppError = new Error("Medical record not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    let isAuthorized = false;

    if (role === UserRole.PATIENT) {
      if (record.patient.userId === userId) {
        isAuthorized = true;
      }
    } else if (role === UserRole.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId } });
      if (doctor) {
        const hasRelation = await prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId: record.patientId,
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

    return record;
  }

  async getMyMedicalRecords(
    userId: string,
    role: UserRole
  ): Promise<MedicalRecord[]> {
    if (role === UserRole.PATIENT) {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (!patient) {
        const error: AppError = new Error("Patient profile not found");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      const records = await prisma.medicalRecord.findMany({
        where: { patientId: patient.id },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
          documents: true,
        },
        orderBy: { recordDate: "desc" },
      });

      return records;
    }

    if (role === UserRole.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId } });
      if (!doctor) {
        const error: AppError = new Error("Doctor profile not found");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      const doctorAppointments = await prisma.appointment.findMany({
        where: { doctorId: doctor.id },
        select: { patientId: true },
        distinct: ["patientId"],
      });

      const patientIds = doctorAppointments.map((a) => a.patientId);

      const records = await prisma.medicalRecord.findMany({
        where: {
          patientId: { in: patientIds },
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
          documents: true,
        },
        orderBy: { recordDate: "desc" },
      });

      return records;
    }

    const error: AppError = new Error("Forbidden: insufficient permissions");
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  async updateMedicalRecord(
    userId: string,
    recordId: string,
    input: UpdateMedicalRecordInput
  ): Promise<MedicalRecord> {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const record = await prisma.medicalRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      const error: AppError = new Error("Medical record not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const hasRelation = await prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        patientId: record.patientId,
      },
    });

    if (!hasRelation) {
      const error: AppError = new Error("Medical record not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const updatedRecord = await prisma.medicalRecord.update({
      where: { id: recordId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.recordDate !== undefined && { recordDate: input.recordDate }),
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        documents: true,
      },
    });

    return updatedRecord;
  }
}

export const medicalRecordService = new MedicalRecordService();
