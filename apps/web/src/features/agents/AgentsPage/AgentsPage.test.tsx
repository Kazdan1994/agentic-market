import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { apiError, FakeEventSource, json, makeAgent, makeLogEntry, makeOrder, makeRun, never, onceThen, renderAt, stubApi } from "@/test-utils";

type Overrides = Partial<Record<"agents" | "categories" | "orders", () => Response>> & {
  runs?: (mandateId: string) => Response;
};

function stubAgentsApi(o: Overrides) {
  return stubApi((request) => {
    const path = new URL(request.url).pathname;
    if (path === "/v1/agents") return o.agents?.() ?? json(200, []);
    if (path === "/v1/categories") return o.categories?.() ?? json(200, [{ slug: "audio", name: "Audio" }]);
    if (path === "/v1/orders") return o.orders?.() ?? json(200, []);
    const runs = /^\/v1\/mandates\/([^/]+)\/runs$/.exec(path);
    if (runs?.[1]) return o.runs?.(runs[1]) ?? json(200, []);
    return undefined;
  });
}

function withMandate(id: string, name: string, overrides: { status?: string; spent?: number; expiresAt?: string } = {}) {
  const base = makeAgent({ id: `agent-${id}`, name, status: overrides.status, spent: overrides.spent });
  return { ...base, mandate: { ...base.mandate, id, expiresAt: overrides.expiresAt ?? base.mandate.expiresAt } };
}

