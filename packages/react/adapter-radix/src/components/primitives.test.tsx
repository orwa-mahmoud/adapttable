import { fireEvent, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderRadix } from "../test-utils";
import { Checkbox, FormField, NativeSelect, Tooltip } from "./primitives";

function renderNode(node: ReactElement) {
  return renderRadix(node);
}

describe("Checkbox primitive (Radix)", () => {
  it("fires onToggle once per click and renders its optional label", () => {
    const onToggle = vi.fn();
    renderNode(
      <Checkbox aria-label="pick me" checked={false} onToggle={onToggle}>
        Pick me
      </Checkbox>
    );
    expect(screen.getByText("Pick me")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("pick me"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders a safe read-only checkbox when onToggle is omitted", () => {
    // No `onToggle` → `onCheckedChange` is `undefined`; a click is an inert
    // no-op that must not throw (the defensive arm of the toggle ternary).
    renderNode(<Checkbox aria-label="read only" checked />);
    const box = screen.getByLabelText("read only");
    expect(() => fireEvent.click(box)).not.toThrow();
  });

  it("maps indeterminate onto Radix's mixed checked state", () => {
    renderNode(<Checkbox aria-label="some" checked={false} indeterminate />);
    // Radix forwards `indeterminate` as the "mixed" checkbox state.
    expect(screen.getByLabelText("some")).toHaveAttribute(
      "aria-checked",
      "mixed"
    );
  });

  it("renders just the box (no label wrapper) when no children are given", () => {
    renderNode(<Checkbox aria-label="bare" checked />);
    expect(screen.getByLabelText("bare")).toBeInTheDocument();
    expect(screen.queryByText(/.+/, { selector: "label" })).toBeNull();
  });
});

describe("Tooltip primitive (Radix)", () => {
  it("renders the trigger untouched when disabled", () => {
    renderNode(
      <Tooltip label="Hi" disabled>
        <button type="button">trigger</button>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "trigger" });
    // A disabled tip wraps nothing extra — no Radix tooltip data attrs.
    expect(trigger).not.toHaveAttribute("data-state");
  });

  it("renders the trigger untouched when the label is empty", () => {
    renderNode(
      <Tooltip label="">
        <button type="button">empty-label</button>
      </Tooltip>
    );
    expect(
      screen.getByRole("button", { name: "empty-label" })
    ).not.toHaveAttribute("data-state");
  });

  it("wraps the trigger in a Radix tooltip when enabled with a label", () => {
    renderNode(
      <Tooltip label="Helpful">
        <button type="button">tipped</button>
      </Tooltip>
    );
    // An enabled tooltip gives its trigger the Radix tooltip state attribute.
    expect(screen.getByRole("button", { name: "tipped" })).toHaveAttribute(
      "data-state"
    );
  });
});

describe("NativeSelect primitive (Radix)", () => {
  it("round-trips the empty value through the sentinel on the way down and up", () => {
    const onValueChange = vi.fn();
    renderNode(
      <NativeSelect
        aria-label="Status"
        value=""
        placeholder="Status"
        options={[
          { value: "", label: "All" },
          { value: "active", label: "Active" },
        ]}
        onValueChange={onValueChange}
      />
    );
    // Empty `value` selects the sentinel-backed "All" option (its label shows
    // in the trigger) — the round-trip DOWN, mapping "" → the sentinel.
    const trigger = screen.getByRole("combobox", { name: "Status" });
    expect(within(trigger).getByText("All")).toBeInTheDocument();
  });

  it("maps the sentinel back to the empty value when the empty option is picked", () => {
    const onValueChange = vi.fn();
    renderNode(
      <NativeSelect
        aria-label="Status"
        // Starting non-empty so picking the empty "All" is a real change Radix
        // fires — proving the round-trip UP (sentinel → "").
        value="active"
        placeholder="Status"
        options={[
          { value: "", label: "All" },
          { value: "active", label: "Active" },
        ]}
        onValueChange={onValueChange}
      />
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
    fireEvent.click(screen.getByRole("option", { name: "All" }));
    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("forwards a non-empty value change verbatim", () => {
    const onValueChange = vi.fn();
    renderNode(
      <NativeSelect
        aria-label="Status"
        value="active"
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        onValueChange={onValueChange}
      />
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
    fireEvent.click(screen.getByRole("option", { name: "Inactive" }));
    expect(onValueChange).toHaveBeenCalledWith("inactive");
  });

  it("disables an option flagged disabled", () => {
    renderNode(
      <NativeSelect
        aria-label="Plan"
        value=""
        options={[{ value: "", label: "…", disabled: true }]}
        onValueChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Plan" }));
    expect(screen.getByRole("option", { name: "…" })).toHaveAttribute(
      "data-disabled"
    );
  });
});

describe("FormField primitive (Radix)", () => {
  it("stacks a label above its control", () => {
    renderNode(
      <FormField label="My Label">
        <input aria-label="My Label" />
      </FormField>
    );
    expect(screen.getByText("My Label")).toBeInTheDocument();
    expect(screen.getByLabelText("My Label")).toBeInTheDocument();
  });
});
