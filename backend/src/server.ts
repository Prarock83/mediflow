import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./routes/health.routes";
import { checkDatabaseConnection } from "./lib/db";
import { errorHandler } from "./middleware/error.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);

// Centralized error handling middleware (must be registered after all routes)
app.use(errorHandler);

const startServer = async () => {
  const isDbConnected = await checkDatabaseConnection();
  if (isDbConnected) {
    console.log("Database connection established successfully.");
  } else {
    console.warn("Warning: Could not connect to database on startup.");
  }

  app.listen(PORT, () => {
    console.log(`MediFlow API running on port ${PORT}`);
  });
};

startServer();
