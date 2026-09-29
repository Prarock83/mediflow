import { Request, Response, NextFunction } from "express";
import { adminDoctorService } from "../services/admin-doctor.service";

/**
 * Handler for GET /api/admin/doctors
 * Returns paginated list of doctors with user and specialization info.
 */
export const getDoctorsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as any;
    const result = await adminDoctorService.getDoctors(query);

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
 * Handler for GET /api/admin/doctors/:id
 * Returns a single doctor by Doctor UUID.
 */
export const getDoctorByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const doctor = await adminDoctorService.getDoctorById(id);

    res.status(200).json({
      status: "success",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for PATCH /api/admin/doctors/:id/status
 * Updates the associated User.isActive status of a doctor.
 */
export const updateDoctorStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updatedDoctor = await adminDoctorService.updateDoctorStatus(
      id,
      req.body
    );

    res.status(200).json({
      status: "success",
      message: "Doctor status updated successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    next(error);
  }
};
