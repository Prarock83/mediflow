import { Appointment, AppointmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { CreateAppointmentInput } from "../schemas/appointment.schema";
import { notificationService } from "./notification.service";

export class AppointmentService {
  async createAppointment(
    userId: string,
    input: CreateAppointmentInput
  ): Promise<Appointment> {
    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      const error: AppError = new Error("Patient profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: input.doctorId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const now = new Date();
    if (input.startTime.getTime() < now.getTime()) {
      const error: AppError = new Error("Appointment time cannot be in the past");
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const dayOfWeek = input.startTime.getUTCDay();
    const formatHHmm = (date: Date): string => {
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const reqStartHHmm = formatHHmm(input.startTime);
    const reqEndHHmm = formatHHmm(input.endTime);

    const availabilitySlots = await prisma.doctorAvailability.findMany({
      where: {
        doctorId: doctor.id,
        dayOfWeek,
        isAvailable: true,
      },
    });

    const isDoctorAvailable = availabilitySlots.some(
      (slot) => reqStartHHmm >= slot.startTime && reqEndHHmm <= slot.endTime
    );

    if (!isDoctorAvailable) {
      const error: AppError = new Error("Doctor is not available at the requested time");
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const doctorExistingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: { not: AppointmentStatus.CANCELLED },
      },
    });

    const hasDoctorConflict = doctorExistingAppointments.some(
      (app) => input.startTime < app.endTime && input.endTime > app.startTime
    );

    if (hasDoctorConflict) {
      const error: AppError = new Error("Doctor already has an appointment at the requested time");
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const patientExistingAppointments = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        status: { not: AppointmentStatus.CANCELLED },
      },
    });

    const hasPatientConflict = patientExistingAppointments.some(
      (app) => input.startTime < app.endTime && input.endTime > app.startTime
    );

    if (hasPatientConflict) {
      const error: AppError = new Error("Patient already has an appointment at the requested time");
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: input.appointmentDate,
        startTime: input.startTime,
        endTime: input.endTime,
        status: AppointmentStatus.PENDING,
        reason: input.reason,
      },
      include: {
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

    if (doctor.userId) {
      await notificationService.createNotification({
        userId: doctor.userId,
        title: "New Appointment Request",
        message: `New appointment requested for ${input.appointmentDate.toISOString()}`,
      });
    }

    return appointment;
  }

  async getPatientAppointments(userId: string): Promise<Appointment[]> {
    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      const error: AppError = new Error("Patient profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
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
      orderBy: { startTime: "asc" },
    });

    return appointments;
  }
}

export const appointmentService = new AppointmentService();
