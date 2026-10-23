import { Navigate, Outlet, type RouteObject } from "react-router";
import { AgentsPage } from "@/features/agents/AgentsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { useMe } from "@/features/auth/useMe";
import { OrderDetailPage } from "@/features/orders/OrderDetailPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { RunPage } from "@/features/runs/RunPage";

function ProtectedLayout() {
  const me = useMe();
  if (me.isPending) return null;
  if (me.isError) return <p role="alert">Something went wrong. Please reload.</p>;
  if (!me.data) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/agents" replace /> },
      { path: "/agents", element: <AgentsPage /> },
      { path: "/runs/:runId", element: <RunPage /> },
      { path: "/orders", element: <OrdersPage /> },
      { path: "/orders/:orderId", element: <OrderDetailPage /> },
    ],
  },
];
