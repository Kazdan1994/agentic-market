import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "@/routes";

type Handler = (request: Request) => Response | Promise<Response>;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const unauthorized = () => json(401, { error: { code: "UNAUTHORIZED", message: "Please sign in." } });
const alice = { id: "01900000-0000-7000-8000-00000000a11c", email: "alice@demo.local", displayName: "Alice" };

let signedIn = false;
let loginStatus = 204;
const calls: { method: string; path: string; body?: unknown }[] = [];

const handler: Handler = async (request) => {
  const path = new URL(request.url).pathname;
  const body = request.method === "POST" ? await request.clone().json().catch(() => undefined) : undefined;
  calls.push({ method: request.method, path, body });
  if (path === "/v1/me") return signedIn ? json(200, alice) : unauthorized();
  if (path === "/v1/auth/login") {
    if (loginStatus !== 204) return unauthorized();
    signedIn = true;
    return new Response(null, { status: 204 });
  }
  if (path === "/v1/agents" || path === "/v1/orders") return json(200, []);
  return json(404, { error: { code: "NOT_FOUND", message: "Not found" } });
};

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("LoginPage", () => {
  beforeEach(() => {
    signedIn = false;
    loginStatus = 204;
    calls.length = 0;
    vi.stubGlobal("fetch", vi.fn((input: Request) => handler(input)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("signs in and navigates to /agents", async () => {
    const router = renderAt("/login");
    await userEvent.type(screen.getByLabelText("Email"), "alice@demo.local");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Agents" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/agents");
    expect(calls).toContainEqual({
      method: "POST",
      path: "/v1/auth/login",
      body: { email: "alice@demo.local", password: "secret" },
    });
  });

  it("shows an error for wrong credentials", async () => {
    loginStatus = 401;
    renderAt("/login");
    await userEvent.type(screen.getByLabelText("Email"), "alice@demo.local");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
  });

  it("redirects protected routes to /login when signed out", async () => {
    const router = renderAt("/agents");
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });

  it("returns to the page that asked for sign-in", async () => {
    const router = renderAt("/orders/o1");
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.search).toBe("?next=%2Forders%2Fo1");

    await userEvent.type(screen.getByLabelText("Email"), "alice@demo.local");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/orders/o1"));
  });

  it.each(["//evil.com", "https://evil.com", "agents"])("ignores an unsafe next of %s", async (next) => {
    const router = renderAt(`/login?next=${encodeURIComponent(next)}`);
    await userEvent.type(screen.getByLabelText("Email"), "alice@demo.local");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/agents"));
  });

  it("titles the page", async () => {
    renderAt("/login");
    await waitFor(() => expect(document.title).toBe("Sign in · Agentic Market"));
  });
});
