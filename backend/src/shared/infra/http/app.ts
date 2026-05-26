import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { z } from "zod";
import { env } from "../../../config/env.js";
import { routes } from "./routes.js";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  }),
);

app.use(express.json());

app.use("/api/v1", routes);

app.use(
  (err: Error, req: Request, res: Response, _next: NextFunction): Response => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        status: "validation_error",
        message: "Invalid request payload attributes.",
        errors: err.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    console.error("[HTTP] Uncaught application exception:", err);

    return res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  },
);

export { app };
