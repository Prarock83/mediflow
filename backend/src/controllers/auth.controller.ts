import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.registerUser(req.body);

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.loginUser(req.body);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

