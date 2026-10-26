import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { components } from "@/api/schema";
import type { Run } from "./useRun";

export type LogEntry = components["schemas"]["LogEntryResponse"];

/** Inserts an entry in seq order; an entry already held (a reconnect replay) is ignored. */
function withEntry(entries: LogEntry[], entry: LogEntry): LogEntry[] {
  if (entries.some((e) => e.seq === entry.seq)) return entries;
  return [...entries, entry].sort((a, b) => a.seq - b.seq);
}

/**
 * Follows a run's decision log live (contracts/run-events.md). The browser reconnects on its
 * own with Last-Event-ID; `run.completed` updates the cached run and closes the stream.
 */
export function useRunEvents(runId: string) {
  const queryClient = useQueryClient();
  // Tagged with the run id, so a stale stream's state is never shown for another run.
  const [state, setState] = useState({ runId, entries: [] as LogEntry[], completed: false });

  useEffect(() => {
    const source = new EventSource(`/v1/runs/${runId}/events`, { withCredentials: true });
    source.addEventListener("log", (event: MessageEvent<string>) => {
      const entry = JSON.parse(event.data) as LogEntry;
      setState((current) =>
        current.runId === runId ? { ...current, entries: withEntry(current.entries, entry) } : { runId, entries: [entry], completed: false },
      );
    });
    source.addEventListener("run.completed", (event: MessageEvent<string>) => {
      const run = JSON.parse(event.data) as Run;
      queryClient.setQueryData<Run>(["runs", runId], run);
      void queryClient.invalidateQueries({ queryKey: ["mandates", run.mandateId, "runs"] });
      setState((current) => ({ ...(current.runId === runId ? current : { runId, entries: [] }), completed: true }));
      source.close();
    });
    return () => source.close();
  }, [runId, queryClient]);

  return state.runId === runId ? { entries: state.entries, completed: state.completed } : { entries: [], completed: false };
}
