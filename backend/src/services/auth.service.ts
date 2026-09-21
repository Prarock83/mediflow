import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { RegisterInput } from "../schemas/auth.schema";
import { AppError } from "../middleware/error.middleware";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: Date;
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
}

export const authService = new AuthService();
