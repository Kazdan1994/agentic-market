import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { CATEGORY_REPOSITORY, type CategoryRepository } from "../../catalog/domain/category";
import { AUDIT_LOG, type AuditLog } from "../../shared/audit/audit-log";
import { APP_CONFIG, type AppConfig } from "../../shared/config/app-config";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { ID_GENERATOR, type IdGenerator } from "../../shared/domain/id-generator";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { Agent } from "../domain/agent";
import { Mandate } from "../domain/mandate";
import { MandateKey, MandateKeySecrets } from "../domain/mandate-key";
import { MANDATE_REPOSITORY, type MandateRepository } from "../domain/mandate-repository";
import { type AgentView, toAgentView } from "./mandate-view";

export class CreateAgentCommand {
  constructor(
    readonly userId: string,
    readonly name: string,
    readonly perPurchaseCapMinor: number,
    readonly totalBudgetMinor: number,
    readonly categorySlugs: readonly string[],
    readonly expiresAt: Date,
  ) {}
}

/** Creates an agent with its Active mandate and built-in key (FR-001, research R8). */
@CommandHandler(CreateAgentCommand)
export class CreateAgentHandler implements ICommandHandler<CreateAgentCommand, AgentView> {
  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(AUDIT_LOG) private readonly auditLog: AuditLog,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(APP_CONFIG) private readonly config: Pick<AppConfig, "BUILTIN_KEY_SECRET">,
  ) {}

  async execute(command: CreateAgentCommand): Promise<AgentView> {
    const now = this.clock.now();
    const allCategories = await this.categories.listAll();
    const bySlug = new Map(allCategories.map((c) => [c.slug, c]));
    const unknown = command.categorySlugs.filter((slug) => !bySlug.has(slug));
    if (unknown.length > 0) {
      throw new DomainError(ErrorCode.VALIDATION_FAILED, "Some categories do not exist.", {
        categorySlugs: unknown,
      });
    }

    const agent = Agent.create({ id: this.ids.next(), userId: command.userId, name: command.name, createdAt: now });
    const mandate = Mandate.create(
      {
        id: this.ids.next(),
        agentId: agent.id,
        userId: command.userId,
        perPurchaseCapMinor: command.perPurchaseCapMinor,
        totalBudgetMinor: command.totalBudgetMinor,
        categoryIds: command.categorySlugs.flatMap((slug) => bySlug.get(slug)?.id ?? []),
        expiresAt: command.expiresAt,
      },
      now,
    );
    const material = MandateKeySecrets.deriveBuiltin(this.config.BUILTIN_KEY_SECRET, mandate.id);
    const builtinKey = MandateKey.restore({
      id: this.ids.next(),
      mandateId: mandate.id,
      kind: "builtin",
      keyHash: material.keyHash,
      hint: material.hint,
      label: null,
      createdAt: now,
      revokedAt: null,
    });

    await this.mandates.create(agent, mandate, builtinKey);
    await this.auditLog.append({
      type: "mandate.created",
      actorType: "user",
      actorId: command.userId,
      mandateId: mandate.id,
      payload: {
        agentId: agent.id,
        perPurchaseCapMinor: mandate.perPurchaseCapMinor,
        totalBudgetMinor: mandate.totalBudgetMinor,
        categorySlugs: [...command.categorySlugs],
        expiresAt: mandate.expiresAt.toISOString(),
      },
    });
    return toAgentView(agent, mandate, allCategories, now);
  }
}
