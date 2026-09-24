import express, { Request, Response } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { requireAuth } from "./auth.middleware";
import { env } from "../config/env";

describe("Auth Middleware - requireAuth", () => {
  describe("Unit Tests (Mocked Request/Response/Next)", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFn: jest.Mock;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      nextFn = jest.fn();
    });

    it("should call next() and attach user to req.user for a valid token", () => {
      const validToken = jwt.sign(
        { id: "usr-unit-1", role: UserRole.DOCTOR },
        env.JWT_SECRET
      );
      mockReq.headers = {
        authorization: `Bearer ${validToken}`,
      };

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        id: "usr-unit-1",
        role: UserRole.DOCTOR,
      });
    });

    it("should return HTTP 401 when Authorization header is missing", () => {
      mockReq.headers = {};

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        message: "Authorization header is missing",
      });
    });

    it("should return HTTP 401 when token is expired", () => {
      const expiredToken = jwt.sign(
        { id: "usr-unit-2", role: UserRole.PATIENT },
        env.JWT_SECRET,
        { expiresIn: "-1s" }
      );
      mockReq.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        message: "Invalid or expired token",
      });
    });

    it("should return HTTP 401 when token payload contains an invalid role", () => {
      const invalidRoleToken = jwt.sign(
        { id: "usr-unit-3", role: "SUPER_ADMIN" },
        env.JWT_SECRET
      );
      mockReq.headers = {
        authorization: `Bearer ${invalidRoleToken}`,
      };

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        message: "Invalid token payload",
      });
    });
  });

  describe("Integration Tests (Express HTTP Route with Supertest)", () => {
    const app = express();
    app.use(express.json());

    // Test protected route using requireAuth middleware
    app.get("/api/protected", requireAuth, (req: Request, res: Response) => {
      res.status(200).json({
        status: "success",
        user: req.user,
      });
    });

    it("should return HTTP 401 for missing Authorization header", async () => {
      const res = await request(app).get("/api/protected");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: "error",
        message: "Authorization header is missing",
      });
    });

    it("should return HTTP 401 for malformed Authorization headers", async () => {
      // Missing Bearer prefix
      const res1 = await request(app)
        .get("/api/protected")
        .set("Authorization", "Token some-jwt-string");
      expect(res1.status).toBe(401);
      expect(res1.body.status).toBe("error");

      // Bearer without token
      const res2 = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer ");
      expect(res2.status).toBe(401);
      expect(res2.body.status).toBe("error");

      // Lowercase bearer prefix
      const res3 = await request(app)
        .get("/api/protected")
        .set("Authorization", "bearer token123");
      expect(res3.status).toBe(401);
      expect(res3.body.status).toBe("error");

      // Extra tokens / spaces
      const res4 = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer token1 token2");
      expect(res4.status).toBe(401);
      expect(res4.body.status).toBe("error");
    });

    it("should return HTTP 401 for invalid token string", async () => {
      const res = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer not.a.valid.jwt");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: "error",
        message: "Invalid or expired token",
      });
    });

    it("should return HTTP 401 for expired token", async () => {
      const expiredToken = jwt.sign(
        { id: "user-123", role: UserRole.PATIENT },
        env.JWT_SECRET,
        { expiresIn: "-10s" }
      );

      const res = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: "error",
        message: "Invalid or expired token",
      });
    });

    it("should return HTTP 401 for tampered token (signed with different secret)", async () => {
      const tamperedToken = jwt.sign(
        { id: "user-123", role: UserRole.ADMIN },
        "different-secret-key"
      );

      const res = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: "error",
        message: "Invalid or expired token",
      });
    });

    it("should allow access with 200 OK and attach user id and role to req.user for a valid token", async () => {
      const validToken = jwt.sign(
        { id: "usr-doctor-777", role: UserRole.DOCTOR },
        env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: "success",
        user: {
          id: "usr-doctor-777",
          role: UserRole.DOCTOR,
        },
      });
    });

    it("should return HTTP 401 for invalid JWT payload (missing or invalid id/role)", async () => {
      // Payload missing id
      const tokenNoId = jwt.sign({ role: UserRole.PATIENT }, env.JWT_SECRET);
      const resNoId = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tokenNoId}`);
      expect(resNoId.status).toBe(401);
      expect(resNoId.body).toEqual({
        status: "error",
        message: "Invalid token payload",
      });

      // Payload empty string id
      const tokenEmptyId = jwt.sign({ id: "   ", role: UserRole.PATIENT }, env.JWT_SECRET);
      const resEmptyId = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tokenEmptyId}`);
      expect(resEmptyId.status).toBe(401);
      expect(resEmptyId.body.status).toBe("error");

      // Payload numeric id
      const tokenNumId = jwt.sign({ id: 12345, role: UserRole.PATIENT }, env.JWT_SECRET);
      const resNumId = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tokenNumId}`);
      expect(resNumId.status).toBe(401);
      expect(resNumId.body.status).toBe("error");

      // Payload missing role
      const tokenNoRole = jwt.sign({ id: "usr-123" }, env.JWT_SECRET);
      const resNoRole = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tokenNoRole}`);
      expect(resNoRole.status).toBe(401);
      expect(resNoRole.body.status).toBe("error");

      // Payload invalid role string
      const tokenInvalidRole = jwt.sign(
        { id: "usr-123", role: "UNKNOWN_ROLE" },
        env.JWT_SECRET
      );
      const resInvalidRole = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${tokenInvalidRole}`);
      expect(resInvalidRole.status).toBe(401);
      expect(resInvalidRole.body.status).toBe("error");
    });
  });
});
