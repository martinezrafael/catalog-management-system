import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../../cache/redis.js";

const IDEMPOTENCY_TTL_SECONDS = 300;

declare global {
  namespace Express {
    interface Request {
      idempotencyCacheKey?: string;
    }
  }
}

export async function ensureIdempotency(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void | Response> {
  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
    return next();
  }

  const cacheKey = `idempotency:${idempotencyKey}`;
  const savedResponse = await redisClient.get(cacheKey);

  if (savedResponse) {
    const { status, body } = JSON.parse(savedResponse);
    return res.status(status).json(body);
  }

  const lockAcquired = await redisClient.set(
    cacheKey,
    JSON.stringify({ status: 202, body: { message: "Processing request..." } }),
    "EX",
    IDEMPOTENCY_TTL_SECONDS,
    "NX",
  );

  if (!lockAcquired) {
    return res.status(409).json({
      error: "Conflict detected. This request is already being processed.",
    });
  }

  req.idempotencyCacheKey = cacheKey;

  return next();
}
