import request from "supertest";
import { app } from "../server";
import { checkDatabaseConnection } from "../lib/db";

// Mock the database check module to isolate tests from local PostgreSQL
jest.mock("../lib/db", () => ({
  checkDatabaseConnection: jest.fn(),
}));

const mockCheckDatabaseConnection = checkDatabaseConnection as jest.MockedFunction<
  typeof checkDatabaseConnection
>;

describe("Health Routes Integration Tests", () => {
  describe("GET /api/health", () => {
    it("should return 200 OK and the health status message", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ok",
        message: "MediFlow API is running",
      });
    });
  });

  describe("GET /api/health/db", () => {
    it("should return 200 OK when the database is connected", async () => {
      mockCheckDatabaseConnection.mockResolvedValueOnce(true);

      const response = await request(app).get("/api/health/db");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ok",
        database: "connected",
      });
      expect(mockCheckDatabaseConnection).toHaveBeenCalledTimes(1);
    });

    it("should return 503 Service Unavailable when database connection fails", async () => {
      mockCheckDatabaseConnection.mockResolvedValueOnce(false);

      const response = await request(app).get("/api/health/db");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        status: "error",
        database: "disconnected",
        message: "Database connection failed",
      });
      expect(mockCheckDatabaseConnection).toHaveBeenCalledTimes(1);
    });
  });
});
