import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../server";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

// Mock Prisma client to isolate unit/integration tests from actual database
jest.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

describe("Auth Routes - POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully register a new user with HTTP 201 and return safe user data", async () => {
    mockUser.findUnique.mockResolvedValueOnce(null);
    (mockUser.create as jest.Mock).mockImplementationOnce(async (args: any) => {
      return {
        id: "usr-12345",
        email: args.data.email,
        passwordHash: args.data.passwordHash,
        firstName: args.data.firstName,
        lastName: args.data.lastName,
        role: args.data.role,
        isActive: true,
        createdAt: new Date("2026-09-21T00:00:00.000Z"),
        updatedAt: new Date("2026-09-21T00:00:00.000Z"),
      };
    });

    const response = await request(app).post("/api/auth/register").send({
      name: "Dr. John Watson",
      email: "john.watson@mediflow.com",
      password: "securePassword123",
      role: "DOCTOR",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: "success",
      message: "User registered successfully",
      data: {
        id: "usr-12345",
        name: "Dr. John Watson",
        email: "john.watson@mediflow.com",
        role: "DOCTOR",
      },
    });

    // Ensure password and passwordHash are NEVER returned in response
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.passwordHash).toBeUndefined();

    // Verify DB calls
    expect(mockUser.findUnique).toHaveBeenCalledWith({
      where: { email: "john.watson@mediflow.com" },
    });
    expect(mockUser.create).toHaveBeenCalledTimes(1);

    // Verify password was hashed before being sent to Prisma create
    const createCallArgs = mockUser.create.mock.calls[0][0];
    const savedPasswordHash = createCallArgs.data.passwordHash;
    expect(savedPasswordHash).not.toBe("securePassword123");
    const isPasswordValid = await bcrypt.compare("securePassword123", savedPasswordHash);
    expect(isPasswordValid).toBe(true);
  });

  it("should return 400 Validation Error for invalid email format", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "John Doe",
      email: "not-an-email",
      password: "validPassword123",
      role: "PATIENT",
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toBe("Validation failed");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "email", message: "Invalid email format" }),
      ])
    );
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("should return 400 Validation Error for weak/invalid password (< 8 chars)", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Jane Doe",
      email: "jane@mediflow.com",
      password: "short",
      role: "PATIENT",
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toBe("Validation failed");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "password",
          message: "Password must be at least 8 characters long",
        }),
      ])
    );
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("should return 400 Validation Error for invalid user role", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Super Admin",
      email: "admin@mediflow.com",
      password: "superSecretPassword123",
      role: "SUPER_ADMIN",
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toBe("Validation failed");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "role",
          message: "Role must be one of PATIENT, DOCTOR, or ADMIN",
        }),
      ])
    );
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("should return HTTP 409 Conflict when attempting to register a duplicate email", async () => {
    mockUser.findUnique.mockResolvedValueOnce({
      id: "existing-user-id",
      email: "existing@mediflow.com",
    } as any);

    const response = await request(app).post("/api/auth/register").send({
      name: "Existing User",
      email: "existing@mediflow.com",
      password: "password12345",
      role: "PATIENT",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      status: "error",
      message: "Email is already registered",
    });
    expect(mockUser.create).not.toHaveBeenCalled();
  });
});

describe("Auth Routes - POST /api/auth/login", () => {
  const plainPassword = "securePassword123";
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash(plainPassword, 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully log in a user with valid credentials, returning HTTP 200, user info, and JWT token", async () => {
    mockUser.findUnique.mockResolvedValueOnce({
      id: "user-uuid-999",
      email: "doctor.john@mediflow.com",
      passwordHash: hashedPassword,
      firstName: "John",
      lastName: "Watson",
      role: "DOCTOR",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).post("/api/auth/login").send({
      email: "  DOCTOR.JOHN@MEDIFLOW.COM ",
      password: plainPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe("Login successful");
    expect(response.body.data.user).toEqual({
      id: "user-uuid-999",
      name: "John Watson",
      email: "doctor.john@mediflow.com",
      role: "DOCTOR",
    });

    // JWT token verification
    expect(response.body.data.token).toBeDefined();
    const decodedToken = jwt.verify(response.body.data.token, env.JWT_SECRET) as any;
    expect(decodedToken.id).toBe("user-uuid-999");
    expect(decodedToken.role).toBe("DOCTOR");

    // Ensure password and passwordHash are NEVER returned in response
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.password).toBeUndefined();

    // Ensure JWT secret is NOT exposed anywhere in response body
    expect(JSON.stringify(response.body)).not.toContain(env.JWT_SECRET);

    // Verify DB query used normalized email
    expect(mockUser.findUnique).toHaveBeenCalledWith({
      where: { email: "doctor.john@mediflow.com" },
    });
  });

  it("should return HTTP 401 with generic message when email does not exist", async () => {
    mockUser.findUnique.mockResolvedValueOnce(null);

    const response = await request(app).post("/api/auth/login").send({
      email: "nonexistent@mediflow.com",
      password: "somePassword123",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      message: "Invalid email or password",
    });
  });

  it("should return HTTP 401 with generic message when password is incorrect", async () => {
    mockUser.findUnique.mockResolvedValueOnce({
      id: "user-uuid-999",
      email: "doctor.john@mediflow.com",
      passwordHash: hashedPassword,
      firstName: "John",
      lastName: "Watson",
      role: "DOCTOR",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).post("/api/auth/login").send({
      email: "doctor.john@mediflow.com",
      password: "wrongPassword123",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      message: "Invalid email or password",
    });
  });

  it("should return HTTP 400 Validation Error for missing or invalid inputs", async () => {
    // Test invalid email format
    const resInvalidEmail = await request(app).post("/api/auth/login").send({
      email: "invalid-email",
      password: "password123",
    });

    expect(resInvalidEmail.status).toBe(400);
    expect(resInvalidEmail.body.status).toBe("error");
    expect(resInvalidEmail.body.message).toBe("Validation failed");

    // Test missing password
    const resMissingPassword = await request(app).post("/api/auth/login").send({
      email: "user@mediflow.com",
    });

    expect(resMissingPassword.status).toBe(400);
    expect(resMissingPassword.body.status).toBe("error");
    expect(resMissingPassword.body.message).toBe("Validation failed");

    expect(mockUser.findUnique).not.toHaveBeenCalled();
  });
});

