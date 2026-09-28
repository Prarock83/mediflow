import { Request, Response, NextFunction } from "express";
import { consultationService } from "../services/consultation.service";

export const createConsultationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const consultation = await consultationService.createConsultation(
      userId,
      req.body
    );

    res.status(201).json({
      status: "success",
      message: "Consultation record created successfully",
      data: consultation,
    });
  } catch (error) {
    next(error);
  }
};

export const getConsultationByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const consultationId = req.params.id as string;

    const consultation = await consultationService.getConsultationById(
      userId,
      role,
      consultationId
    );

    res.status(200).json({
      status: "success",
      data: consultation,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyConsultationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const consultations = await consultationService.getMyConsultations(
      userId,
      role
    );

    res.status(200).json({
      status: "success",
      data: consultations,
    });
  } catch (error) {
    next(error);
  }
};
