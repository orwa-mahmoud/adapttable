import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { Checkbox, FormField } from "./primitives";

function renderCheckbox(node: ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{node}</ChakraProvider>);
}

describe("Checkbox primitive", () => {
  it("fires onToggle once per click and renders its optional label", () => {
    const onToggle = vi.fn();
    renderCheckbox(
      <Checkbox aria-label="pick me" checked={false} onToggle={onToggle}>
        Pick me
      </Checkbox>
    );
    expect(screen.getByText("Pick me")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("pick me"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders a safe read-only checkbox when onToggle is omitted", () => {
    // No `onToggle` → the input's onClick is `undefined`; a click is an inert
    // no-op that must not throw (the defensive arm of the toggle ternary).
    renderCheckbox(<Checkbox aria-label="read only" checked />);
    const input = screen.getByLabelText("read only");
    expect(() => fireEvent.click(input)).not.toThrow();
  });
});

describe("FormField part forwarding (Chakra)", () => {
  it("places the part and class on the same labelled root", () => {
    const { container } = renderCheckbox(
      <FormField
        label="Filter label"
        className="custom-filter-field"
        data-adapttable-part="filter-field"
      >
        <input aria-label="Filter value" data-adapttable-part="filter-input" />
      </FormField>
    );
    const field = container.querySelector(
      '[data-adapttable-part="filter-field"]'
    );
    expect(field).toHaveClass("custom-filter-field");
    expect(screen.getByText("Filter label").parentElement).toBe(field);
    const input = screen.getByLabelText("Filter value");
    expect(field).toContainElement(input);
    expect(input).toHaveAttribute("data-adapttable-part", "filter-input");
    expect(input).not.toHaveClass("custom-filter-field");
    expect(
      container.querySelectorAll('[data-adapttable-part="filter-field"]')
    ).toHaveLength(1);
  });
});
