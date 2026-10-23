import { Navigate, Outlet, type RouteObject } from "react-router";
import { LoginPage } from "@/features/auth/LoginPage";
import { useMe } from "@/features/auth/useMe";

function ProtectedLayout() {
  const me = useMe();
  if (me.isPending) return null;
  if (me.isError) return <p role="alert">Something went wrong. Please reload.</p>;
  if (!me.data) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Placeholder until the agents list lands (slice 9).
function AgentsPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Agents</h1>
    </main>
  );
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
