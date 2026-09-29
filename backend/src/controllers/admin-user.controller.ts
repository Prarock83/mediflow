import { Request, Response, NextFunction } from "express";
import { adminUserService } from "../services/admin-user.service";

/**
 * Handler for GET /api/admin/users
 * Returns paginated user list with role filter and search capabilities.
 */
export const getUsersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as any;
    const result = await adminUserService.getUsers(query);

    res.status(200).json({
      status: "success",
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handler for GET /api/admin/users/:id
 * Returns a single user by ID.
 */
export const getUserByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await adminUserService.getUserById(id);

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
