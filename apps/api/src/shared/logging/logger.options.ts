import type { LoggerOptions } from "pino";
import { CorrelationContext } from "../correlation/correlation-context";

const MANDATE_KEY_PATTERN = /amk_[A-Za-z0-9_-]+/g;

const MAX_MASK_DEPTH = 6;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Masks mandate-key secrets wherever they appear in logged strings. Only walks plain data
 * (framework objects such as requests are serialized and redacted by pino instead).
 */
function maskKeys(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.replace(MANDATE_KEY_PATTERN, "amk_[REDACTED]");
  if (depth >= MAX_MASK_DEPTH) return value;
  if (Array.isArray(value)) return value.map((item) => maskKeys(item, depth + 1));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskKeys(v, depth + 1)]));
  }
  return value;
}

export function buildPinoOptions(level = "info"): LoggerOptions {
  return {
    level,
    base: undefined,
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        'res.headers["set-cookie"]',
        "password",
        "*.password",
        "*.*.password",
      ],
      censor: "[REDACTED]",
    },
    mixin: () => {
      const correlationId = CorrelationContext.current();
      return correlationId ? { correlationId } : {};
    },
    hooks: {
      logMethod(args, method) {
        method.apply(this, args.map((arg) => maskKeys(arg)) as Parameters<typeof method>);
      },
    },
  };
}
