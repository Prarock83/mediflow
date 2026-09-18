import { Router, Request, Response } from "express";
import { checkDatabaseConnection } from "../lib/db";

const router = Router();

// GET /api/health
router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "MediFlow API is running",
  });
});

// GET /api/health/db
router.get("/db", async (_req: Request, res: Response) => {
  const isConnected = await checkDatabaseConnection();

  if (isConnected) {
    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } else {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      message: "Database connection failed",
    });
  }
});

export default router;
