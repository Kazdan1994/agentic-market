import { Inject } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";
import { MANDATE_REPOSITORY, type MandateRepository } from "../../mandates/domain/mandate-repository";
import { AUDIT_LOG, type AuditLog } from "../../shared/audit/audit-log";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { ID_GENERATOR, type IdGenerator } from "../../shared/domain/id-generator";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { AgentRun } from "../domain/agent-run";
import { AGENT_RUN_REPOSITORY, type AgentRunRepository } from "../domain/agent-run-repository";
import type { RunEventPublisher } from "./ports";
import { RunStartedEvent } from "./run-started.event";

export class StartRunCommand {
  constructor(
    readonly userId: string,
    readonly mandateId: string,
    readonly request: string,
    readonly correlationId: string,
  ) {}
}

const INACTIVE = {
  revoked: { code: ErrorCode.MANDATE_REVOKED, message: "This mandate has been revoked." },
  expired: { code: ErrorCode.MANDATE_EXPIRED, message: "This mandate has expired." },
  exhausted: { code: ErrorCode.MANDATE_EXHAUSTED, message: "Budget used up." },
} as const;

/** Validates and stores a new run; execution happens in the background (research R7). */
@CommandHandler(StartRunCommand)
export class StartRunHandler implements ICommandHandler<StartRunCommand, AgentRun> {
  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(AGENT_RUN_REPOSITORY) private readonly runs: AgentRunRepository,
    @Inject(AUDIT_LOG) private readonly auditLog: AuditLog,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(EventBus) private readonly events: RunEventPublisher,
  ) {}

  async execute(command: StartRunCommand): Promise<AgentRun> {
    const now = this.clock.now();
    const mandate = await this.mandates.findById(command.mandateId);
    if (!mandate || mandate.userId !== command.userId) {
      throw new DomainError(ErrorCode.NOT_FOUND, "Mandate not found.");
    }

    const run = AgentRun.start({
      id: this.ids.next(),
      mandateId: mandate.id,
      userId: command.userId,
      request: command.request,
      correlationId: command.correlationId,
      now,
    });

    const status = mandate.status(now);
    if (status !== "active") {
      const refusal = INACTIVE[status];
      await this.auditLog.append({
        type: "mandate.check.refused",
        actorType: "user",
        actorId: command.userId,
        mandateId: mandate.id,
        payload: { code: refusal.code, action: "start_run" },
      });
      throw new DomainError(refusal.code, refusal.message, { status });
    }

    await this.runs.insert(run);
    this.events.publish(new RunStartedEvent(run.id));
    return run;
  }
}
