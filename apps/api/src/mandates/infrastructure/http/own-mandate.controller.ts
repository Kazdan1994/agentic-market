import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetMandateQuery } from "../../application/get-mandate.handler";
import type { MandateView } from "../../application/mandate-view";
import { ActivityInterceptor } from "./activity.interceptor";
import { MandateResponse } from "./agent.response";
import { CurrentMandate } from "./current-mandate.decorator";
import { MandateAction } from "./mandate-action.decorator";
import { type MandateAuth, MandateKeyGuard } from "./mandate-key.guard";

@ApiTags("agent")
@ApiBearerAuth("mandateKey")
@Controller("v1/mandate")
@UseGuards(MandateKeyGuard)
@UseInterceptors(ActivityInterceptor)
export class OwnMandateController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @MandateAction("view_mandate")
  @ApiOperation({ operationId: "getOwnMandate" })
  @ApiOkResponse({ type: MandateResponse })
  get(@CurrentMandate() auth: MandateAuth): Promise<MandateView> {
    return this.queries.execute<GetMandateQuery, MandateView>(new GetMandateQuery(auth.mandateId));
  }
}
