import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  AdminDoctorQueryInput,
  UpdateDoctorStatusInput,
} from "../schemas/admin-doctor.schema";
import { auditLogService } from "./audit-log.service";

const DOCTOR_USER_SELECT = {
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

const DOCTOR_LIST_INCLUDE = {
  user: {
    select: DOCTOR_USER_SELECT,
  },
  specialization: true,
};

export class AdminDoctorService {
  /**
   * Get a paginated list of doctors with optional specialization filtering and name/email/license search.
   */
  async getDoctors(query: AdminDoctorQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (query.specializationId) {
      whereClause.specializationId = query.specializationId;
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      whereClause.OR = [
        { user: { firstName: { contains: searchTerm, mode: "insensitive" } } },
        { user: { lastName: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { licenseNumber: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const [total, doctors] = await Promise.all([
      prisma.doctor.count({ where: whereClause }),
      prisma.doctor.findMany({
        where: whereClause,
        include: DOCTOR_LIST_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      doctors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Number(totalPages),
      },
    };
  }

  /**
   * Get a single doctor profile by Doctor UUID.
   * Excludes passwordHash. Includes user, specialization, and availabilities.
   */
  async getDoctorById(id: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: DOCTOR_USER_SELECT,
        },
        specialization: true,
        availabilities: true,
      },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return doctor;
  }

  /**
   * Update associated User.isActive status for a doctor by Doctor UUID.
   */
  async updateDoctorStatus(
    id: string,
    input: UpdateDoctorStatusInput,
    adminUserId?: string
  ) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    await prisma.user.update({
      where: { id: doctor.userId },
      data: { isActive: input.isActive },
    });

    await auditLogService.createAuditLog({
      userId: adminUserId,
      action: "UPDATE_DOCTOR_STATUS",
      entity: "Doctor",
      entityId: id,
      details: `Doctor status updated to ${input.isActive ? "active" : "inactive"}`,
    });

    const updatedDoctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: DOCTOR_USER_SELECT,
        },
        specialization: true,
        availabilities: true,
      },
    });

    return updatedDoctor!;
  }
}

export const adminDoctorService = new AdminDoctorService();
