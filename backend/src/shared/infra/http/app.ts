import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { z } from "zod";
import { env } from "../../../config/env.js";
import { routes } from "./routes.js";
import { errorMap } from "./validationErrors.js";

const app = express();

z.config({
  customError: errorMap as z.ZodErrorMap,
});

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
        errors: err.issues.map((issue: z.core.$ZodIssue) => ({
          field: issue.path.join("."),
          message: issue.message, // Aqui será injetada a string traduzida em português
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
