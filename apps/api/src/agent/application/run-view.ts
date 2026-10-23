import type { AgentRun, FallbackReason, RunOutcome, RunStatus, SelectionStrategy } from "../domain/agent-run";

export interface RunView {
  id: string;
  mandateId: string;
  request: string;
  status: RunStatus;
  outcome: RunOutcome | null;
  strategy: SelectionStrategy | null;
  fallbackReason: FallbackReason | null;
  orderId: string | null;
  startedAt: string;
  endedAt: string | null;
}

/** Shapes a run like the `Run` schema in contracts/openapi.yaml. */
export function toRunView(run: AgentRun): RunView {
  return {
    id: run.id,
    mandateId: run.mandateId,
    request: run.request,
    status: run.status,
    outcome: run.outcome,
    strategy: run.strategy,
    fallbackReason: run.fallbackReason,
    orderId: run.orderId,
    startedAt: run.startedAt.toISOString(),
    endedAt: run.endedAt?.toISOString() ?? null,
  };
}
