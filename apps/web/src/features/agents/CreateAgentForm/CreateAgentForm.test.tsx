import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, type Call, json, makeAgent, renderAt, stubApi } from "@/test-utils";

const categories = [
  { slug: "audio", name: "Audio" },
  { slug: "books", name: "Books" },
];

let agents: ReturnType<typeof makeAgent>[] = [];
let createResponse: () => Response;
let calls: Call[];

async function fill(values: { name?: string; cap?: string; total?: string; expiry?: string; category?: string }) {
  const user = userEvent.setup();
  if (values.name !== undefined) await user.type(screen.getByLabelText("Name"), values.name);
  if (values.cap !== undefined) await user.type(screen.getByLabelText("Per-purchase cap (EUR)"), values.cap);
  if (values.total !== undefined) await user.type(screen.getByLabelText("Total budget (EUR)"), values.total);
  if (values.expiry !== undefined) await user.type(screen.getByLabelText("Expires at"), values.expiry);
  if (values.category) await user.click(screen.getByRole("checkbox", { name: values.category }));
  await user.click(screen.getByRole("button", { name: "Create agent" }));
}

describe("CreateAgentForm", () => {
  beforeEach(() => {
    agents = [];
    createResponse = () => json(201, makeAgent({ name: "New buyer" }));
    calls = stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/categories") return json(200, categories);
      if (path === "/v1/agents" && request.method === "GET") return json(200, agents);
      if (path === "/v1/agents" && request.method === "POST") {
        const response = createResponse();
        if (response.status === 201) agents = [makeAgent({ name: "New buyer" })];
        return response;
      }
      return undefined;
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("creates the agent with amounts in cents and adds it to the list", async () => {
    renderAt("/agents");
    await screen.findByRole("checkbox", { name: "Audio" });
    await fill({ name: "New buyer", cap: "100", total: "150.50", expiry: "2030-01-31T12:00", category: "Audio" });

    expect(await screen.findByRole("heading", { name: "New buyer" })).toBeInTheDocument();
    const post = calls.find((call) => call.method === "POST" && call.path === "/v1/agents");
    expect(post?.body).toMatchObject({
      name: "New buyer",
      perPurchaseCapMinor: 10000,
      totalBudgetMinor: 15050,
      categorySlugs: ["audio"],
    });
    expect(new Date((post?.body as { expiresAt: string }).expiresAt).getFullYear()).toBe(2030);
  });

  it("rejects a cap of zero, a cap above the total, no category and a past expiry", async () => {
    renderAt("/agents");
    await screen.findByRole("checkbox", { name: "Audio" });
    await fill({ name: "Bad", cap: "0", total: "50", expiry: "2020-01-01T00:00" });

    expect(await screen.findByText("Enter an amount above 0.")).toBeInTheDocument();
    expect(screen.getByText("Pick at least one category.")).toBeInTheDocument();
    expect(screen.getByText("Pick a date in the future.")).toBeInTheDocument();
    expect(calls.some((call) => call.method === "POST")).toBe(false);

    await userEvent.clear(screen.getByLabelText("Per-purchase cap (EUR)"));
    await userEvent.type(screen.getByLabelText("Per-purchase cap (EUR)"), "80");
    await userEvent.clear(screen.getByLabelText("Total budget (EUR)"));
    await userEvent.type(screen.getByLabelText("Total budget (EUR)"), "60");
    await userEvent.click(screen.getByRole("button", { name: "Create agent" }));
    expect(await screen.findByText("The per-purchase cap cannot exceed the total budget.")).toBeInTheDocument();
  });

  it("shows server field errors on the matching field", async () => {
    createResponse = () =>
      apiError(400, "VALIDATION_FAILED", "Some fields are invalid.", {
        name: ["name must be shorter than or equal to 60 characters"],
      });
    renderAt("/agents");
    await screen.findByRole("checkbox", { name: "Audio" });
    await fill({ name: "Too long", cap: "10", total: "20", expiry: "2030-01-31T12:00", category: "Audio" });

    expect(await screen.findByText("name must be shorter than or equal to 60 characters")).toBeInTheDocument();
  });
});
