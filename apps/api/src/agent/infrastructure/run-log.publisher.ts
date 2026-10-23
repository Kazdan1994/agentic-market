import { Inject, Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";
import { filter, type Observable } from "rxjs";
import { RunCompletedEvent, RunLogAppendedEvent, type RunLogEvent } from "../application/run-log-events";

/**
 * Per-run view of the in-process event bus. The executor publishes on the bus only after a
 * row is stored, so subscribers never see an entry that a replay would not find (run-events.md).
 */
@Injectable()
export class RunLogPublisher {
  constructor(@Inject(EventBus) private readonly bus: Observable<object>) {}

  forRun(runId: string): Observable<RunLogEvent> {
    return this.bus.pipe(
      filter(
        (event): event is RunLogEvent =>
          (event instanceof RunLogAppendedEvent && event.entry.runId === runId) ||
          (event instanceof RunCompletedEvent && event.run.id === runId),
      ),
    );
  }
}
