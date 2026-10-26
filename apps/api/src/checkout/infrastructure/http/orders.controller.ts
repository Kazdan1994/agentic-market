import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../identity/infrastructure/http/current-user.decorator";
import { type AuthenticatedUser, UserAuthGuard } from "../../../identity/infrastructure/http/user-auth.guard";
import { GetOrderQuery } from "../../application/get-order.handler";
import { ListOrdersQuery } from "../../application/list-orders.handler";
import type { OrderView } from "../../application/order-view";
import { OrderResponse } from "./order.response";

@ApiTags("user")
@ApiCookieAuth()
@Controller("v1/orders")
@UseGuards(UserAuthGuard)
export class OrdersController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @ApiOperation({ operationId: "listOrders" })
  @ApiOkResponse({ type: OrderResponse, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<OrderView[]> {
    return this.queries.execute<ListOrdersQuery, OrderView[]>(new ListOrdersQuery(user.userId));
  }

  @Get(":orderId")
  @ApiOperation({ operationId: "getOrder" })
  @ApiOkResponse({ type: OrderResponse })
  get(@CurrentUser() user: AuthenticatedUser, @Param("orderId", new ParseUUIDPipe()) orderId: string): Promise<OrderView> {
    return this.queries.execute<GetOrderQuery, OrderView>(new GetOrderQuery(orderId, { userId: user.userId }));
  }
}
