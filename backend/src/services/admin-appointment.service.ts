import { Appointment, AppointmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  AdminAppointmentQueryInput,
  UpdateAppointmentStatusInput,
} from "../schemas/admin-appointment.schema";
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

const APPOINTMENT_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phoneNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const APPOINTMENT_INCLUDE_FIELDS = {
  patient: {
    include: {
      user: {
        select: APPOINTMENT_USER_SELECT,
      },
    },
  },
  doctor: {
    include: {
      user: {
        select: APPOINTMENT_USER_SELECT,
      },
      specialization: true,
    },
  },
};

export class AdminAppointmentService {
  /**
   * Get a paginated global list of appointments with filters for status, doctorId, patientId, date, and search.
   * Sorted by startTime descending.
   */
  async getAppointments(query: AdminAppointmentQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.doctorId) {
      whereClause.doctorId = query.doctorId;
    }

    if (query.patientId) {
      whereClause.patientId = query.patientId;
    }

    if (query.dateFrom || query.dateTo) {
      whereClause.appointmentDate = {};
      if (query.dateFrom) {
        whereClause.appointmentDate.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        whereClause.appointmentDate.lte = new Date(query.dateTo);
      }
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      whereClause.OR = [
        { patient: { user: { firstName: { contains: searchTerm, mode: "insensitive" } } } },
        { patient: { user: { lastName: { contains: searchTerm, mode: "insensitive" } } } },
        { patient: { user: { email: { contains: searchTerm, mode: "insensitive" } } } },
        { doctor: { user: { firstName: { contains: searchTerm, mode: "insensitive" } } } },
        { doctor: { user: { lastName: { contains: searchTerm, mode: "insensitive" } } } },
        { doctor: { user: { email: { contains: searchTerm, mode: "insensitive" } } } },
      ];
    }

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where: whereClause }),
      prisma.appointment.findMany({
        where: whereClause,
        include: APPOINTMENT_INCLUDE_FIELDS,
        skip,
        take: limit,
        orderBy: { startTime: "desc" },
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Number(totalPages),
      },
    };
  }

  /**
   * Get a single appointment by UUID. Excludes passwordHash.
   */
  async getAppointmentById(id: string): Promise<Appointment> {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE_FIELDS,
    });

    if (!appointment) {
      const error: AppError = new Error("Appointment not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return appointment;
  }

  /**
   * Update appointment status while enforcing allowed transition rules.
   * Triggers patient notification upon status change.
   */
  async updateAppointmentStatus(
    id: string,
    input: UpdateAppointmentStatusInput,
    adminUserId?: string
  ): Promise<Appointment> {
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE_FIELDS,
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
      return existingAppointment;
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
      where: { id },
      data: {
        status: targetStatus,
      },
      include: APPOINTMENT_INCLUDE_FIELDS,
    });

    await auditLogService.createAuditLog({
      userId: adminUserId,
      action: "UPDATE_APPOINTMENT_STATUS_ADMIN",
      entity: "Appointment",
      entityId: id,
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

export const adminAppointmentService = new AdminAppointmentService();
