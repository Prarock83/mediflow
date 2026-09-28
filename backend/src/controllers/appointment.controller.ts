import { Request, Response, NextFunction } from "express";
import { appointmentService } from "../services/appointment.service";

export const createAppointmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const appointment = await appointmentService.createAppointment(userId, req.body);

    res.status(201).json({
      status: "success",
      message: "Appointment booked successfully",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientAppointmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const appointments = await appointmentService.getPatientAppointments(userId);

    res.status(200).json({
      status: "success",
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};
