import express, { Request, Response } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { requireAuth } from "./auth.middleware";
import { requireRole } from "./role.middleware";
import { env } from "../config/env";

describe("Role Middleware - requireRole", () => {
  describe("Unit Tests (Mocked Request/Response/Next)", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFn: jest.Mock;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      nextFn = jest.fn();
    });

    it("should return HTTP 401 when req.user is missing (unauthenticated request)", () => {
      mockReq.user = undefined;

      const middleware = requireRole(UserRole.DOCTOR);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        message: "Authentication required",
      });
    });

    it("should return HTTP 403 when user role is not in allowed roles", () => {
      mockReq.user = {
        id: "usr-patient-1",
        role: UserRole.PATIENT,
      };

      const middleware = requireRole(UserRole.DOCTOR);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        message: "Access forbidden: insufficient permissions",
      });
    });

    it("should call next() when user role matches single allowed role", () => {
      mockReq.user = {
        id: "usr-doctor-1",
        role: UserRole.DOCTOR,
      };

      const middleware = requireRole(UserRole.DOCTOR);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should call next() when user role matches one of multiple allowed roles", () => {
      mockReq.user = {
        id: "usr-admin-1",
        role: UserRole.ADMIN,
      };

      const middleware = requireRole(UserRole.DOCTOR, UserRole.ADMIN);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("Integration Tests (Express App with Supertest)", () => {
    const app = express();
    app.use(express.json());

    // Protected route for PATIENT only
    app.get(
      "/api/patient-only",
      requireAuth,
      requireRole(UserRole.PATIENT),
      (_req: Request, res: Response) => {
        res.status(200).json({ status: "success", message: "Patient area" });
      }
    );

    // Protected route for DOCTOR only
    app.get(
      "/api/doctor-only",
      requireAuth,
      requireRole(UserRole.DOCTOR),
      (_req: Request, res: Response) => {
        res.status(200).json({ status: "success", message: "Doctor area" });
      }
    );

    // Protected route for ADMIN only
    app.get(
      "/api/admin-only",
      requireAuth,
      requireRole(UserRole.ADMIN),
      (_req: Request, res: Response) => {
        res.status(200).json({ status: "success", message: "Admin area" });
      }
    );

    // Protected route for DOCTOR or ADMIN
    app.get(
      "/api/staff-only",
      requireAuth,
      requireRole(UserRole.DOCTOR, UserRole.ADMIN),
      (_req: Request, res: Response) => {
        res.status(200).json({ status: "success", message: "Staff area" });
      }
    );

    // Route using requireRole WITHOUT requireAuth (to test unauthenticated req.user guard)
    app.get(
      "/api/no-auth-guard",
      requireRole(UserRole.PATIENT),
      (_req: Request, res: Response) => {
        res.status(200).json({ status: "success" });
      }
    );

    const createToken = (id: string, role: UserRole): string => {
      return jwt.sign({ id, role }, env.JWT_SECRET, { expiresIn: "1h" });
    };

    it("should return HTTP 401 for unauthenticated request without token", async () => {
      const res = await request(app).get("/api/doctor-only");
      expect(res.status).toBe(401);
      expect(res.body.status).toBe("error");
    });

    it("should return HTTP 401 when requireRole is called on route without req.user", async () => {
      const res = await request(app).get("/api/no-auth-guard");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: "error",
        message: "Authentication required",
      });
    });

    it("PATIENT accessing PATIENT-only route → allowed (200 OK)", async () => {
      const patientToken = createToken("pat-100", UserRole.PATIENT);
      const res = await request(app)
        .get("/api/patient-only")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "success", message: "Patient area" });
    });

    it("PATIENT accessing DOCTOR-only route → forbidden (403 Forbidden)", async () => {
      const patientToken = createToken("pat-100", UserRole.PATIENT);
      const res = await request(app)
        .get("/api/doctor-only")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        status: "error",
        message: "Access forbidden: insufficient permissions",
      });
    });

    it("DOCTOR accessing DOCTOR-only route → allowed (200 OK)", async () => {
      const doctorToken = createToken("doc-200", UserRole.DOCTOR);
      const res = await request(app)
        .get("/api/doctor-only")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "success", message: "Doctor area" });
    });

    it("ADMIN accessing ADMIN-only route → allowed (200 OK)", async () => {
      const adminToken = createToken("adm-300", UserRole.ADMIN);
      const res = await request(app)
        .get("/api/admin-only")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "success", message: "Admin area" });
    });

    it("multiple allowed roles → DOCTOR and ADMIN allowed, PATIENT forbidden", async () => {
      const doctorToken = createToken("doc-200", UserRole.DOCTOR);
      const adminToken = createToken("adm-300", UserRole.ADMIN);
      const patientToken = createToken("pat-100", UserRole.PATIENT);

      const resDoctor = await request(app)
        .get("/api/staff-only")
        .set("Authorization", `Bearer ${doctorToken}`);
      expect(resDoctor.status).toBe(200);

      const resAdmin = await request(app)
        .get("/api/staff-only")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(200);

      const resPatient = await request(app)
        .get("/api/staff-only")
        .set("Authorization", `Bearer ${patientToken}`);
      expect(resPatient.status).toBe(403);
      expect(resPatient.body).toEqual({
        status: "error",
        message: "Access forbidden: insufficient permissions",
      });
    });
  });
});
