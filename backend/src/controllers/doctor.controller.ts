import { Request, Response, NextFunction } from "express";
import { doctorService } from "../services/doctor.service";

export const createDoctorProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await doctorService.createProfile(userId, req.body);

    res.status(201).json({
      status: "success",
      message: "Doctor profile created successfully",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await doctorService.getProfileByUserId(userId);

    res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await doctorService.updateProfileByUserId(userId, req.body);

    res.status(200).json({
      status: "success",
      message: "Doctor profile updated successfully",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const createDoctorAvailabilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const availability = await doctorService.createAvailability(userId, req.body);

    res.status(201).json({
      status: "success",
      message: "Doctor availability created successfully",
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorAvailabilitiesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const availabilities = await doctorService.getAvailabilities(userId);

    res.status(200).json({
      status: "success",
      data: availabilities,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorAvailabilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const availabilityId = req.params.id as string;
    const availability = await doctorService.updateAvailability(
      userId,
      availabilityId,
      req.body
    );

    res.status(200).json({
      status: "success",
      message: "Doctor availability updated successfully",
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDoctorAvailabilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const availabilityId = req.params.id as string;
    await doctorService.deleteAvailability(userId, availabilityId);

    res.status(200).json({
      status: "success",
      message: "Doctor availability deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for GET /api/doctors
 * PATIENT-only discovery endpoint returning paginated list of active doctors.
 */
export const getPublicDoctorsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as any;
    const result = await doctorService.getPublicDoctors(query);

    res.status(200).json({
      status: "success",
      data: result.doctors,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for GET /api/doctors/:id
 * PATIENT-only lookup endpoint returning safe profile of single active doctor by UUID.
 */
export const getPublicDoctorByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const doctor = await doctorService.getPublicDoctorById(id);

    res.status(200).json({
      status: "success",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for GET /api/doctors/:doctorId/slots?date=YYYY-MM-DD
 * PATIENT-only endpoint returning generated appointment slots for a doctor on a given date.
 */
export const getDoctorSlotsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorId = req.params.doctorId as string;
    const date = req.query.date as string;
    const result = await doctorService.getDoctorSlots(doctorId, date);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
