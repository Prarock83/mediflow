import { Request, Response, NextFunction } from "express";
import { adminAppointmentService } from "../services/admin-appointment.service";

/**
 * Handler for GET /api/admin/appointments
 * Returns global paginated list of appointments with filters.
 */
export const getAppointmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as any;
    const result = await adminAppointmentService.getAppointments(query);

    res.status(200).json({
      status: "success",
      data: result.appointments,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for GET /api/admin/appointments/:id
 * Returns a single appointment by UUID.
 */
export const getAppointmentByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const appointment = await adminAppointmentService.getAppointmentById(id);

    res.status(200).json({
      status: "success",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for PATCH /api/admin/appointments/:id/status
 * Updates appointment status respecting status transition rules.
 */
export const updateAppointmentStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const adminUserId = req.user?.id;
    const updatedAppointment = await adminAppointmentService.updateAppointmentStatus(
      id,
      req.body,
      adminUserId
    );

    res.status(200).json({
      status: "success",
      message: "Appointment status updated successfully",
      data: updatedAppointment,
    });
  } catch (error) {
    next(error);
  }
};
