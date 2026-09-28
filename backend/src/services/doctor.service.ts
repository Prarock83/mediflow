import { Doctor, DoctorAvailability } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  CreateDoctorInput,
  UpdateDoctorInput,
  CreateDoctorAvailabilityInput,
  UpdateDoctorAvailabilityInput,
} from "../schemas/doctor.schema";

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

  async createAvailability(
    userId: string,
    input: CreateDoctorAvailabilityInput
  ): Promise<DoctorAvailability> {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const existingSlots = await prisma.doctorAvailability.findMany({
      where: {
        doctorId: doctor.id,
        dayOfWeek: input.dayOfWeek,
      },
    });

    const hasOverlap = existingSlots.some(
      (slot) => input.startTime < slot.endTime && input.endTime > slot.startTime
    );

    if (hasOverlap) {
      const error: AppError = new Error("Doctor availability slot overlaps with an existing slot");
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const availability = await prisma.doctorAvailability.create({
      data: {
        doctorId: doctor.id,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDuration: input.slotDuration ?? 30,
        isAvailable: input.isAvailable ?? true,
      },
    });

    return availability;
  }

  async getAvailabilities(userId: string): Promise<DoctorAvailability[]> {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const availabilities = await prisma.doctorAvailability.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return availabilities;
  }

  async updateAvailability(
    userId: string,
    availabilityId: string,
    input: UpdateDoctorAvailabilityInput
  ): Promise<DoctorAvailability> {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const existingSlot = await prisma.doctorAvailability.findFirst({
      where: {
        id: availabilityId,
        doctorId: doctor.id,
      },
    });

    if (!existingSlot) {
      const error: AppError = new Error("Doctor availability slot not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const targetDayOfWeek = input.dayOfWeek ?? existingSlot.dayOfWeek;
    const targetStartTime = input.startTime ?? existingSlot.startTime;
    const targetEndTime = input.endTime ?? existingSlot.endTime;

    if (targetStartTime >= targetEndTime) {
      const error: AppError = new Error("startTime must be earlier than endTime");
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const otherSlots = await prisma.doctorAvailability.findMany({
      where: {
        doctorId: doctor.id,
        dayOfWeek: targetDayOfWeek,
        NOT: { id: availabilityId },
      },
    });

    const hasOverlap = otherSlots.some(
      (slot) => targetStartTime < slot.endTime && targetEndTime > slot.startTime
    );

    if (hasOverlap) {
      const error: AppError = new Error("Doctor availability slot overlaps with an existing slot");
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const updatedSlot = await prisma.doctorAvailability.update({
      where: { id: availabilityId },
      data: {
        ...(input.dayOfWeek !== undefined && { dayOfWeek: input.dayOfWeek }),
        ...(input.startTime !== undefined && { startTime: input.startTime }),
        ...(input.endTime !== undefined && { endTime: input.endTime }),
        ...(input.slotDuration !== undefined && { slotDuration: input.slotDuration }),
        ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
      },
    });

    return updatedSlot;
  }

  async deleteAvailability(
    userId: string,
    availabilityId: string
  ): Promise<void> {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor profile not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const existingSlot = await prisma.doctorAvailability.findFirst({
      where: {
        id: availabilityId,
        doctorId: doctor.id,
      },
    });

    if (!existingSlot) {
      const error: AppError = new Error("Doctor availability slot not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    await prisma.doctorAvailability.delete({
      where: { id: availabilityId },
    });
  }
}

export const doctorService = new DoctorService();
