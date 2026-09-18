import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Centralized Express error-handling middleware.
 * Logs internal errors on the server while returning a sanitized JSON response to the client.
 */
export const errorHandler = (
  err: AppError | any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error details on the server for debugging
  console.error("[ServerError]:", err);

  const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;

  // Mask internal/500 server errors to prevent exposing stack traces, credentials, or sensitive data
  const message =
    statusCode < 500 && err?.message
      ? err.message
      : "Internal server error";

  res.status(statusCode).json({
    status: "error",
    message,
  });
};
