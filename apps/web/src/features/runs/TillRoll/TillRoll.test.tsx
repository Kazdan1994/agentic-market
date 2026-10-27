import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeLogEntry } from "@/test-utils";
import { TillRoll } from "./TillRoll";

describe("TillRoll", () => {
  it("prints each step and marks the latest as being printed", () => {
    const entries = [makeLogEntry(1, { message: "Searched 3 shops" }), makeLogEntry(2, { message: "Choosing Ocado 5 kg" })];
    render(<TillRoll agentName="Pantry restock" startedAt="2026-10-23T10:00:00.000Z" entries={entries} />);

    expect(screen.getByRole("region", { name: "Pantry restock live" })).toBeInTheDocument();
    expect(screen.getByText("PANTRY RESTOCK - LIVE")).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(list).toHaveAttribute("aria-live", "polite");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveClass("now");
    expect(items[1]).toHaveTextContent("Choosing Ocado 5 kg");
  });

  it("prints nothing before the first step", () => {
    const { container } = render(<TillRoll agentName="Pantry" startedAt="2026-10-23T10:00:00.000Z" entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
