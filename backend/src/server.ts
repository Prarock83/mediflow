import express from "express";
import cors from "cors";
import { env } from "./config/env";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import { checkDatabaseConnection } from "./lib/db";
import { prisma } from "./lib/prisma";
import { notFoundHandler } from "./middleware/not-found.middleware";
import { errorHandler } from "./middleware/error.middleware";

const app = express();
const PORT = env.PORT;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

// Centralized 404 handler for unknown API routes (must be registered after all routes but before errorHandler)
app.use(notFoundHandler);

// Centralized error handling middleware (must be registered after all routes)
app.use(errorHandler);

const startServer = async () => {
  const isDbConnected = await checkDatabaseConnection();
  if (isDbConnected) {
    console.log("Database connection established successfully.");
  } else {
    console.warn("Warning: Could not connect to database on startup.");
  }

  const server = app.listen(PORT, () => {
    console.log(`MediFlow API running on port ${PORT}`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Initiating graceful shutdown...`);

    server.close(async (err) => {
      if (err) {
        console.error("Error closing HTTP server:", err);
      } else {
        console.log("HTTP server closed.");
      }

      try {
        await prisma.$disconnect();
        console.log("Prisma client disconnected successfully.");
        process.exit(err ? 1 : 0);
      } catch (dbErr) {
        console.error("Error disconnecting Prisma client:", dbErr);
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
};

export { app };

if (require.main === module) {
  startServer();
}
