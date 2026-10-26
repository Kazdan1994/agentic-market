import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, makeAgent, renderAt, stubApi } from "@/test-utils";

describe("AgentsPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows each agent's mandate: status, limits, spending, categories and expiry", async () => {
    const agents = [
      makeAgent({ name: "Headphones buyer", spent: 2900 }),
      makeAgent({ id: "01900000-0000-7000-8000-0000000a9e02", name: "Old buyer", status: "exhausted" }),
      makeAgent({ id: "01900000-0000-7000-8000-0000000a9e03", name: "Late buyer", status: "expired" }),
      makeAgent({ id: "01900000-0000-7000-8000-0000000a9e04", name: "Stopped buyer", status: "revoked" }),
    ];
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/agents") return json(200, agents);
      if (path === "/v1/categories") return json(200, [{ slug: "audio", name: "Audio" }]);
      return undefined;
    });
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

  it("says so when there is no agent yet", async () => {
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/agents") return json(200, []);
      if (path === "/v1/categories") return json(200, []);
      return undefined;
    });
    renderAt("/agents");
    expect(await screen.findByText(/No agent yet/)).toBeInTheDocument();
  });
});
