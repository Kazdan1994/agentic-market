import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toApiError } from "@/features/agents/useAgents";
import type { LogEntry } from "./useRunEvents";

/** The decision log of a run, fetched once; `useRunEvents` is the live view of a run in progress. */
export function useRunLog(runId: string | null) {
  return useQuery({
    queryKey: ["runs", runId, "log"],
    enabled: runId !== null,
    queryFn: async (): Promise<LogEntry[]> => {
      if (!runId) throw new Error("runId is required");
      const { data, error } = await api.GET("/v1/runs/{runId}/log", { params: { path: { runId } } });
      if (!data) throw toApiError(error);
      return data;
    },
  });
}
