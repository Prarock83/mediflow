import { AuditLog } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  AdminAuditLogQueryInput,
  CreateAuditLogInput,
} from "../schemas/audit-log.schema";

const AUDIT_LOG_USER_SELECT = {
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

const AUDIT_LOG_INCLUDE_FIELDS = {
  user: {
    select: AUDIT_LOG_USER_SELECT,
  },
};

export class AuditLogService {
  /**
   * Internal service method to create an audit log entry.
   * Safe and non-throwing: logs errors with console.error and returns null on failure.
   */
  async createAuditLog(
    input: CreateAuditLogInput
  ): Promise<AuditLog | null> {
    if (!prisma.auditLog) {
      return null;
    }
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          details: input.details,
          ipAddress: input.ipAddress,
        },
      });
      return auditLog;
    } catch (error) {
      console.error("Failed to create audit log:", error);
      return null;
    }
  }

  /**
   * Get a paginated list of audit logs for ADMIN users.
   * Filterable by userId, action, entity, entityId, dateFrom, and dateTo.
   * Sorted newest first (createdAt: "desc").
   */
  async getAuditLogs(query: AdminAuditLogQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (query.userId) {
      whereClause.userId = query.userId;
    }

    if (query.action) {
      whereClause.action = { equals: query.action, mode: "insensitive" };
    }

    if (query.entity) {
      whereClause.entity = { equals: query.entity, mode: "insensitive" };
    }

    if (query.entityId) {
      whereClause.entityId = query.entityId;
    }

    if (query.dateFrom || query.dateTo) {
      whereClause.createdAt = {};
      if (query.dateFrom) {
        whereClause.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        whereClause.createdAt.lte = new Date(query.dateTo);
      }
    }

    const [total, auditLogs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        include: AUDIT_LOG_INCLUDE_FIELDS,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      auditLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Number(totalPages),
      },
    };
  }

  /**
   * Get a single audit log entry by UUID.
   * Excludes passwordHash.
   */
  async getAuditLogById(id: string): Promise<AuditLog> {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
      include: AUDIT_LOG_INCLUDE_FIELDS,
    });

    if (!auditLog) {
      const error: AppError = new Error("Audit log not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return auditLog;
  }
}

export const auditLogService = new AuditLogService();
