export type ActivityAction = "search" | "view_product" | "view_mandate" | "checkout";
export type ActivityResult = "ok" | "refused" | "declined" | "error";

export interface ActivityEntry {
  mandateId: string;
  keyId: string;
  action: ActivityAction;
  result: ActivityResult;
  detail: Readonly<Record<string, unknown>>;
}

/** Append-only record of every key-authenticated request (FR-010e). */
export interface MandateActivityLog {
  append(entry: ActivityEntry): Promise<void>;
}

export const MANDATE_ACTIVITY_LOG = Symbol("MandateActivityLog");
