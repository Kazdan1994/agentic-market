import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { ORDER_READ_MODEL, type OrderReadModel, type OrderView } from "./order-view";

export class ListOrdersQuery {
  constructor(readonly userId: string) {}
}

@QueryHandler(ListOrdersQuery)
export class ListOrdersHandler implements IQueryHandler<ListOrdersQuery, OrderView[]> {
  constructor(@Inject(ORDER_READ_MODEL) private readonly orders: OrderReadModel) {}

  execute({ userId }: ListOrdersQuery): Promise<OrderView[]> {
    return this.orders.listByUser(userId);
  }
}
