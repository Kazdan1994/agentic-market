const EUROS = /^(\d+)(?:\.(\d{1,2}))?$/;

/** Converts a euro amount typed by the user ("89.99") to integer cents, or null when invalid. */
export function parseEuros(input: string): number | null {
  const match = EUROS.exec(input.trim());
  if (!match) return null;
  const [, units, decimals = ""] = match;
  return Number(units) * 100 + Number(decimals.padEnd(2, "0"));
}

/** Formats integer minor units the way the API does: "89.99 EUR". */
export function formatMoney(amountMinor: number, currency: string): string {
  const units = Math.trunc(amountMinor / 100);
  const cents = String(Math.abs(amountMinor % 100)).padStart(2, "0");
  return `${units}.${cents} ${currency}`;
}
