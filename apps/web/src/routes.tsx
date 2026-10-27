import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, NavLink, Outlet, type RouteObject, useLocation } from "react-router";
import { api } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ReceiptMark } from "@/components/ReceiptMark";
import { AgentsPage } from "@/features/agents/AgentsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ME_QUERY_KEY, useMe } from "@/features/auth/useMe";
import { OrderDetailPage } from "@/features/orders/OrderDetailPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { RunPage } from "@/features/runs/RunPage";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-medium text-fg" : "text-muted hover:text-fg";

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
  const { pathname } = useLocation();
  const [logoutFailed, setLogoutFailed] = useState(false);
  const logOut = async () => {
    setLogoutFailed(false);
    try {
      const { response } = await api.POST("/v1/auth/logout");
      if (!response.ok) throw new Error(`logout failed with ${response.status}`);
      queryClient.setQueryData(ME_QUERY_KEY, null);
    } catch {
      setLogoutFailed(true);
    }
  };
  const agentsActive = pathname === "/agents" || pathname.startsWith("/runs/");

  return (
    <header>
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 w-full max-w-page items-center gap-4 px-4 text-sm sm:h-17 sm:gap-7 sm:px-6"
      >
        <Link to="/agents" className="mr-1 flex items-center gap-2.5 whitespace-nowrap text-base font-semibold sm:mr-3">
          <ReceiptMark />
          Agentic Market
        </Link>
        <Link to="/agents" className={navLinkClass({ isActive: agentsActive })} aria-current={agentsActive ? "page" : undefined}>
          Agents
        </Link>
        <NavLink to="/orders" className={navLinkClass}>
          Orders
        </NavLink>
        <span className="ml-auto flex items-center gap-2.5 text-muted">
          <span className="hidden sm:inline">{displayName}</span>
          <span
            aria-hidden="true"
            className="grid size-7.5 place-items-center rounded-full bg-accent-pale text-xs font-semibold text-accent-ink"
          >
            {initials(displayName)}
          </span>
        </span>
        <Button variant="ghost" className="px-3" onClick={logOut}>
          Log out
        </Button>
      </nav>
      {logoutFailed && (
        <p role="alert" className="mx-auto w-full max-w-page px-4 text-sm text-danger sm:px-6">
          Could not log out. Try again.
        </p>
      )}
    </header>
  );
}

function ProtectedLayout() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) {
    return (
      <p role="status" className="grid min-h-screen place-items-center text-muted">
        Loading…
      </p>
    );
  }
  if (me.isError) {
    return (
      <div role="alert" className="mx-auto mt-24 flex max-w-sm flex-col items-start gap-3 px-4">
        <p>Your session could not be checked.</p>
        <Button variant="outline" onClick={() => me.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!me.data) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
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
