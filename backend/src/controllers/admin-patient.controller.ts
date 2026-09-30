import { Request, Response, NextFunction } from "express";
import { adminPatientService } from "../services/admin-patient.service";

/**
 * Handler for GET /api/admin/patients
 * Returns paginated list of patients with user info.
 */
export const getPatientsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as any;
    const result = await adminPatientService.getPatients(query);

    res.status(200).json({
      status: "success",
      data: result.patients,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for GET /api/admin/patients/:id
 * Returns a single patient by Patient UUID.
 */
export const getPatientByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const patient = await adminPatientService.getPatientById(id);

    res.status(200).json({
      status: "success",
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for PATCH /api/admin/patients/:id/status
 * Updates the associated User.isActive status of a patient.
 */
export const updatePatientStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const adminUserId = req.user?.id;
    const updatedPatient = await adminPatientService.updatePatientStatus(
      id,
      req.body,
      adminUserId
    );

    res.status(200).json({
      status: "success",
      message: "Patient status updated successfully",
      data: updatedPatient,
    });
  } catch (error) {
    next(error);
  }
};
