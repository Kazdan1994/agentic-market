import { useQueryClient } from "@tanstack/react-query";
import { Navigate, NavLink, Outlet, type RouteObject } from "react-router";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { AgentsPage } from "@/features/agents/AgentsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ME_QUERY_KEY, useMe } from "@/features/auth/useMe";
import { OrderDetailPage } from "@/features/orders/OrderDetailPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { RunPage } from "@/features/runs/RunPage";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-medium text-neutral-900" : "text-neutral-500 hover:text-neutral-900";

function NavBar() {
  const queryClient = useQueryClient();
  const logOut = async () => {
    await api.POST("/v1/auth/logout");
    queryClient.setQueryData(ME_QUERY_KEY, null);
  };
  return (
    <header className="border-b border-neutral-200">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-4xl items-center gap-6 px-4 py-3 text-sm">
        <NavLink to="/agents" className={navLinkClass}>
          Agents
        </NavLink>
        <NavLink to="/orders" className={navLinkClass}>
          Orders
        </NavLink>
        <Button variant="ghost" className="ml-auto" onClick={logOut}>
          Log out
        </Button>
      </nav>
    </header>
  );
}

function ProtectedLayout() {
  const me = useMe();
  if (me.isPending) return null;
  if (me.isError) return <p role="alert">Something went wrong. Please reload.</p>;
  if (!me.data) return <Navigate to="/login" replace />;
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
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
