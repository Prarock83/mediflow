import { Request, Response } from "express";

/**
 * Centralized Express 404 handler for unknown routes.
 * Returns a consistent JSON error payload with HTTP status 404.
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
};
