import { describe, expect, it } from "vitest";
import { makeOrder } from "@/test-utils";
import { groupOrdersByMonth, sumMinor } from "./groupOrdersByMonth";

const placedOn = (id: string, placedAt: string, amountMinor: number) => ({
  ...makeOrder({ id }),
  placedAt,
  total: { amountMinor, currency: "EUR" },
});

describe("groupOrdersByMonth", () => {
  it("groups by month, newest month and order first, with a subtotal per month", () => {
    const orders = [
      placedOn("a", "2026-09-12T10:00:00Z", 2200),
      placedOn("b", "2026-10-21T10:00:00Z", 3900),
      placedOn("c", "2026-10-26T10:00:00Z", 7900),
    ] as Parameters<typeof groupOrdersByMonth>[0];

    const groups = groupOrdersByMonth(orders);

    expect(groups.map((g) => g.label)).toEqual(["OCTOBER 2026", "SEPTEMBER 2026"]);
    expect(groups[0]?.orders.map((o) => o.id)).toEqual(["c", "b"]);
    expect(groups.map((g) => g.totalMinor)).toEqual([11800, 2200]);
  });

  it("returns no group for no orders and does not reorder its input", () => {
    expect(groupOrdersByMonth([])).toEqual([]);
    expect(sumMinor([])).toBe(0);
  });
});
