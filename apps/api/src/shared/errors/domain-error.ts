import type { ErrorCode } from "./error-codes";

/** An expected, typed failure. The message is plain language and safe to show to clients. */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
