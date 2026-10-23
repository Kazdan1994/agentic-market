import { hasContentTokens } from "../../shared/domain/text-tokens";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";

const MIN_REQUEST = 3;
const MAX_REQUEST = 500;

export type RunStatus = "running" | "completed";
export type RunOutcome = "order_placed" | "no_eligible_product" | "refused_by_mandate" | "payment_declined" | "interrupted";
export type SelectionStrategy = "ai" | "rules";
export type FallbackReason =
  | "not_configured"
  | "forced_rules"
  | "unavailable"
  | "timeout"
  | "api_error"
  | "unusable_answer"
  | "ineligible_choice";

export interface AgentRunProps {
  id: string;
  mandateId: string;
  userId: string;
  request: string;
  status: RunStatus;
  outcome: RunOutcome | null;
  strategy: SelectionStrategy | null;
  fallbackReason: FallbackReason | null;
  orderId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  correlationId: string;
}

export interface Completion {
  outcome: RunOutcome;
  strategy: SelectionStrategy | null;
  fallbackReason: FallbackReason | null;
  orderId: string | null;
  now: Date;
}

/** One execution of the built-in agent for one request (FR-006, FR-007). */
export class AgentRun {
  private constructor(private readonly props: Readonly<AgentRunProps>) {
    Object.freeze(this);
  }

  static start(input: {
    id: string;
    mandateId: string;
    userId: string;
    request: string;
    correlationId: string;
    now: Date;
  }): AgentRun {
    const request = input.request.trim();
    if (request.length < MIN_REQUEST || request.length > MAX_REQUEST || !hasContentTokens(request)) {
      throw new DomainError(
        ErrorCode.INVALID_REQUEST,
        `Describe what to buy in ${MIN_REQUEST} to ${MAX_REQUEST} characters, with at least one product word.`,
      );
    }
    return new AgentRun({
      id: input.id,
      mandateId: input.mandateId,
      userId: input.userId,
      request,
      status: "running",
      outcome: null,
      strategy: null,
      fallbackReason: null,
      orderId: null,
      startedAt: input.now,
      endedAt: null,
      correlationId: input.correlationId,
    });
  }

  static restore(props: AgentRunProps): AgentRun {
    return new AgentRun({ ...props });
  }

  /** Sets outcome, strategy, fallback reason and end time together, once. */
  complete(completion: Completion): AgentRun {
    if (this.props.status === "completed") throw new Error(`Run ${this.props.id} is already completed`);
    if ((completion.outcome === "order_placed") !== (completion.orderId !== null)) {
      throw new Error("An order id is required exactly when the outcome is order_placed");
    }
    return new AgentRun({
      ...this.props,
      status: "completed",
      outcome: completion.outcome,
      strategy: completion.strategy,
      fallbackReason: completion.fallbackReason,
      orderId: completion.orderId,
      endedAt: completion.now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get mandateId(): string {
    return this.props.mandateId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get request(): string {
    return this.props.request;
  }
  get status(): RunStatus {
    return this.props.status;
  }
  get outcome(): RunOutcome | null {
    return this.props.outcome;
  }
  get strategy(): SelectionStrategy | null {
    return this.props.strategy;
  }
  get fallbackReason(): FallbackReason | null {
    return this.props.fallbackReason;
  }
  get orderId(): string | null {
    return this.props.orderId;
  }
  get startedAt(): Date {
    return new Date(this.props.startedAt);
  }
  get endedAt(): Date | null {
    return this.props.endedAt && new Date(this.props.endedAt);
  }
  get correlationId(): string {
    return this.props.correlationId;
  }
}
