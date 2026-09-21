import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema } from "zod";

export type ValidationTarget = "body" | "params" | "query";

export interface ValidationErrorDetail {
  path: string;
  message: string;
}

export interface ValidationErrorResponse {
  status: "error";
  message: string;
  errors: ValidationErrorDetail[];
}

/**
 * Reusable Express request-validation middleware using Zod.
 *
 * @param schema - The Zod schema to validate against.
 * @param target - The request target to validate ("body", "params", or "query", defaults to "body").
 */
export const validate = (
  schema: ZodSchema,
  target: ValidationTarget = "body"
): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = await schema.safeParseAsync(req[target]);

    if (!result.success) {
      const formattedErrors: ValidationErrorDetail[] = result.error.issues.map(
        (issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })
      );

      const errorResponse: ValidationErrorResponse = {
        status: "error",
        message: "Validation failed",
        errors: formattedErrors,
      };

      res.status(400).json(errorResponse);
      return;
    }

    req[target] = result.data;
    next();
  };
};