describe("AgentsPage", () => {
  beforeEach(() => FakeEventSource.install());
  afterEach(() => vi.unstubAllGlobals());

  it("shows each agent's mandate: status, limits, spending, categories and expiry", async () => {
    const agents = [
      makeAgent({ name: "Headphones buyer", spent: 2900 }),
      makeAgent({ id: "01900000-0000-7000-8000-0000000a9e02", name: "Old buyer", status: "exhausted" }),
      makeAgent({ id: "01900000-0000-7000-8000-0000000a9e03", name: "Late buyer", status: "expired" }),
      makeAgent({ id: "01900000-0000-7000-8000-0000000a9e04", name: "Stopped buyer", status: "revoked" }),
    ];
    stubAgentsApi({ agents: () => json(200, agents) });
    renderAt("/agents");

    const card = (await screen.findByRole("heading", { name: "Headphones buyer" })).closest("article");
    if (!card) throw new Error("agent card not found");
    const scope = within(card as HTMLElement);
    expect(scope.getByText("Active")).toBeInTheDocument();
    expect(scope.getByText("100.00 EUR")).toBeInTheDocument();
    expect(scope.getByText("150.00 EUR")).toBeInTheDocument();
    expect(scope.getByText("29.00 EUR")).toBeInTheDocument();
    expect(scope.getByText("121.00 EUR")).toBeInTheDocument();
    expect(scope.getByText("Audio")).toBeInTheDocument();
    expect(scope.getByText(/2027/)).toBeInTheDocument();

    expect(screen.getByText("Budget used up")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Revoked")).toBeInTheDocument();
  });

  it("shows a placeholder while the agents load", async () => {
    stubAgentsApi({ agents: never });
    renderAt("/agents");
    await vi.waitFor(() => expect(document.querySelector("main [aria-busy='true']")).not.toBeNull());
  });

  it("retries the agents in place after a failure", async () => {
    const agents = onceThen(
      () => apiError(500, "INTERNAL_ERROR", "Boom"),
      () => json(200, [makeAgent({ name: "Headphones buyer" })]),
    );
    const calls = stubAgentsApi({ agents });
    renderAt("/agents");

    expect(await screen.findByRole("alert")).toHaveTextContent("Agents could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Headphones buyer" })).toBeInTheDocument();
    expect(calls.filter((call) => call.path === "/v1/agents")).toHaveLength(2);
  });

  it("retries the categories in place after a failure", async () => {
    const categories = onceThen(
      () => apiError(500, "INTERNAL_ERROR", "Boom"),
      () => json(200, [{ slug: "audio", name: "Audio" }]),
    );
    stubAgentsApi({ categories });
    renderAt("/agents");

    expect(await screen.findByRole("alert")).toHaveTextContent("Categories could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("says so when there is no agent yet", async () => {
    stubAgentsApi({});
    renderAt("/agents");
    expect(await screen.findByText(/No agent yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New agent" })).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("button", { name: "Create agent" })).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("leads with what is left to spend, then slips, ended stubs and latest orders", async () => {
    const pantry = withMandate("m1", "Pantry restock", { spent: 5750 });
    const gift = withMandate("m2", "Birthday gift", { expiresAt: "2026-10-27T10:00:00.000Z" });
    const office = withMandate("m3", "Office supplies", { status: "exhausted", spent: 15000 });
    const orders = Array.from({ length: 6 }, (_, i) => ({ ...makeOrder({ id: `o${i}` }), mandateId: i < 2 ? "m1" : "m3" }));
    stubAgentsApi({
      agents: () => json(200, [office, gift, pantry]),
      orders: () => json(200, orders),
      runs: (id) => json(200, id === "m1" ? [makeRun({ id: "r1" })] : []),
    });
    renderAt("/agents");

    expect(await screen.findByRole("heading", { level: 1, name: "Agents" })).toBeInTheDocument();
    expect(await screen.findByText(/left to spend across 2 mandates\. Pantry restock is shopping now\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New agent" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Create agent" })).toBeNull();

    const slips = screen.getAllByRole("article").map((a) => within(a).getAllByRole("heading")[0]?.textContent);
    expect(slips).toEqual(["Pantry restock", "Birthday gift"]);

    const ended = screen.getByRole("region", { name: "Ended" });
    expect(within(ended).getByText("Office supplies")).toBeInTheDocument();
    expect(within(ended).getByText("Budget used up")).toBeInTheDocument();

    const latest = screen.getByRole("region", { name: "Latest orders" });
    expect(within(latest).getAllByRole("row")).toHaveLength(6); // header + 5
    expect(within(latest).getByRole("link", { name: "All 6 orders" })).toHaveAttribute("href", "/orders");
  });

  it("prints the running agent's steps on the till roll", async () => {
    stubAgentsApi({
      agents: () => json(200, [withMandate("m1", "Pantry restock")]),
      runs: () => json(200, [makeRun({ id: "r1" })]),
    });
    renderAt("/agents");

    await vi.waitFor(() => expect(FakeEventSource.instances.some((s) => s.url === "/v1/runs/r1/events")).toBe(true));
    expect(screen.queryByRole("region", { name: "Pantry restock live" })).toBeNull();
    act(() => FakeEventSource.last().emit("log", makeLogEntry(1, { message: "Searched 3 shops" }), "1"));
    expect(await screen.findByRole("region", { name: "Pantry restock live" })).toHaveTextContent("Searched 3 shops");
  });

  it("opens no stream when no agent is shopping", async () => {
    stubAgentsApi({ agents: () => json(200, [withMandate("m1", "Pantry restock")]) });
    renderAt("/agents");
    await screen.findByRole("article");
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("confirms a new agent, folds the form away and creates it once", async () => {
    let created = false;
    const calls = stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/agents" && request.method === "POST") {
        created = true;
        return json(201, withMandate("m9", "Coffee beans"));
      }
      if (path === "/v1/agents") return json(200, created ? [withMandate("m9", "Coffee beans")] : []);
      if (path === "/v1/categories") return json(200, [{ slug: "audio", name: "Audio" }]);
      if (path === "/v1/orders") return json(200, []);
      if (path.endsWith("/runs")) return json(200, []);
      return undefined;
    });
    renderAt("/agents");

    await userEvent.type(await screen.findByLabelText("Name"), "Coffee beans");
    await userEvent.type(screen.getByLabelText("Expires at"), "2027-01-31T10:00");
    await userEvent.type(screen.getByLabelText("Per-purchase cap (EUR)"), "25");
    await userEvent.type(screen.getByLabelText("Total budget (EUR)"), "75");
    await userEvent.click(screen.getByLabelText("Audio"));
    await userEvent.dblClick(screen.getByRole("button", { name: "Create agent" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Agent “Coffee beans” created.");
    expect(screen.getByRole("button", { name: "New agent" })).toHaveAttribute("aria-expanded", "false");
    expect(calls.filter((c) => c.method === "POST" && c.path === "/v1/agents")).toHaveLength(1);
  });
});
