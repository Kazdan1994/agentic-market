import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { components } from "@/api/schema";

export type Agent = components["schemas"]["AgentResponse"];
export type Category = components["schemas"]["CategoryResponse"];
export type CreateAgentBody = components["schemas"]["CreateAgentDto"];

export const AGENTS_QUERY_KEY = ["agents"] as const;

/** Error envelope returned by the API; `details` holds field errors for VALIDATION_FAILED. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type ErrorBody = { error?: { code?: string; message?: string; details?: Record<string, unknown> } };

export function toApiError(body: unknown): ApiError {
  const error = (body as ErrorBody | undefined)?.error;
  return new ApiError(error?.code ?? "INTERNAL_ERROR", error?.message ?? "Something went wrong.", error?.details);
}

export function useAgents() {
  return useQuery({
    queryKey: AGENTS_QUERY_KEY,
    queryFn: async (): Promise<Agent[]> => {
      const { data, error } = await api.GET("/v1/agents");
      if (!data) throw toApiError(error);
      return data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await api.GET("/v1/categories");
      if (!data) throw toApiError(error);
      return data;
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAgentBody): Promise<Agent> => {
      const { data, error } = await api.POST("/v1/agents", { body });
      if (!data) throw toApiError(error);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENTS_QUERY_KEY }),
  });
}
