import { env } from "../../../config/env.js";
import { db } from "../database/postgres.js";
import { redisClient } from "../cache/redis.js";
import { app } from "./app.js";

const server = app.listen(env.PORT, () => {
  console.log(`[HTTP] Server is running stably on port ${env.PORT}`);
});

async function handleGracefulShutdown(signal: string) {
  console.log(`\n [HTTP] Received ${signal}. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      console.error("[HTTP] Error closing server:", err);
      process.exit(1);
    }

    try {
      console.log("[Database] Closing PostgreSQL connection pool...");
      await db.destroy();

      console.log("[Cache] Disconnecting Redis client...");
      await redisClient.quit();

      console.log("[HTTP] Graceful shutdown completed. Exiting process.");
      process.exit(0);
    } catch (error) {
      console.error("[HTTP] Error during resource cleanup:", error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("[HTTP] Forceful shutdown triggered after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught Exception occurred:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled Rejection occurred:", reason);
});
