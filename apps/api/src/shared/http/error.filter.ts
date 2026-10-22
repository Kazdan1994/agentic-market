import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";
import { DomainError } from "../errors/domain-error";
import { ErrorCode, HTTP_STATUS_BY_CODE } from "../errors/error-codes";

export interface ErrorLogger {
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: Readonly<Record<string, unknown>> };
}

const CODE_BY_HTTP_STATUS: Readonly<Record<number, ErrorCode>> = {
  400: ErrorCode.VALIDATION_FAILED,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
};

/**
 * Turns every thrown error into `{ error: { code, message, details? } }` and logs it exactly
 * once: expected failures at warn without a stack, unexpected ones at error with the stack.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: ErrorLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toResponse(exception);
    response.status(status).json(body);
  }

  private toResponse(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof DomainError) {
      this.logger.warn({ code: exception.code, details: exception.details }, exception.message);
      return this.typed(exception.code, exception.message, exception.details);
    }
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error({ err: { message: error.message, stack: error.stack } }, "Unhandled error");
    return this.typed(ErrorCode.INTERNAL_ERROR, "Something went wrong. Please try again.");
  }

  private fromHttpException(exception: HttpException): { status: number; body: ErrorBody } {
    const payload = exception.getResponse();
    const fieldErrors =
      typeof payload === "object" && payload !== null && "fieldErrors" in payload
        ? (payload as { fieldErrors: Record<string, unknown> }).fieldErrors
        : undefined;
    if (fieldErrors) {
      this.logger.warn({ code: ErrorCode.VALIDATION_FAILED, details: fieldErrors }, "Validation failed");
      return this.typed(ErrorCode.VALIDATION_FAILED, "Some fields are invalid.", fieldErrors);
    }
    const code = CODE_BY_HTTP_STATUS[exception.getStatus()];
    if (code) {
      this.logger.warn({ code }, exception.message);
      return this.typed(code, exception.message);
    }
    this.logger.error({ err: { message: exception.message, stack: exception.stack } }, "Unmapped HTTP error");
    return this.typed(ErrorCode.INTERNAL_ERROR, "Something went wrong. Please try again.");
  }

  private typed(
    code: ErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ): { status: number; body: ErrorBody } {
    const error = details ? { code, message, details } : { code, message };
    return { status: HTTP_STATUS_BY_CODE[code], body: { error } };
  }
}
