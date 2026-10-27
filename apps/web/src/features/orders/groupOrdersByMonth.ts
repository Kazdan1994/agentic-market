import type { Order } from "./useOrders";

export interface MonthGroup {
  label: string;
  orders: Order[];
  totalMinor: number;
}

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export const sumMinor = (orders: readonly Order[]): number =>
  orders.reduce((sum, order) => sum + order.total.amountMinor, 0);

/** Groups orders by the month they were placed in, most recent month and order first. */
export function groupOrdersByMonth(orders: readonly Order[]): MonthGroup[] {
  const newestFirst = orders.toSorted((a, b) => b.placedAt.localeCompare(a.placedAt));
  const byMonth = Map.groupBy(newestFirst, (order) => monthLabel.format(new Date(order.placedAt)).toUpperCase());
  return [...byMonth].map(([label, rows]) => ({ label, orders: rows, totalMinor: sumMinor(rows) }));
}
