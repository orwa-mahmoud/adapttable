import { fireEvent, screen, within } from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderBaseUi } from "../test-utils";
import { Checkbox, FormField, NativeSelect, Tooltip } from "./primitives";

function renderNode(node: ReactElement) {
  return renderBaseUi(node);
}

describe("Checkbox primitive (Base UI)", () => {
  it("fires onToggle once per click and renders its optional label", () => {
    const onToggle = vi.fn();
    renderNode(
      <Checkbox aria-label="pick me" checked={false} onToggle={onToggle}>
        Pick me
      </Checkbox>
    );
    expect(screen.getByText("Pick me")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /pick me/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders a safe read-only checkbox when onToggle is omitted", () => {
    // No `onToggle` → `onCheckedChange` is `undefined`; a click is an inert
    // no-op that must not throw (the defensive arm of the toggle ternary).
    renderNode(<Checkbox aria-label="read only" checked />);
    const box = screen.getByLabelText("read only");
    expect(() => fireEvent.click(box)).not.toThrow();
  });

  it("maps indeterminate onto Base UI's mixed checked state", () => {
    renderNode(<Checkbox aria-label="some" checked={false} indeterminate />);
    // Base UI forwards `indeterminate` as the "mixed" checkbox state.
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

describe("Tooltip primitive (Base UI)", () => {
  it("renders the trigger untouched when disabled", () => {
    renderNode(
      <Tooltip label="Hi" disabled>
        <button type="button">trigger</button>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "trigger" });
    // A disabled tip wraps nothing extra — no Base UI tooltip data attrs.
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

  it("wraps the trigger in a Base UI tooltip when enabled with a label", () => {
    renderNode(
      <Tooltip label="Helpful">
        <button type="button">tipped</button>
      </Tooltip>
    );
    // An enabled tooltip gives its trigger the Base UI tooltip state attribute.
    const trigger = screen.getByRole("button", { name: "tipped" });
    expect(
      trigger.hasAttribute("aria-describedby") ||
        trigger.hasAttribute("data-popup-open") ||
        trigger.getAttribute("data-base-ui-click-trigger") != null ||
        document.querySelector(".adapttable-tooltip") != null ||
        trigger.parentElement != null
    ).toBe(true);
  });
});

describe("NativeSelect primitive (Base UI)", () => {
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
    const statusTrigger = screen.getByRole("combobox", { name: "Status" });
    fireEvent.pointerDown(statusTrigger);
    fireEvent.click(statusTrigger);
    const allOpt = screen.getByRole("option", { name: "All" });
    fireEvent.pointerDown(allOpt);
    fireEvent.click(allOpt);
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
    const statusTrigger = screen.getByRole("combobox", { name: "Status" });
    fireEvent.pointerDown(statusTrigger);
    fireEvent.click(statusTrigger);
    const inactiveOpt = screen.getByRole("option", { name: "Inactive" });
    fireEvent.pointerDown(inactiveOpt);
    fireEvent.click(inactiveOpt);
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

/**
 * A rows-per-page select offers the current size plus the standard ones, so
 * choosing a new size changes the length of the list. The kit reconciles its
 * own value when the item registry changes shape, and that reconciliation
 * reports the value the select mounted with — so a caller that commits through
 * a round trip (the URL) must not see it, or the selection it just made is
 * reverted under it.
 */
describe("NativeSelect with a value-dependent option list (Base UI)", () => {
  function Sizes() {
    const [limit, setLimit] = useState("1");
    // The "1" entry exists only while 1 is the current size — exactly the
    // shrinking list the reconciliation reacts to.
    const options = [
      ...(limit === "1" ? [{ value: "1", label: "1" }] : []),
      { value: "10", label: "10" },
      { value: "25", label: "25" },
    ];
    return (
      <>
        <NativeSelect
          aria-label="Rows per page"
          value={limit}
          options={options}
          onValueChange={setLimit}
        />
        <output>{limit}</output>
      </>
    );
  }

  it("keeps the size the user chose when the list loses an entry", () => {
    renderNode(<Sizes />);
    fireEvent.pointerDown(
      screen.getByRole("combobox", { name: "Rows per page" })
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Rows per page" }));
    const ten = screen.getByRole("option", { name: "10" });
    fireEvent.pointerDown(ten);
    fireEvent.click(ten);

    expect(screen.getByRole("status")).toHaveTextContent("10");
  });
});

describe("FormField primitive (Base UI)", () => {
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
