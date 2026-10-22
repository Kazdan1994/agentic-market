import type { TransactionScope } from "../domain/transaction-scope";

export type AuditEventType =
  | "mandate.created"
  | "mandate.revoked"
  | "key.created"
  | "key.revoked"
  | "mandate.check.allowed"
  | "mandate.check.refused"
  | "checkout.attempted"
  | "payment.approved"
  | "payment.declined"
  | "order.placed"
  | "run.interrupted";

export interface AuditEventInput {
  type: AuditEventType;
  actorType: "user" | "mandate_key" | "system";
  actorId: string;
  mandateId: string | null;
  /** Amounts, codes and ids only. Never secrets or passwords. */
  payload: Readonly<Record<string, unknown>>;
}

/** Append-only audit trail (FR-023). Pass the transaction so the event commits with the change. */
export interface AuditLog {
  append(event: AuditEventInput, scope?: TransactionScope): Promise<void>;
}

export const AUDIT_LOG = Symbol("AuditLog");
