import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CATEGORY_REPOSITORY, type CategoryRepository } from "../../catalog/domain/category";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { MANDATE_REPOSITORY, type MandateRepository } from "../domain/mandate-repository";
import { type MandateView, toMandateView } from "./mandate-view";

/** Scoped by mandate: callers pass the mandate their key or session already owns. */
export class GetMandateQuery {
  constructor(readonly mandateId: string) {}
}

@QueryHandler(GetMandateQuery)
export class GetMandateHandler implements IQueryHandler<GetMandateQuery, MandateView> {
  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ mandateId }: GetMandateQuery): Promise<MandateView> {
    const mandate = await this.mandates.findById(mandateId);
    if (!mandate) throw new DomainError(ErrorCode.NOT_FOUND, "Mandate not found.");
    return toMandateView(mandate, await this.categories.listAll(), this.clock.now());
  }
}
