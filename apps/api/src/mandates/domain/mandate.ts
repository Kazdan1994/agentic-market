import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import type { MandateStatus } from "./mandate-status";

export const MANDATE_CURRENCY = "EUR";

export interface NewMandateProps {
  id: string;
  agentId: string;
  userId: string;
  perPurchaseCapMinor: number;
  totalBudgetMinor: number;
  categoryIds: readonly string[];
  expiresAt: Date;
}

export interface MandateProps extends NewMandateProps {
  spentMinor: number;
  currency: string;
  revokedAt: Date | null;
  createdAt: Date;
}

function invalid(field: string, message: string): DomainError {
  return new DomainError(ErrorCode.VALIDATION_FAILED, message, { field });
}

/** The limits a user grants an agent (FR-002). Immutable: changes return a new Mandate. */
export class Mandate {
  private constructor(private readonly props: Readonly<MandateProps>) {
    Object.freeze(this);
  }

  static create(props: NewMandateProps, now: Date): Mandate {
    const { perPurchaseCapMinor: cap, totalBudgetMinor: total } = props;
    if (!Number.isSafeInteger(cap) || cap <= 0) {
      throw invalid("perPurchaseCapMinor", "The per-purchase cap must be greater than zero.");
    }
    if (!Number.isSafeInteger(total) || total <= 0) {
      throw invalid("totalBudgetMinor", "The total budget must be greater than zero.");
    }
    if (cap > total) {
      throw invalid("perPurchaseCapMinor", "The per-purchase cap cannot exceed the total budget.");
    }
    if (props.categoryIds.length === 0) {
      throw invalid("categoryIds", "Choose at least one category.");
    }
    if (props.expiresAt.getTime() <= now.getTime()) {
      throw invalid("expiresAt", "The expiry must be in the future.");
    }
    return new Mandate({
      ...props,
      categoryIds: [...new Set(props.categoryIds)],
      spentMinor: 0,
      currency: MANDATE_CURRENCY,
      revokedAt: null,
      createdAt: now,
    });
  }

  /** Rebuilds a stored mandate. Invariants are also enforced by database checks. */
  static restore(props: MandateProps): Mandate {
    return new Mandate({ ...props, categoryIds: [...props.categoryIds] });
  }

  get id(): string {
    return this.props.id;
  }
  get agentId(): string {
    return this.props.agentId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get perPurchaseCapMinor(): number {
    return this.props.perPurchaseCapMinor;
  }
  get totalBudgetMinor(): number {
    return this.props.totalBudgetMinor;
  }
  get spentMinor(): number {
    return this.props.spentMinor;
  }
  get currency(): string {
    return this.props.currency;
  }
  get categoryIds(): readonly string[] {
    return [...this.props.categoryIds];
  }
  get expiresAt(): Date {
    return new Date(this.props.expiresAt);
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt && new Date(this.props.revokedAt);
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get remainingMinor(): number {
    return this.props.totalBudgetMinor - this.props.spentMinor;
  }

  get effectiveLimitMinor(): number {
    return Math.min(this.props.perPurchaseCapMinor, this.remainingMinor);
  }

  status(now: Date): MandateStatus {
    if (this.props.revokedAt) return "revoked";
    if (now.getTime() >= this.props.expiresAt.getTime()) return "expired";
    if (this.remainingMinor <= 0) return "exhausted";
    return "active";
  }

  allowsCategory(categoryId: string): boolean {
    return this.props.categoryIds.includes(categoryId);
  }

  /** Revoking is allowed only from Active and is final (FR-003, FR-004). */
  revoke(now: Date): Mandate {
    const status = this.status(now);
    if (status !== "active") {
      throw new DomainError(ErrorCode.MANDATE_NOT_ACTIVE, "This mandate is no longer active.", { status });
    }
    return new Mandate({ ...this.props, revokedAt: now });
  }

  recordSpend(amountMinor: number): Mandate {
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > this.remainingMinor) {
      throw new RangeError(`Spend of ${amountMinor} does not fit the remaining budget ${this.remainingMinor}`);
    }
    return new Mandate({ ...this.props, spentMinor: this.props.spentMinor + amountMinor });
  }
}
