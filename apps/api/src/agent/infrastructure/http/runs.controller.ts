import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiAcceptedResponse, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../identity/infrastructure/http/current-user.decorator";
import { type AuthenticatedUser, UserAuthGuard } from "../../../identity/infrastructure/http/user-auth.guard";
import { CorrelationContext } from "../../../shared/correlation/correlation-context";
import { GetRunQuery } from "../../application/get-run.handler";
import { ListRunsQuery } from "../../application/list-runs.handler";
import { type RunView, toRunView } from "../../application/run-view";
import { StartRunCommand } from "../../application/start-run.handler";
import type { AgentRun } from "../../domain/agent-run";
import { RunResponse, StartRunDto } from "./runs.dto";

@ApiTags("user")
@ApiCookieAuth()
@Controller("v1")
@UseGuards(UserAuthGuard)
export class RunsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post("mandates/:mandateId/runs")
  @HttpCode(202)
  @ApiOperation({ operationId: "startRun" })
  @ApiAcceptedResponse({ type: RunResponse })
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Param("mandateId", new ParseUUIDPipe()) mandateId: string,
    @Body() body: StartRunDto,
  ): Promise<RunView> {
    const correlationId = CorrelationContext.current() ?? crypto.randomUUID();
    const run = await this.commands.execute<StartRunCommand, AgentRun>(
      new StartRunCommand(user.userId, mandateId, body.request, correlationId),
    );
    return toRunView(run);
  }

  @Get("mandates/:mandateId/runs")
  @ApiOperation({ operationId: "listRuns" })
  @ApiOkResponse({ type: RunResponse, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser, @Param("mandateId", new ParseUUIDPipe()) mandateId: string): Promise<RunView[]> {
    return this.queries.execute<ListRunsQuery, RunView[]>(new ListRunsQuery(user.userId, mandateId));
  }

  @Get("runs/:runId")
  @ApiOperation({ operationId: "getRun" })
  @ApiOkResponse({ type: RunResponse })
  get(@CurrentUser() user: AuthenticatedUser, @Param("runId", new ParseUUIDPipe()) runId: string): Promise<RunView> {
    return this.queries.execute<GetRunQuery, RunView>(new GetRunQuery(user.userId, runId));
  }
}
