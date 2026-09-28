import { Doctor } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { CreateDoctorInput, UpdateDoctorInput } from "../schemas/doctor.schema";

export class DoctorService {
  async createProfile(
    userId: string,
    input: CreateDoctorInput
  ): Promise<Doctor> {
    const existingProfile = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      const error: AppError = new Error("Doctor profile already exists");
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const existingLicense = await prisma.doctor.findUnique({
      where: { licenseNumber: input.licenseNumber },
    });

    if (existingLicense) {
      const error: AppError = new Error("Doctor license number already exists");
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const specialization = await prisma.specialization.findUnique({
      where: { id: input.specializationId },
    });

    if (!specialization) {
      const error: AppError = new Error("Specialization not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const createdDoctor = await prisma.doctor.create({
      data: {
        userId,
        licenseNumber: input.licenseNumber,
        specializationId: input.specializationId,
        experienceYears: input.experienceYears ?? 0,
        bio: input.bio,
        consultationFee: input.consultationFee,
      },
      include: {
        specialization: true,
      },
    });

    return createdDoctor;
  }

  async getProfileByUserId(userId: string): Promise<Doctor> {
    const profile = await prisma.doctor.findUnique({
      where: { userId },
      include: {
        specialization: true,
      },
    });

    if (!profile) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return profile;
  }

  async updateProfileByUserId(
    userId: string,
    input: UpdateDoctorInput
  ): Promise<Doctor> {
    const existingProfile = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (
      input.licenseNumber !== undefined &&
      input.licenseNumber !== existingProfile.licenseNumber
    ) {
      const existingLicense = await prisma.doctor.findUnique({
        where: { licenseNumber: input.licenseNumber },
      });

      if (existingLicense) {
        const error: AppError = new Error("Doctor license number already exists");
        error.statusCode = 409;
        error.isOperational = true;
        throw error;
      }
    }

    if (input.specializationId !== undefined) {
      const specialization = await prisma.specialization.findUnique({
        where: { id: input.specializationId },
      });

      if (!specialization) {
        const error: AppError = new Error("Specialization not found");
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }
    }

    const updatedProfile = await prisma.doctor.update({
      where: { userId },
      data: {
        ...(input.licenseNumber !== undefined && { licenseNumber: input.licenseNumber }),
        ...(input.specializationId !== undefined && { specializationId: input.specializationId }),
        ...(input.experienceYears !== undefined && { experienceYears: input.experienceYears }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.consultationFee !== undefined && { consultationFee: input.consultationFee }),
      },
      include: {
        specialization: true,
      },
    });

    return updatedProfile;
  }
}

export const doctorService = new DoctorService();
