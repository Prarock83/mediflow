import { Patient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { CreatePatientInput, UpdatePatientInput } from "../schemas/patient.schema";

export class PatientService {
  async createProfile(
    userId: string,
    input: CreatePatientInput
  ): Promise<Patient> {
    const existingProfile = await prisma.patient.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      const error: AppError = new Error("Patient profile already exists");
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const createdPatient = await prisma.patient.create({
      data: {
        userId,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        address: input.address,
        emergencyContact: input.emergencyContact,
      },
    });

    return createdPatient;
  }

  async getProfileByUserId(userId: string): Promise<Patient> {
    const profile = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!profile) {
      const error: AppError = new Error("Patient profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return profile;
  }

  async updateProfileByUserId(
    userId: string,
    input: UpdatePatientInput
  ): Promise<Patient> {
    const existingProfile = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      const error: AppError = new Error("Patient profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const updatedProfile = await prisma.patient.update({
      where: { userId },
      data: {
        ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.bloodGroup !== undefined && { bloodGroup: input.bloodGroup }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.emergencyContact !== undefined && { emergencyContact: input.emergencyContact }),
      },
    });

    return updatedProfile;
  }
}

export const patientService = new PatientService();
