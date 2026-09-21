import express, { Request, Response } from "express";
import request from "supertest";
import { z } from "zod";
import { validate } from "./validate.middleware";

describe("Validate Middleware", () => {
  describe("Unit Tests (Mocked Request/Response)", () => {
    const testSchema = z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      age: z.number().positive("Age must be positive"),
    });

    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFn: jest.Mock;

    beforeEach(() => {
      mockReq = {
        body: {},
        params: {},
        query: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      nextFn = jest.fn();
    });

    it("should call next() and sanitize req.body on valid body data", async () => {
      mockReq.body = {
        name: "Alice",
        age: 30,
        extraField: "should be stripped",
      };

      const middleware = validate(testSchema, "body");
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.body).toEqual({
        name: "Alice",
        age: 30,
      });
    });

    it("should return HTTP 400 and formatted error response on invalid body data", async () => {
      mockReq.body = {
        name: "A",
        age: -5,
      };

      const middleware = validate(testSchema, "body");
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        message: "Validation failed",
        errors: [
          {
            path: "name",
            message: "Name must be at least 2 characters",
          },
          {
            path: "age",
            message: "Age must be positive",
          },
        ],
      });
    });

    it("should validate req.params correctly", async () => {
      const paramsSchema = z.object({
        id: z.string().uuid("Invalid UUID format"),
      });

      const validId = "123e4567-e89b-12d3-a456-426614174000";
      mockReq.params = { id: validId };

      const middleware = validate(paramsSchema, "params");
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(mockReq.params).toEqual({ id: validId });
    });

    it("should return HTTP 400 on invalid req.params", async () => {
      const paramsSchema = z.object({
        id: z.string().uuid("Invalid UUID format"),
      });

      mockReq.params = { id: "not-a-uuid" };

      const middleware = validate(paramsSchema, "params");
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        message: "Validation failed",
        errors: [
          {
            path: "id",
            message: "Invalid UUID format",
          },
        ],
      });
    });

    it("should validate req.query correctly with type coercion", async () => {
      const querySchema = z.object({
        page: z.coerce.number().min(1),
        search: z.string().optional(),
      });

      mockReq.query = { page: "2", search: "health" };

      const middleware = validate(querySchema, "query");
      await middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(mockReq.query).toEqual({ page: 2, search: "health" });
    });
  });

  describe("Integration Tests (Express App with Supertest)", () => {
    const app = express();
    app.use(express.json());

    const userBodySchema = z.object({
      email: z.string().email("Invalid email format"),
      role: z.enum(["ADMIN", "USER", "DOCTOR"]),
    });

    const paramSchema = z.object({
      patientId: z.coerce.number().positive(),
    });

    const querySchema = z.object({
      limit: z.coerce.number().max(100, "Number must be less than or equal to 100"),
    });

    app.post("/test-body", validate(userBodySchema, "body"), (req: Request, res: Response) => {
      res.status(200).json({ status: "success", data: req.body });
    });

    app.get("/test-params/:patientId", validate(paramSchema, "params"), (req: Request, res: Response) => {
      res.status(200).json({ status: "success", params: req.params });
    });

    app.get("/test-query", validate(querySchema, "query"), (req: Request, res: Response) => {
      res.status(200).json({ status: "success", query: req.query });
    });

    it("POST /test-body - should pass with 200 OK for valid body", async () => {
      const res = await request(app)
        .post("/test-body")
        .send({ email: "user@mediflow.com", role: "DOCTOR" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: "success",
        data: { email: "user@mediflow.com", role: "DOCTOR" },
      });
    });

    it("POST /test-body - should return 400 for invalid email/role", async () => {
      const res = await request(app)
        .post("/test-body")
        .send({ email: "invalid-email", role: "INVALID_ROLE" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: "error",
        message: "Validation failed",
        errors: expect.arrayContaining([
          expect.objectContaining({ path: "email" }),
          expect.objectContaining({ path: "role" }),
        ]),
      });
    });

    it("GET /test-params/:patientId - should pass for valid numeric patientId param", async () => {
      const res = await request(app).get("/test-params/42");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: "success",
        params: { patientId: 42 },
      });
    });

    it("GET /test-params/:patientId - should return 400 for invalid patientId param", async () => {
      const res = await request(app).get("/test-params/abc");

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toBe("Validation failed");
    });

    it("GET /test-query - should return 400 when query parameter exceeds max limit", async () => {
      const res = await request(app).get("/test-query?limit=500");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: "error",
        message: "Validation failed",
        errors: [
          {
            path: "limit",
            message: "Number must be less than or equal to 100",
          },
        ],
      });
    });
  });
});
