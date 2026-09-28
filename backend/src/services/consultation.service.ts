import { Consultation, AppointmentStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { CreateConsultationInput } from "../schemas/consultation.schema";

export class ConsultationService {
  async createConsultation(
    userId: string,
    input: CreateConsultationInput
  ): Promise<Consultation> {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
    });

    if (!appointment || appointment.doctorId !== doctor.id) {
      const error: AppError = new Error("Appointment not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.COMPLETED
    ) {
      const error: AppError = new Error(
        "Consultation can only be created for confirmed or completed appointments"
      );
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const existingConsultation = await prisma.consultation.findUnique({
      where: { appointmentId: appointment.id },
    });

    if (existingConsultation) {
      const error: AppError = new Error(
        "Consultation already exists for this appointment"
      );
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const consultation = await prisma.consultation.create({
      data: {
        appointmentId: appointment.id,
        doctorId: doctor.id,
        diagnosis: input.diagnosis,
        notes: input.notes,
        symptoms: input.symptoms,
      },
      include: {
        appointment: {
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
          },
        },
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
    });

    return consultation;
  }

  async getConsultationById(
    userId: string,
    role: UserRole,
    consultationId: string
  ): Promise<Consultation> {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        appointment: {
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
          },
        },
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
    });

    if (!consultation) {
      const error: AppError = new Error("Consultation not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    let isAuthorized = false;

    if (role === UserRole.DOCTOR) {
      if (consultation.doctor.userId === userId) {
        isAuthorized = true;
      }
    } else if (role === UserRole.PATIENT) {
      if (consultation.appointment.patient.userId === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const error: AppError = new Error("Consultation not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return consultation;
  }

  async getMyConsultations(
    userId: string,
    role: UserRole
  ): Promise<Consultation[]> {
    if (role === UserRole.PATIENT) {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (!patient) {
        const error: AppError = new Error("Patient profile not found");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      const consultations = await prisma.consultation.findMany({
        where: {
          appointment: {
            patientId: patient.id,
          },
        },
        include: {
          appointment: true,
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

      return consultations;
    }

    if (role === UserRole.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({ where: { userId } });
      if (!doctor) {
        const error: AppError = new Error("Doctor profile not found");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      const consultations = await prisma.consultation.findMany({
        where: {
          doctorId: doctor.id,
        },
        include: {
          appointment: {
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
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return consultations;
    }

    const error: AppError = new Error("Forbidden: insufficient permissions");
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }
}

export const consultationService = new ConsultationService();
