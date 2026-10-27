import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReceiptMark } from "./ReceiptMark";

describe("ReceiptMark", () => {
  it("renders a decorative svg hidden from assistive tech", () => {
    const { container } = render(<ReceiptMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
