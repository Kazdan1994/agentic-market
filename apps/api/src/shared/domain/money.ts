const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/** Exact money: an integer number of minor units (cents) plus an ISO 4217 currency. */
export class Money {
  private constructor(
    readonly amountMinor: number,
    readonly currency: string,
  ) {
    Object.freeze(this);
  }

  static of(amountMinor: number, currency: string): Money {
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      throw new RangeError(`Money amount must be a non-negative integer of minor units, got ${amountMinor}`);
    }
    if (!CURRENCY_PATTERN.test(currency)) {
      throw new RangeError(`Money currency must be a 3-letter ISO 4217 code, got "${currency}"`);
    }
    return new Money(amountMinor, currency);
  }

  static min(a: Money, b: Money): Money {
    a.assertSameCurrency(b);
    return a.amountMinor <= b.amountMinor ? a : b;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.amountMinor - other.amountMinor;
    if (result < 0) {
      throw new RangeError("Money subtraction would be negative");
    }
    return Money.of(result, this.currency);
  }

  lessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor <= other.amountMinor;
  }

  format(): string {
    const major = Math.trunc(this.amountMinor / 100);
    const minor = String(this.amountMinor % 100).padStart(2, "0");
    return `${major}.${minor} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new RangeError(`Cannot combine currencies ${this.currency} and ${other.currency}`);
    }
  }
}
