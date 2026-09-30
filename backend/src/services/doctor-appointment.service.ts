import { Appointment, AppointmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  UpdateAppointmentStatusInput,
  DoctorAppointmentQueryInput,
} from "../schemas/doctor-appointment.schema";
import { notificationService } from "./notification.service";
import { auditLogService } from "./audit-log.service";

const ALLOWED_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  [AppointmentStatus.PENDING]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

export class DoctorAppointmentService {
  private async getDoctorByUserId(userId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return doctor;
  }

  async getDoctorAppointments(
    userId: string,
    query: DoctorAppointmentQueryInput
  ): Promise<Appointment[]> {
    const doctor = await this.getDoctorByUserId(userId);

    const whereClause: any = {
      doctorId: doctor.id,
    };

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.date) {
      const targetDate = new Date(query.date);
      const startOfDay = new Date(targetDate.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setUTCHours(23, 59, 59, 999));

      whereClause.appointmentDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
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
      orderBy: { startTime: "asc" },
    });

    return appointments;
  }

  async getDoctorAppointmentById(
    userId: string,
    appointmentId: string
  ): Promise<Appointment> {
    const doctor = await this.getDoctorByUserId(userId);

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        doctorId: doctor.id,
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
      },
    });

    if (!appointment) {
      const error: AppError = new Error("Appointment not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return appointment;
  }

  async updateAppointmentStatus(
    userId: string,
    appointmentId: string,
    input: UpdateAppointmentStatusInput
  ): Promise<Appointment> {
    const doctor = await this.getDoctorByUserId(userId);

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        doctorId: doctor.id,
      },
    });

    if (!existingAppointment) {
      const error: AppError = new Error("Appointment not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const currentStatus = existingAppointment.status;
    const targetStatus = input.status;

    if (currentStatus === targetStatus) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
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
      });
      return appointment!;
    }

    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(targetStatus)) {
      const error: AppError = new Error(
        `Invalid appointment status transition from ${currentStatus} to ${targetStatus}`
      );
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: targetStatus,
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
      },
    });

    await auditLogService.createAuditLog({
      userId: userId,
      action: "UPDATE_APPOINTMENT_STATUS_DOCTOR",
      entity: "Appointment",
      entityId: appointmentId,
      details: `Appointment status updated from ${currentStatus} to ${targetStatus}`,
    });

    if (updatedAppointment.patient?.userId) {
      await notificationService.createNotification({
        userId: updatedAppointment.patient.userId,
        title: `Appointment ${targetStatus}`,
        message: `Your appointment status has been updated to ${targetStatus}`,
      });
    }

    return updatedAppointment;
  }
}

export const doctorAppointmentService = new DoctorAppointmentService();
