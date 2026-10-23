import { describe, expect, it } from "vitest";
import { Money } from "../../shared/domain/money";
import { SimulatedPaymentGateway } from "./simulated-payment-gateway";

describe("SimulatedPaymentGateway", () => {
  const gateway = new SimulatedPaymentGateway({ SIMULATED_DECLINE_CENTS: 13 });

  it("declines amounts whose cents equal SIMULATED_DECLINE_CENTS", async () => {
    expect((await gateway.charge(Money.of(3913, "EUR"))).outcome).toBe("declined");
    expect((await gateway.charge(Money.of(13, "EUR"))).outcome).toBe("declined");
  });

  it("approves every other amount", async () => {
    expect((await gateway.charge(Money.of(3912, "EUR"))).outcome).toBe("approved");
    expect((await gateway.charge(Money.of(1300, "EUR"))).outcome).toBe("approved");
  });

  it("returns a unique sim_ reference", async () => {
    const refs = await Promise.all([1, 2, 3].map(() => gateway.charge(Money.of(100, "EUR"))));
    refs.forEach((r) => expect(r.reference).toMatch(/^sim_[A-Za-z0-9_-]{16,}$/));
    expect(new Set(refs.map((r) => r.reference)).size).toBe(3);
  });
});
