/** Published once a run is stored as `running`; the executor picks it up (research R7). */
export class RunStartedEvent {
  constructor(readonly runId: string) {}
}
