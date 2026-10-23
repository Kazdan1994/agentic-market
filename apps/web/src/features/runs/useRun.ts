import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { components } from "@/api/schema";
import { toApiError } from "@/features/agents/useAgents";

export type Run = components["schemas"]["RunResponse"];

const POLL_INTERVAL_MS = 1000;

export function useRun(runId: string) {
  return useQuery({
    queryKey: ["runs", runId],
    queryFn: async (): Promise<Run> => {
      const { data, error } = await api.GET("/v1/runs/{runId}", { params: { path: { runId } } });
      if (!data) throw toApiError(error);
      return data;
    },
    refetchInterval: (query) => (query.state.data?.status === "completed" ? false : POLL_INTERVAL_MS),
  });
}

export function useStartRun(mandateId: string) {
  return useMutation({
    mutationFn: async (request: string): Promise<Run> => {
      const { data, error } = await api.POST("/v1/mandates/{mandateId}/runs", {
        params: { path: { mandateId } },
        body: { request },
      });
      if (!data) throw toApiError(error);
      return data;
    },
  });
}
