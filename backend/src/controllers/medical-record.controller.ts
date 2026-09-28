import { Request, Response, NextFunction } from "express";
import { medicalRecordService } from "../services/medical-record.service";

export const createMedicalRecordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const record = await medicalRecordService.createMedicalRecord(
      userId,
      req.body
    );

    res.status(201).json({
      status: "success",
      message: "Medical record created successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicalRecordByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const recordId = req.params.id as string;

    const record = await medicalRecordService.getMedicalRecordById(
      userId,
      role,
      recordId
    );

    res.status(200).json({
      status: "success",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyMedicalRecordsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const records = await medicalRecordService.getMyMedicalRecords(
      userId,
      role
    );

    res.status(200).json({
      status: "success",
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedicalRecordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const recordId = req.params.id as string;

    const record = await medicalRecordService.updateMedicalRecord(
      userId,
      recordId,
      req.body
    );

    res.status(200).json({
      status: "success",
      message: "Medical record updated successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};
