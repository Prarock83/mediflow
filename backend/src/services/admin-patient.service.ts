import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  AdminPatientQueryInput,
  UpdatePatientStatusInput,
} from "../schemas/admin-patient.schema";
import { auditLogService } from "./audit-log.service";

const PATIENT_USER_SELECT = {
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

const PATIENT_INCLUDE_FIELDS = {
  user: {
    select: PATIENT_USER_SELECT,
  },
};

export class AdminPatientService {
  /**
   * Get a paginated list of patients with optional gender/bloodGroup filtering and search.
   */
  async getPatients(query: AdminPatientQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (query.gender) {
      whereClause.gender = { equals: query.gender, mode: "insensitive" };
    }

    if (query.bloodGroup) {
      whereClause.bloodGroup = { equals: query.bloodGroup, mode: "insensitive" };
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      whereClause.OR = [
        { user: { firstName: { contains: searchTerm, mode: "insensitive" } } },
        { user: { lastName: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { user: { phoneNumber: { contains: searchTerm, mode: "insensitive" } } },
      ];
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where: whereClause }),
      prisma.patient.findMany({
        where: whereClause,
        include: PATIENT_INCLUDE_FIELDS,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      patients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Number(totalPages),
      },
    };
  }

  /**
   * Get a single patient profile by Patient UUID. Excludes passwordHash.
   */
  async getPatientById(id: string) {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: PATIENT_INCLUDE_FIELDS,
    });

    if (!patient) {
      const error: AppError = new Error("Patient not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return patient;
  }

  /**
   * Update associated User.isActive status for a patient by Patient UUID.
   */
  async updatePatientStatus(
    id: string,
    input: UpdatePatientStatusInput,
    adminUserId?: string
  ) {
    const patient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      const error: AppError = new Error("Patient not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    await prisma.user.update({
      where: { id: patient.userId },
      data: { isActive: input.isActive },
    });

    await auditLogService.createAuditLog({
      userId: adminUserId,
      action: "UPDATE_PATIENT_STATUS",
      entity: "Patient",
      entityId: id,
      details: `Patient status updated to ${input.isActive ? "active" : "inactive"}`,
    });

    const updatedPatient = await prisma.patient.findUnique({
      where: { id },
      include: PATIENT_INCLUDE_FIELDS,
    });

    return updatedPatient!;
  }
}

export const adminPatientService = new AdminPatientService();
