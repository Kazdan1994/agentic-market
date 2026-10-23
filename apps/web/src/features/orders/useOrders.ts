import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { components } from "@/api/schema";
import { toApiError } from "@/features/agents/useAgents";

export type Order = components["schemas"]["OrderResponse"];

export const ORDER_STATUS_LABEL = "Paid (simulated)";

export const PLACED_BY_LABELS: Record<Order["placedBy"], string> = {
  builtin_agent: "Built-in agent",
  third_party_agent: "External agent",
};

export const placedAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await api.GET("/v1/orders");
      if (!data) throw toApiError(error);
      return data;
    },
  });
}

export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ["orders", orderId],
    enabled: orderId !== null,
    queryFn: async (): Promise<Order> => {
      if (!orderId) throw new Error("orderId is required");
      const { data, error } = await api.GET("/v1/orders/{orderId}", { params: { path: { orderId } } });
      if (!data) throw toApiError(error);
      return data;
    },
  });
}
