import { Body, Controller, Headers, HttpCode, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { isUUID } from "class-validator";
import { ActivityInterceptor } from "../../../mandates/infrastructure/http/activity.interceptor";
import { CurrentMandate } from "../../../mandates/infrastructure/http/current-mandate.decorator";
import { MandateAction } from "../../../mandates/infrastructure/http/mandate-action.decorator";
import { type MandateAuth, MandateKeyGuard } from "../../../mandates/infrastructure/http/mandate-key.guard";
import { DomainError } from "../../../shared/errors/domain-error";
import { ErrorCode } from "../../../shared/errors/error-codes";
import { CheckoutCommand } from "../../application/checkout.handler";
import { GetOrderQuery } from "../../application/get-order.handler";
import type { OrderView } from "../../application/order-view";
import type { OrderRecord } from "../../domain/order";
import { CheckoutDto } from "./checkout.dto";
import { OrderResponse } from "./order.response";

function invalidHeader(header: string, message: string): DomainError {
  return new DomainError(ErrorCode.VALIDATION_FAILED, "Some fields are invalid.", { [header]: [message] });
}

@ApiTags("agent")
@ApiBearerAuth("mandateKey")
@Controller("v1/checkout")
@UseGuards(MandateKeyGuard)
@UseInterceptors(ActivityInterceptor)
export class CheckoutController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post()
  @HttpCode(201)
  @MandateAction("checkout")
  @ApiOperation({ operationId: "checkout" })
  @ApiHeader({ name: "Idempotency-Key", required: true, schema: { type: "string", minLength: 8, maxLength: 100 } })
  @ApiHeader({
    name: "X-Agent-Run-Id",
    required: false,
    schema: { type: "string", format: "uuid" },
    description: "Set by the built-in agent only; ignored for external keys.",
  })
  @ApiCreatedResponse({ type: OrderResponse })
  async checkout(
    @CurrentMandate() auth: MandateAuth,
    @Body() body: CheckoutDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-agent-run-id") runHeader: string | undefined,
  ): Promise<OrderView> {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 100) {
      throw invalidHeader("Idempotency-Key", "Idempotency-Key must be 8 to 100 characters");
    }
    // Only the built-in agent links orders to its runs; third-party keys cannot.
    const runId = auth.keyKind === "builtin" ? (runHeader ?? null) : null;
    if (runId !== null && !isUUID(runId)) throw invalidHeader("X-Agent-Run-Id", "X-Agent-Run-Id must be a UUID");

    const order = await this.commands.execute<CheckoutCommand, OrderRecord>(
      new CheckoutCommand(
        auth.mandateId,
        auth.keyId,
        auth.keyKind,
        body.productId,
        body.expectedPriceMinor,
        idempotencyKey,
        runId,
      ),
    );
    return this.queries.execute<GetOrderQuery, OrderView>(new GetOrderQuery(order.id, { mandateId: auth.mandateId }));
  }
}
