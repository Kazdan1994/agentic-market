import { Controller, Get, Headers, Inject, Optional, Param, ParseUUIDPipe, Req, Res, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiCookieAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CurrentUser } from "../../../identity/infrastructure/http/current-user.decorator";
import { type AuthenticatedUser, UserAuthGuard } from "../../../identity/infrastructure/http/user-auth.guard";
import { GetRunQuery } from "../../application/get-run.handler";
import { GetRunLogQuery, type LogEntryView, toLogEntryView } from "../../application/get-run-log.handler";
import { RunCompletedEvent, type RunLogEvent } from "../../application/run-log-events";
import { type RunView, toRunView } from "../../application/run-view";
import { RunLogPublisher } from "../run-log.publisher";

export const SSE_PING_INTERVAL_MS = 15_000;
export const SSE_PING_INTERVAL = Symbol("SsePingIntervalMs");

const logEvent = (entry: LogEntryView) => `id: ${entry.seq}\nevent: log\ndata: ${JSON.stringify(entry)}\n\n`;
const completedEvent = (run: RunView) => `event: run.completed\ndata: ${JSON.stringify(run)}\n\n`;

function parseLastEventId(header: string | undefined): number {
  const seq = Number(header);
  return Number.isSafeInteger(seq) && seq > 0 ? seq : 0;
}

/**
 * Live decision log over Server-Sent Events (contracts/run-events.md). It subscribes to live
 * entries before reading the stored ones, so nothing written in between is lost, and skips
 * any live entry the replay already sent.
 */
@ApiTags("user")
@ApiCookieAuth()
@Controller("v1")
@UseGuards(UserAuthGuard)
export class RunEventsController {
  constructor(
    private readonly queries: QueryBus,
    private readonly publisher: RunLogPublisher,
    @Optional() @Inject(SSE_PING_INTERVAL) private readonly pingMs: number = SSE_PING_INTERVAL_MS,
  ) {}

  @Get("runs/:runId/events")
  @ApiOperation({ operationId: "streamRunEvents", description: "Server-Sent Events stream. See contracts/run-events.md." })
  @ApiHeader({ name: "Last-Event-ID", required: false })
  @ApiProduces("text/event-stream")
  @ApiOkResponse({ description: "text/event-stream", schema: { type: "string" } })
  async events(
    @CurrentUser() user: AuthenticatedUser,
    @Param("runId", new ParseUUIDPipe()) runId: string,
    @Headers("last-event-id") lastEventId: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const buffered: RunLogEvent[] = [];
    let deliver: (event: RunLogEvent) => void = (event) => void buffered.push(event);
    const subscription = this.publisher.forRun(runId).subscribe((event) => deliver(event));

    let run: RunView;
    let stored: LogEntryView[];
    try {
      // Throws NOT_FOUND for another user's run while the response is still plain JSON (FR-022).
      run = await this.queries.execute<GetRunQuery, RunView>(new GetRunQuery(user.userId, runId));
      stored = await this.queries.execute<GetRunLogQuery, LogEntryView[]>(new GetRunLogQuery(user.userId, runId));
    } catch (error) {
      subscription.unsubscribe();
      throw error;
    }

    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.flushHeaders();

    let lastSent = parseLastEventId(lastEventId);
    const ping = setInterval(() => res.write(": ping\n\n"), this.pingMs);
    const close = () => {
      clearInterval(ping);
      subscription.unsubscribe();
      res.end();
    };
    // Leaving the stream never affects the run (FR-021b).
    req.on("close", close);

    const send = (entry: LogEntryView) => {
      if (entry.seq <= lastSent) return;
      res.write(logEvent(entry));
      lastSent = entry.seq;
    };
    const onEvent = (event: RunLogEvent) => {
      if (event instanceof RunCompletedEvent) {
        res.write(completedEvent(toRunView(event.run)));
        close();
      } else {
        send(toLogEntryView(event.entry));
      }
    };

    stored.forEach(send);
    if (run.status === "completed") {
      res.write(completedEvent(run));
      close();
      return;
    }
    deliver = onEvent;
    buffered.splice(0).forEach(onEvent);
  }
}
