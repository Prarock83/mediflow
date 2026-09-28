import { Prescription, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { CreatePrescriptionInput } from "../schemas/prescription.schema";

export class PrescriptionService {
  async createPrescription(
    userId: string,
    input: CreatePrescriptionInput
  ): Promise<Prescription> {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: input.consultationId },
      include: { appointment: true },
    });

    if (!consultation || consultation.doctorId !== doctor.id) {
      const error: AppError = new Error("Consultation not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const existingPrescription = await prisma.prescription.findUnique({
      where: { consultationId: consultation.id },
    });

    if (existingPrescription) {
      const error: AppError = new Error(
        "Prescription already exists for this consultation"
      );
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const prescription = await prisma.prescription.create({
      data: {
        consultationId: consultation.id,
        doctorId: doctor.id,
        patientId: consultation.appointment.patientId,
        instructions: input.instructions,
        items: {
          create: input.items.map((item) => ({
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
          })),
        },
      },
      include: {
        items: true,
        consultation: true,
        doctor: {
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
            specialization: true,
          },
        },
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
      },
    });

    return prescription;
  }

  async getPrescriptionById(
    userId: string,
    role: UserRole,
    prescriptionId: string
  ): Promise<Prescription> {
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: true,
        consultation: true,
        doctor: {
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
            specialization: true,
          },
        },
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
      },
    });

    if (!prescription) {
      const error: AppError = new Error("Prescription not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    let isAuthorized = false;

    if (role === UserRole.DOCTOR) {
      if (prescription.doctor.userId === userId) {
        isAuthorized = true;
      }
    } else if (role === UserRole.PATIENT) {
      if (prescription.patient.userId === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const error: AppError = new Error("Prescription not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return prescription;
  }

  async getMyPrescriptions(
    userId: string,
    role: UserRole
  ): Promise<Prescription[]> {
    if (role === UserRole.PATIENT) {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (!patient) {
        const error: AppError = new Error("Patient profile not found");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      const prescriptions = await prisma.prescription.findMany({
        where: { patientId: patient.id },
        include: {
          items: true,
          consultation: true,
          doctor: {
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
              specialization: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return prescriptions;
    }

    if (role === UserRole.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId } });
      if (!doctor) {
        const error: AppError = new Error("Doctor profile not found");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      const prescriptions = await prisma.prescription.findMany({
        where: { doctorId: doctor.id },
        include: {
          items: true,
          consultation: true,
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
        },
        orderBy: { createdAt: "desc" },
      });

      return prescriptions;
    }

    const error: AppError = new Error("Forbidden: insufficient permissions");
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }
}

export const prescriptionService = new PrescriptionService();
