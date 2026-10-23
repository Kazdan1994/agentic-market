import { describe, expect, it } from "vitest";
import { DomainError } from "../../shared/errors/domain-error";
import { Mandate, type NewMandateProps } from "./mandate";

const NOW = new Date("2026-10-23T12:00:00Z");
const TOMORROW = new Date("2026-10-24T12:00:00Z");

const props: NewMandateProps = {
  id: "00000000-0000-7000-8000-000000000001",
  agentId: "00000000-0000-7000-8000-0000000000a1",
  userId: "00000000-0000-7000-8000-000000000003",
  perPurchaseCapMinor: 10_000,
  totalBudgetMinor: 15_000,
  categoryIds: ["00000000-0000-7000-8000-0000000000c1"],
  expiresAt: TOMORROW,
};

function fieldOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof DomainError) return error.details?.field as string | undefined;
    throw error;
  }
  throw new Error("expected a DomainError");
}

describe("Mandate.create", () => {
  it("starts active with nothing spent", () => {
    const mandate = Mandate.create(props, NOW);
    expect(mandate.spentMinor).toBe(0);
    expect(mandate.status(NOW)).toBe("active");
    expect(mandate.currency).toBe("EUR");
  });

  it.each([
    [{ perPurchaseCapMinor: 0 }, "perPurchaseCapMinor"],
    [{ totalBudgetMinor: -1 }, "totalBudgetMinor"],
    [{ perPurchaseCapMinor: 15_001 }, "perPurchaseCapMinor"],
    [{ categoryIds: [] }, "categoryIds"],
    [{ expiresAt: NOW }, "expiresAt"],
  ] as const)("rejects %o naming field %s", (override, field) => {
    expect(fieldOf(() => Mandate.create({ ...props, ...override }, NOW))).toBe(field);
  });
});

describe("Mandate derived values", () => {
  const restore = (spentMinor: number, revokedAt: Date | null = null) =>
    Mandate.restore({ ...props, spentMinor, currency: "EUR", revokedAt, createdAt: NOW });

  it("computes remaining budget and effective limit", () => {
    expect(restore(0).effectiveLimitMinor).toBe(10_000);
    const partly = restore(8_000);
    expect(partly.remainingMinor).toBe(7_000);
    expect(partly.effectiveLimitMinor).toBe(7_000);
  });

  it("orders statuses revoked > expired > exhausted > active", () => {
    expect(restore(15_000, NOW).status(TOMORROW)).toBe("revoked");
    expect(restore(15_000).status(TOMORROW)).toBe("expired");
    expect(restore(15_000).status(NOW)).toBe("exhausted");
    expect(restore(14_999).status(NOW)).toBe("active");
  });

  it("revokes only an active mandate, once", () => {
    const revoked = restore(0).revoke(NOW);
    expect(revoked.status(NOW)).toBe("revoked");
    expect(() => revoked.revoke(NOW)).toThrow(DomainError);
    expect(() => restore(15_000).revoke(NOW)).toThrow(DomainError);
    expect(() => restore(0).revoke(TOMORROW)).toThrow(DomainError);
  });

  it("records a spend without mutating the original", () => {
    const base = restore(1_000);
    const after = base.recordSpend(2_000);
    expect(after.spentMinor).toBe(3_000);
    expect(base.spentMinor).toBe(1_000);
  });
});
