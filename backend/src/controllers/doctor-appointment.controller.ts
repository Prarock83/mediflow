import { Request, Response, NextFunction } from "express";
import { doctorAppointmentService } from "../services/doctor-appointment.service";

export const getDoctorAppointmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const appointments = await doctorAppointmentService.getDoctorAppointments(
      userId,
      req.query as any
    );

    res.status(200).json({
      status: "success",
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorAppointmentByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const appointmentId = req.params.id as string;
    const appointment =
      await doctorAppointmentService.getDoctorAppointmentById(
        userId,
        appointmentId
      );

    res.status(200).json({
      status: "success",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const appointmentId = req.params.id as string;
    const updatedAppointment =
      await doctorAppointmentService.updateAppointmentStatus(
        userId,
        appointmentId,
        req.body
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
