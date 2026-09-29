import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { AdminUserQueryInput } from "../schemas/admin-user.schema";

const USER_SELECT_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phoneNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      dateOfBirth: true,
      gender: true,
      bloodGroup: true,
    },
  },
  doctor: {
    select: {
      id: true,
      licenseNumber: true,
      experienceYears: true,
      consultationFee: true,
      specialization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

export class AdminUserService {
  /**
   * Get a paginated list of users with optional role filtering and name/email search.
   */
  async getUsers(query: AdminUserQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (query.role) {
      whereClause.role = query.role;
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      whereClause.OR = [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        select: USER_SELECT_FIELDS,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Number(totalPages),
      },
    };
  }

  /**
   * Get a single user by ID. Excludes passwordHash.
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      const error: AppError = new Error("User not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return user;
  }
}

export const adminUserService = new AdminUserService();
