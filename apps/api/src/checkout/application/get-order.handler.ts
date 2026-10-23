import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { ORDER_READ_MODEL, type OrderReadModel, type OrderView } from "./order-view";

/** Exactly one of `userId` (session) or `mandateId` (key) scopes the lookup. */
export class GetOrderQuery {
  constructor(
    readonly orderId: string,
    readonly scope: { userId: string } | { mandateId: string },
  ) {}
}

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery, OrderView> {
  constructor(@Inject(ORDER_READ_MODEL) private readonly orders: OrderReadModel) {}

  async execute({ orderId, scope }: GetOrderQuery): Promise<OrderView> {
    const row = await this.orders.findById(orderId);
    const visible =
      row && ("userId" in scope ? row.userId === scope.userId : row.view.mandateId === scope.mandateId);
    // Other people's orders are reported as missing (FR-022).
    if (!row || !visible) throw new DomainError(ErrorCode.NOT_FOUND, "Order not found.");
    return row.view;
  }
}
