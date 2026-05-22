import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../../cache/redis.js";

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
) {
  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) return next();

  const cacheKey = `idempotency:${idempotencyKey}`;
  const savedResponse = await redisClient.get(cacheKey);

  if (savedResponse) {
    const { status, body } = JSON.parse(savedResponse);
    return res.status(status).json(body);
  }

  const lockAcquired = await redisClient.set(
    cacheKey,
    JSON.stringify({ status: 202, body: { message: "Processando..." } }),
    "EX",
    300,
    "NX",
  );

  if (!lockAcquired) {
    return res
      .status(409)
      .json({ error: "Conflito de requisições. Tente novamente." });
  }

  req.idempotencyCacheKey = cacheKey;
  next();
}
