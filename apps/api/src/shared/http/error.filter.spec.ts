import { BadRequestException, type ArgumentsHost } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "../errors/domain-error";
import { ErrorCode } from "../errors/error-codes";
import { HttpErrorFilter } from "./error.filter";

function makeHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({}) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function makeLogger() {
  return { warn: vi.fn(), error: vi.fn() };
}

describe("HttpErrorFilter", () => {
  it.each([
    [ErrorCode.UNAUTHORIZED, 401],
    [ErrorCode.FORBIDDEN, 403],
    [ErrorCode.NOT_FOUND, 404],
    [ErrorCode.VALIDATION_FAILED, 400],
    [ErrorCode.INVALID_REQUEST, 422],
    [ErrorCode.PAYMENT_DECLINED, 402],
    [ErrorCode.MANDATE_EXPIRED, 409],
    [ErrorCode.MANDATE_REVOKED, 409],
    [ErrorCode.MANDATE_EXHAUSTED, 409],
    [ErrorCode.MANDATE_NOT_ACTIVE, 409],
    [ErrorCode.OVER_PER_PURCHASE_CAP, 409],
    [ErrorCode.OVER_REMAINING_BUDGET, 409],
    [ErrorCode.CATEGORY_NOT_ALLOWED, 409],
    [ErrorCode.OUT_OF_STOCK, 409],
    [ErrorCode.PRICE_CHANGED, 409],
    [ErrorCode.IDEMPOTENCY_KEY_REUSED, 409],
    [ErrorCode.RUN_ALREADY_IN_PROGRESS, 409],
  ])("maps %s to HTTP %i with a typed body", (code, httpStatus) => {
    const { host, status, json } = makeHost();
    const logger = makeLogger();
    new HttpErrorFilter(logger).catch(new DomainError(code, "Plain message", { a: 1 }), host);
    expect(status).toHaveBeenCalledWith(httpStatus);
    expect(json).toHaveBeenCalledWith({
      error: { code, message: "Plain message", details: { a: 1 } },
    });
  });

  it("logs a domain error once at warn level without a stack", () => {
    const { host } = makeHost();
    const logger = makeLogger();
    new HttpErrorFilter(logger).catch(new DomainError(ErrorCode.NOT_FOUND, "Missing"), host);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logger.warn.mock.calls[0])).not.toContain("at ");
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("returns 500 without a stack trace and logs unknown errors once with the stack", () => {
    const { host, status, json } = makeHost();
    const logger = makeLogger();
    new HttpErrorFilter(logger).catch(new Error("boom"), host);
    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0]?.[0] as { error: Record<string, unknown> };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("boom");
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logger.error.mock.calls[0])).toContain("boom");
  });

  it("maps class-validator failures to VALIDATION_FAILED with field details", () => {
    const { host, status, json } = makeHost();
    const logger = makeLogger();
    const validationError = new BadRequestException({
      message: ["name must be shorter than or equal to 60 characters"],
      fieldErrors: { name: ["name must be shorter than or equal to 60 characters"] },
    });
    new HttpErrorFilter(logger).catch(validationError, host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: ErrorCode.VALIDATION_FAILED,
        message: "Some fields are invalid.",
        details: { name: ["name must be shorter than or equal to 60 characters"] },
      },
    });
  });
});
