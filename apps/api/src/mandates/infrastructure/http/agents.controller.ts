import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../identity/infrastructure/http/current-user.decorator";
import { type AuthenticatedUser, UserAuthGuard } from "../../../identity/infrastructure/http/user-auth.guard";
import type { AgentsSummaryView } from "../../application/agents-summary-view";
import { CreateAgentCommand } from "../../application/create-agent.handler";
import { GetAgentQuery } from "../../application/get-agent.handler";
import { GetAgentsSummaryQuery } from "../../application/get-agents-summary.handler";
import { ListAgentsQuery } from "../../application/list-agents.handler";
import type { AgentView } from "../../application/mandate-view";
import { AgentResponse, AgentsSummaryResponse } from "./agent.response";
import { CreateAgentDto } from "./create-agent.dto";

@ApiTags("user")
@ApiCookieAuth()
@Controller("v1/agents")
@UseGuards(UserAuthGuard)
export class AgentsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ operationId: "createAgent" })
  @ApiCreatedResponse({ type: AgentResponse })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateAgentDto): Promise<AgentView> {
    return this.commands.execute<CreateAgentCommand, AgentView>(
      new CreateAgentCommand(
        user.userId,
        body.name,
        body.perPurchaseCapMinor,
        body.totalBudgetMinor,
        body.categorySlugs,
        new Date(body.expiresAt),
      ),
    );
  }

  @Get()
  @ApiOperation({ operationId: "listAgents" })
  @ApiOkResponse({ type: AgentResponse, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<AgentView[]> {
    return this.queries.execute<ListAgentsQuery, AgentView[]>(new ListAgentsQuery(user.userId));
  }

  @Get("summary")
  @ApiOperation({ operationId: "getAgentsSummary" })
  @ApiOkResponse({ type: AgentsSummaryResponse })
  summary(@CurrentUser() user: AuthenticatedUser): Promise<AgentsSummaryView> {
    return this.queries.execute<GetAgentsSummaryQuery, AgentsSummaryView>(new GetAgentsSummaryQuery(user.userId));
  }

  @Get(":agentId")
  @ApiOperation({ operationId: "getAgent" })
  @ApiOkResponse({ type: AgentResponse })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("agentId", new ParseUUIDPipe()) agentId: string,
  ): Promise<AgentView> {
    return this.queries.execute<GetAgentQuery, AgentView>(new GetAgentQuery(user.userId, agentId));
  }
}
