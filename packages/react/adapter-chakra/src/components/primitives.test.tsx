import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "./primitives";

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
