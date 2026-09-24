import { Request, Response, NextFunction } from "express";
import { patientService } from "../services/patient.service";

export const createPatientProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await patientService.createProfile(userId, req.body);

    res.status(201).json({
      status: "success",
      message: "Patient profile created successfully",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await patientService.getProfileByUserId(userId);

    res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatientProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await patientService.updateProfileByUserId(userId, req.body);

    res.status(200).json({
      status: "success",
      message: "Patient profile updated successfully",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};
