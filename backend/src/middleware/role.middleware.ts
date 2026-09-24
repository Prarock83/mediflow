import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Restricts route access to users with one of the specified allowed roles.
 * Must be used after `requireAuth` middleware.
 *
 * @param allowedRoles List of permitted `UserRole` values.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: "error",
        message: "Access forbidden: insufficient permissions",
      });
      return;
    }

    next();
  };
};
