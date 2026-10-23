import { Inject, Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { AUDIT_LOG, type AuditLog } from "../../shared/audit/audit-log";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import type { AgentRun } from "../domain/agent-run";
import { AGENT_RUN_REPOSITORY, type AgentRunRepository } from "../domain/agent-run-repository";
import { RunLog } from "../domain/run-log-entry";

/**
 * Runs execute in-process, so a restart cuts them off. On boot, every run still `running`
 * is closed as `interrupted`; checkout is transactional, so nothing is left half-paid (R7).
 */
@Injectable()
export class InterruptedRunsRecovery implements OnApplicationBootstrap {
  constructor(
    @Inject(AGENT_RUN_REPOSITORY) private readonly runs: AgentRunRepository,
    @Inject(AUDIT_LOG) private readonly auditLog: AuditLog,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private readonly logger = new Logger(InterruptedRunsRecovery.name);

  async onApplicationBootstrap(): Promise<void> {
    for (const run of await this.runs.findRunning()) {
      // One damaged run must not keep the others, or the server, from starting.
      await this.close(run).catch((error: unknown) =>
        this.logger.error({ runId: run.id, err: { message: String(error) } }, "could not close an interrupted run"),
      );
    }
  }

  private async close(run: AgentRun): Promise<void> {
    const now = this.clock.now();
    const { entry } = RunLog.resume(run.id, await this.runs.lastSeq(run.id)).append(
      {
        step: "outcome",
        message: "The run was interrupted by a server restart. No checkout was left half-done.",
        productId: null,
        data: { outcome: "interrupted" },
      },
      now,
    );
    await this.runs.appendLog(entry);
    await this.runs.complete(run.complete({ outcome: "interrupted", strategy: null, fallbackReason: null, orderId: null, now }));
    await this.auditLog.append({
      type: "run.interrupted",
      actorType: "system",
      actorId: run.id,
      mandateId: run.mandateId,
      payload: { runId: run.id },
    });
  }
}
