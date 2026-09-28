import { Request, Response, NextFunction } from "express";
import { prescriptionService } from "../services/prescription.service";

export const createPrescriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const prescription = await prescriptionService.createPrescription(
      userId,
      req.body
    );

    res.status(201).json({
      status: "success",
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const prescriptionId = req.params.id as string;

    const prescription = await prescriptionService.getPrescriptionById(
      userId,
      role,
      prescriptionId
    );

    res.status(200).json({
      status: "success",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPrescriptionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const prescriptions = await prescriptionService.getMyPrescriptions(
      userId,
      role
    );

    res.status(200).json({
      status: "success",
      data: prescriptions,
    });
  } catch (error) {
    next(error);
  }
};
