import { Request, Response, NextFunction } from "express";
import { auditLogService } from "../services/audit-log.service";

/**
 * Handler for GET /api/admin/audit-logs
 * Returns paginated list of audit logs.
 */
export const getAuditLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as any;
    const result = await auditLogService.getAuditLogs(query);

    res.status(200).json({
      status: "success",
      data: result.auditLogs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for GET /api/admin/audit-logs/:id
 * Returns a single audit log by UUID.
 */
export const getAuditLogByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const auditLog = await auditLogService.getAuditLogById(id);

    res.status(200).json({
      status: "success",
      data: auditLog,
    });
  } catch (error) {
    next(error);
  }
};
