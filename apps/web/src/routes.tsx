import { useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, NavLink, Outlet, type RouteObject } from "react-router";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { AgentsPage } from "@/features/agents/AgentsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ME_QUERY_KEY, useMe } from "@/features/auth/useMe";
import { OrderDetailPage } from "@/features/orders/OrderDetailPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { RunPage } from "@/features/runs/RunPage";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-medium text-fg" : "text-muted hover:text-fg";

function ReceiptMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <path d="M4 2h18v22l-3-2-3 2-3-2-3 2-3-2-3 2z" className="fill-fg" />
      <path d="M8 9h10M8 13h10M8 17h6" className="stroke-paper" strokeWidth="1.8" />
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function NavBar({ displayName }: { displayName: string }) {
  const queryClient = useQueryClient();
  const logOut = async () => {
    await api.POST("/v1/auth/logout");
    queryClient.setQueryData(ME_QUERY_KEY, null);
  };

  return (
    <header>
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-4 text-sm sm:h-[68px] sm:gap-7 sm:px-6"
      >
        <Link to="/agents" className="mr-1 flex items-center gap-2.5 whitespace-nowrap text-base font-semibold sm:mr-3">
          <ReceiptMark />
          Agentic Market
        </Link>
        <NavLink to="/agents" className={navLinkClass}>
          Agents
        </NavLink>
        <NavLink to="/orders" className={navLinkClass}>
          Orders
        </NavLink>
        <span className="ml-auto flex items-center gap-2.5 text-muted">
          <span className="hidden sm:inline">{displayName}</span>
          <span
            aria-hidden="true"
            className="grid size-[30px] place-items-center rounded-full bg-accent-pale text-xs font-semibold text-accent-ink"
          >
            {initials(displayName)}
          </span>
        </span>
        <Button variant="ghost" className="px-3" onClick={logOut}>
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
      <NavBar displayName={me.data.displayName} />
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
