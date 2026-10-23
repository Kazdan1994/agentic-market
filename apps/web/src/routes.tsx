import { Navigate, Outlet, type RouteObject } from "react-router";
import { AgentsPage } from "@/features/agents/AgentsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { useMe } from "@/features/auth/useMe";

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
    ],
  },
];
