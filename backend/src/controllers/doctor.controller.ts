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
