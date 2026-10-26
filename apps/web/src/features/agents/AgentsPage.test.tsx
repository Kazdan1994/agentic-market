import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, json, makeAgent, never, onceThen, renderAt, stubApi } from "@/test-utils";

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

  it("shows a placeholder while the agents load", async () => {
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/agents") return never();
      if (path === "/v1/categories") return json(200, []);
      return undefined;
    });
    renderAt("/agents");
    await vi.waitFor(() => expect(document.querySelector("main [aria-busy='true']")).not.toBeNull());
  });

  it("retries the agents in place after a failure", async () => {
    const agents = onceThen(
      () => apiError(500, "INTERNAL_ERROR", "Boom"),
      () => json(200, [makeAgent({ name: "Headphones buyer" })]),
    );
    const calls = stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/agents") return agents();
      if (path === "/v1/categories") return json(200, []);
      return undefined;
    });
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
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/agents") return json(200, []);
      if (path === "/v1/categories") return categories();
      return undefined;
    });
    renderAt("/agents");

    expect(await screen.findByRole("alert")).toHaveTextContent("Categories could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
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
