import { Doctor, DoctorAvailability, AppointmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  CreateDoctorInput,
  UpdateDoctorInput,
  CreateDoctorAvailabilityInput,
  UpdateDoctorAvailabilityInput,
  PatientDoctorQueryInput,
} from "../schemas/doctor.schema";

const PUBLIC_DOCTOR_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phoneNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const PUBLIC_DOCTOR_INCLUDE = {
  user: {
    select: PUBLIC_DOCTOR_USER_SELECT,
  },
  specialization: true,
};

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

  /**
   * Get a paginated list of active doctors for PATIENT discovery.
   * Supports search (name, email, license), specialization filter, minExperience, maxFee, and sorting.
   * Excludes inactive doctors. Excludes passwordHash.
   */
  async getPublicDoctors(query: PatientDoctorQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      user: {
        isActive: true,
      },
    };

    if (query.specializationId) {
      whereClause.specializationId = query.specializationId;
    }

    if (query.minExperience !== undefined) {
      whereClause.experienceYears = { gte: Number(query.minExperience) };
    }

    const maxFee = query.maxFee !== undefined ? query.maxFee : query.maxConsultationFee;
    if (maxFee !== undefined) {
      whereClause.consultationFee = { lte: Number(maxFee) };
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      whereClause.AND = [
        {
          OR: [
            { user: { firstName: { contains: searchTerm, mode: "insensitive" } } },
            { user: { lastName: { contains: searchTerm, mode: "insensitive" } } },
            { user: { email: { contains: searchTerm, mode: "insensitive" } } },
            { licenseNumber: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
      ];
    }

    const sortOption = query.sortBy || query.sort || "newest";
    let orderBy: any = { createdAt: "desc" };

    if (sortOption === "experience") {
      orderBy = [{ experienceYears: "desc" }, { createdAt: "desc" }];
    } else if (sortOption === "consultationFee") {
      orderBy = [{ consultationFee: "asc" }, { createdAt: "desc" }];
    } else {
      orderBy = [{ createdAt: "desc" }, { id: "desc" }];
    }

    const [total, doctors] = await Promise.all([
      prisma.doctor.count({ where: whereClause }),
      prisma.doctor.findMany({
        where: whereClause,
        include: PUBLIC_DOCTOR_INCLUDE,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      doctors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Number(totalPages),
      },
    };
  }

  /**
   * Get public profile of a single active doctor by Doctor UUID.
   * Returns 404 if doctor does not exist or user is inactive.
   */
  async getPublicDoctorById(id: string): Promise<Doctor> {
    const doctor = await prisma.doctor.findFirst({
      where: {
        id,
        user: {
          isActive: true,
        },
      },
      include: PUBLIC_DOCTOR_INCLUDE,
    });

    if (!doctor) {
      const error: AppError = new Error("Doctor not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return doctor;
  }

  /**
   * Get available appointment slots for a specific active doctor on a specific date (YYYY-MM-DD).
   * Generates slots dynamically from doctor availability windows, checking existing non-cancelled appointments for conflicts.
   * Excludes past slots for today. Rejects completely past dates with HTTP 400.
   */
  async getDoctorSlots(doctorId: string, dateStr: string) {
    // 1. Verify doctor exists and associated user is active
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!doctor || !doctor.user || !doctor.user.isActive) {
      const error: AppError = new Error("Doctor not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    // 2. Validate date against current UTC time
    const [year, month, day] = dateStr.split("-").map(Number);
    const reqDateUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDate = now.getUTCDate();
    const todayStartUtc = new Date(Date.UTC(currentYear, currentMonth, currentDate, 0, 0, 0, 0));

    if (reqDateUtc.getTime() < todayStartUtc.getTime()) {
      const error: AppError = new Error("Date cannot be in the past");
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const isToday = reqDateUtc.getTime() === todayStartUtc.getTime();

    // 3. Determine day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = reqDateUtc.getUTCDay();

    // 4. Query active doctor availability for this day of week
    const availabilities = await prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        dayOfWeek,
        isAvailable: true,
      },
      orderBy: [{ startTime: "asc" }],
    });

    if (availabilities.length === 0) {
      return {
        doctorId,
        date: dateStr,
        slots: [],
      };
    }

    // 5. Query non-cancelled existing appointments for doctor on that day
    const dayEndUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { lte: dayEndUtc },
        endTime: { gte: reqDateUtc },
      },
    });

    // 6. Generate slots dynamically for each availability record
    const slots: Array<{ startTime: string; endTime: string; available: boolean }> = [];
    const generatedSlotStarts = new Set<string>();

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    for (const avail of availabilities) {
      if (!timeRegex.test(avail.startTime) || !timeRegex.test(avail.endTime)) {
        continue;
      }
      if (avail.startTime >= avail.endTime) {
        continue;
      }

      const durationMinutes = avail.slotDuration && avail.slotDuration > 0 ? avail.slotDuration : 30;
      const durationMs = durationMinutes * 60 * 1000;

      const [startH, startM] = avail.startTime.split(":").map(Number);
      const [endH, endM] = avail.endTime.split(":").map(Number);

      const windowStart = new Date(Date.UTC(year, month - 1, day, startH, startM, 0, 0));
      const windowEnd = new Date(Date.UTC(year, month - 1, day, endH, endM, 0, 0));

      let currTimeMs = windowStart.getTime();

      while (currTimeMs + durationMs <= windowEnd.getTime()) {
        const slotStart = new Date(currTimeMs);
        const slotEnd = new Date(currTimeMs + durationMs);
        currTimeMs += durationMs;

        const slotStartIso = slotStart.toISOString();

        // Skip duplicates across overlapping availability records
        if (generatedSlotStarts.has(slotStartIso)) {
          continue;
        }

        // For today, exclude slots whose start time has already passed
        if (isToday && slotStart.getTime() <= now.getTime()) {
          continue;
        }

        generatedSlotStarts.add(slotStartIso);

        // Check for interval overlap with existing non-cancelled appointments
        const isOverlapping = existingAppointments.some((app) => {
          const appStartMs = new Date(app.startTime).getTime();
          const appEndMs = new Date(app.endTime).getTime();
          return slotStart.getTime() < appEndMs && slotEnd.getTime() > appStartMs;
        });

        slots.push({
          startTime: slotStartIso,
          endTime: slotEnd.toISOString(),
          available: !isOverlapping,
        });
      }
    }

    return {
      doctorId,
      date: dateStr,
      slots,
    };
  }
}

export const doctorService = new DoctorService();
