import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { RegisterInput, LoginInput } from "../schemas/auth.schema";
import { AppError } from "../middleware/error.middleware";
import { env } from "../config/env";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: Date;
}

export interface LoginResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  token: string;
}

export class AuthService {
  async registerUser(input: RegisterInput): Promise<SafeUser> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check if user with given email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const error: AppError = new Error("Email is already registered");
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    // Hash password with bcrypt work factor of 10
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    // Split name into firstName and lastName to satisfy Prisma User model
    const nameParts = input.name.trim().split(/\s+/);
    const firstName = nameParts[0] || input.name;
    const lastName = nameParts.slice(1).join(" ");

    // Persist new user
    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        role: input.role as UserRole,
      },
    });

    const fullName = `${createdUser.firstName} ${createdUser.lastName}`.trim();

    // Return sanitized user object without password credentials
    return {
      id: createdUser.id,
      name: fullName,
      email: createdUser.email,
      role: createdUser.role,
      createdAt: createdUser.createdAt,
    };
  }

  async loginUser(input: LoginInput): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Find user by normalized email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      const error: AppError = new Error("Invalid email or password");
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    // Compare supplied password against stored password hash
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      const error: AppError = new Error("Invalid email or password");
      error.statusCode = 401;
      error.isOperational = true;
      throw error;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const fullName = `${user.firstName} ${user.lastName}`.trim();

    return {
      user: {
        id: user.id,
        name: fullName,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }
}

export const authService = new AuthService();

