import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: string;
}

/**
 * Validates and returns runtime environment configuration.
 * Throws a sanitized error if required variables are missing.
 */
function validateEnv(): EnvConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.trim() === "") {
    console.error(
      "[ConfigError]: Missing required environment variable 'DATABASE_URL'."
    );
    throw new Error(
      "Configuration error: Missing required environment variable 'DATABASE_URL'."
    );
  }

  const defaultPort = 5000;
  const rawPort = process.env.PORT;
  const parsedPort = rawPort ? parseInt(rawPort, 10) : defaultPort;
  const port = !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : defaultPort;

  return {
    PORT: port,
    DATABASE_URL: databaseUrl,
    NODE_ENV: process.env.NODE_ENV || "development",
  };
}

export const env = validateEnv();
