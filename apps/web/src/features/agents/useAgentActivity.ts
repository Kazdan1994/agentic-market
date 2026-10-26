import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { type Order, useOrders } from "@/features/orders/useOrders";
import type { Run } from "@/features/runs/useRun";
import { type Agent, toApiError } from "./useAgents";

export interface AgentActivity {
  /** Each mandate's orders, oldest first: the lines printed on its slip. */
  ordersByMandate: ReadonlyMap<string, Order[]>;
  /** The run in progress for a mandate; absent when its agent is idle. */
  runningByMandate: ReadonlyMap<string, Run>;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * What the agents are doing: their orders, grouped by mandate, and any run in progress.
 * Runs are listed per active mandate (research R15); ended mandates cannot run.
 */
export function useAgentActivity(agents: readonly Agent[]): AgentActivity {
  const orders = useOrders();
  const activeIds = agents.filter((agent) => agent.mandate.status === "active").map((agent) => agent.mandate.id);
  const runs = useQueries({
    queries: activeIds.map((mandateId) => ({
      queryKey: ["mandates", mandateId, "runs"],
      queryFn: async (): Promise<Run[]> => {
        const { data, error } = await api.GET("/v1/mandates/{mandateId}/runs", { params: { path: { mandateId } } });
        if (!data) throw toApiError(error);
        return data;
      },
    })),
  });

  const ordersByMandate = new Map<string, Order[]>();
  const byPlacedAt = [...(orders.data ?? [])].sort((a, b) => a.placedAt.localeCompare(b.placedAt));
  for (const order of byPlacedAt) {
    ordersByMandate.set(order.mandateId, [...(ordersByMandate.get(order.mandateId) ?? []), order]);
  }

  const runningByMandate = new Map<string, Run>();
  runs.forEach((query, index) => {
    const mandateId = activeIds[index];
    const running = query.data?.find((run) => run.status === "running");
    if (mandateId && running) runningByMandate.set(mandateId, running);
  });

  return {
    ordersByMandate,
    runningByMandate,
    isPending: orders.isPending || runs.some((query) => query.isPending),
    isError: orders.isError || runs.some((query) => query.isError),
    refetch: () => {
      void orders.refetch();
      for (const query of runs) void query.refetch();
    },
  };
}
