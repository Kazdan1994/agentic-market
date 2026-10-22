import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { CorrelationContext } from "./correlation-context";

export const CORRELATION_HEADER = "x-correlation-id";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[CORRELATION_HEADER];
    const correlationId =
      typeof incoming === "string" && UUID_PATTERN.test(incoming) ? incoming : randomUUID();
    res.setHeader("X-Correlation-Id", correlationId);
    CorrelationContext.run(correlationId, () => next());
  }
}
