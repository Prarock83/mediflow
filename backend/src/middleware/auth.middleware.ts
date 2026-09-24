import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env";

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Express middleware to authenticate requests via JWT Bearer token in the Authorization header.
 * Attaches the authenticated user (id and role) to `req.user`.
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      status: "error",
      message: "Authorization header is missing",
    });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1].trim()) {
    res.status(401).json({
      status: "error",
      message: "Invalid authorization format. Expected 'Bearer <token>'",
    });
    return;
  }

  const token = parts[1].trim();

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
    return;
  }

  if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) {
    res.status(401).json({
      status: "error",
      message: "Invalid token payload",
    });
    return;
  }

  const payload = decoded as Record<string, unknown>;

  const isValidId = typeof payload.id === "string" && payload.id.trim().length > 0;
  const isValidRole =
    typeof payload.role === "string" &&
    Object.values(UserRole).includes(payload.role as UserRole);

  if (!isValidId || !isValidRole) {
    res.status(401).json({
      status: "error",
      message: "Invalid token payload",
    });
    return;
  }

  req.user = {
    id: payload.id as string,
    role: payload.role as UserRole,
  };

  next();
};
