import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, FakeEventSource, json, makeAgent, makeRun, renderAt, stubApi } from "@/test-utils";

let startResponse: () => Response;

async function startRun(request: string) {
  renderAt("/agents");
  const field = await screen.findByLabelText("What should the agent buy?");
  await userEvent.type(field, request);
  await userEvent.click(screen.getByRole("button", { name: "Start run" }));
}

describe("StartRunForm", () => {
  beforeEach(() => {
    // The run page opens the live stream once the form navigates there.
    FakeEventSource.install();
    startResponse = () => json(202, makeRun());
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/agents") return json(200, [makeAgent()]);
      if (path === "/v1/categories") return json(200, []);
      if (path.endsWith("/runs") && request.method === "POST") return startResponse();
      if (path.endsWith("/runs") || path === "/v1/orders") return json(200, []);
      if (path.startsWith("/v1/runs/")) return json(200, makeRun());
      return undefined;
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts a run and opens its page", async () => {
    await startRun("wireless headphones for running");
    expect(await screen.findByRole("heading", { name: "“wireless headphones for running”" })).toBeInTheDocument();
  });

  it("asks for at least 3 characters", async () => {
    await startRun("ab");
    expect(await screen.findByText("Describe the purchase in 3 to 500 characters.")).toBeInTheDocument();
  });

  it.each([
    ["RUN_ALREADY_IN_PROGRESS", 409, "This agent is already shopping. Wait for its run to finish."],
    ["MANDATE_EXHAUSTED", 409, "Budget used up. This agent cannot buy anything more."],
    ["MANDATE_EXPIRED", 409, "This agent's mandate has expired."],
    ["MANDATE_REVOKED", 409, "This agent's mandate was revoked."],
    ["INVALID_REQUEST", 422, "The agent could not understand this request. Try describing the product."],
  ])("explains %s in plain language", async (code, status, message) => {
    startResponse = () => apiError(status, code, "server text");
    await startRun("wireless headphones");
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});
