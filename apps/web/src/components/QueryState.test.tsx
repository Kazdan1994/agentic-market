import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/features/agents/useAgents";
import { QueryState, type QueryLike } from "./QueryState";

function renderState(query: QueryLike<string[]>, extra: Partial<Parameters<typeof QueryState<string[]>>[0]> = {}) {
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <QueryState
          query={query}
          resource="Orders"
          skeleton={<p>skeleton</p>}
          empty={<p>nothing yet</p>}
          isEmpty={(rows) => rows.length === 0}
          {...extra}
        >
          {(rows) => <p>{rows.join(", ")}</p>}
        </QueryState>
      ),
    },
  ]);
  render(<RouterProvider router={router} />);
}

const base = { isPending: false, isError: false, error: null, data: undefined, refetch: vi.fn() };

describe("QueryState", () => {
  it("shows the skeleton in a busy region while pending", () => {
    renderState({ ...base, isPending: true });
    expect(screen.getByText("skeleton").closest("[aria-busy='true']")).not.toBeNull();
  });

  it("names what failed and retries in place", async () => {
    const refetch = vi.fn();
    renderState({ ...base, isError: true, error: new Error("boom"), refetch });
    expect(screen.getByRole("alert")).toHaveTextContent("Orders could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows not-found with a link to the parent list", () => {
    renderState(
      { ...base, isError: true, error: new ApiError("NOT_FOUND", "Not found") },
      { resource: "Order", notFound: { to: "/orders", label: "Back to Orders" } },
    );
    expect(screen.getByText("This order doesn't exist.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Orders" })).toHaveAttribute("href", "/orders");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("shows the empty slot when the data is empty", () => {
    renderState({ ...base, data: [] });
    expect(screen.getByText("nothing yet")).toBeInTheDocument();
  });

  it("renders the children with the data", () => {
    renderState({ ...base, data: ["a", "b"] });
    expect(screen.getByText("a, b")).toBeInTheDocument();
  });
});
