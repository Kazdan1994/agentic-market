import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export const ME_QUERY_KEY = ["me"] as const;

export interface Me {
  id: string;
  email: string;
  displayName: string;
}

/** The signed-in user, or null when the session is missing or expired. */
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async (): Promise<Me | null> => {
      const { data, response } = await api.GET("/v1/me");
      if (response.status === 401) return null;
      if (!data) throw new Error(`GET /v1/me failed with ${response.status}`);
      return data;
    },
  });
}
