import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxProps,
  columnSelectLabel,
} from "./ColumnSelectCheckbox";

/** The native control `adapter-unstyled` supplies; enough to drive the chrome. */
function Box({ label, checked, onToggle }: ColumnSelectCheckboxProps) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onToggle}
    />
  );
}

const slots = { Checkbox: Box };

/** Report a pointer that can hover, the way a desktop browser would. */
function hoveringPointer(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the column-selection header checkbox chrome", () => {
  const part = () =>
    document.querySelector<HTMLElement>(
      '[data-adapttable-part="column-select"]'
    )!;

  it("names the part and hosts the kit's control", () => {
    render(
      <ColumnSelectCheckboxChrome
        label="Select column: Team"
        checked={false}
        onToggle={vi.fn()}
        className="mine"
        slots={slots}
      />
    );

    expect(part()).not.toBeNull();
    expect(part().className).toBe("mine");
    expect(
      screen.getByRole("checkbox", { name: "Select column: Team" })
    ).toBeInTheDocument();
  });

  it("reports the checked state through to the control", () => {
    render(
      <ColumnSelectCheckboxChrome
        label="Select column: Team"
        checked
        onToggle={vi.fn()}
        slots={slots}
      />
    );

    expect(screen.getByRole<HTMLInputElement>("checkbox").checked).toBe(true);
  });

  it("toggles on a click", () => {
    const onToggle = vi.fn();
    render(
      <ColumnSelectCheckboxChrome
        label="Select column: Team"
        checked={false}
        onToggle={onToggle}
        slots={slots}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("keeps the click off the header it sits in", () => {
    const onHeaderClick = vi.fn();
    render(
      <th onClick={onHeaderClick}>
        <ColumnSelectCheckboxChrome
          label="Select column: Team"
          checked={false}
          onToggle={vi.fn()}
          slots={slots}
        />
      </th>
    );

    fireEvent.click(screen.getByRole("checkbox"));

    // What a kit really does: `getColumnHeaderProps().onClick` on the <th>. A
    // sortable header sorts on click and a plain one selects on click; either
    // would undo what ticking the box just did.
    expect(onHeaderClick).not.toHaveBeenCalled();
  });

  it("keeps Space off the grid", () => {
    const onHeaderKeyDown = vi.fn();
    render(
      <th onKeyDown={onHeaderKeyDown}>
        <ColumnSelectCheckboxChrome
          label="Select column: Team"
          checked={false}
          onToggle={vi.fn()}
          slots={slots}
        />
      </th>
    );

    // Space on a checkbox toggles it. Space on a cell belongs to the grid, and
    // they are the same keystroke.
    fireEvent.keyDown(screen.getByRole("checkbox"), { key: " " });

    expect(onHeaderKeyDown).not.toHaveBeenCalled();
  });

  it("stays visible where there is no hover to wait for", () => {
    hoveringPointer(false);
    render(
      <ColumnSelectCheckboxChrome
        label="Select column: Team"
        checked={false}
        onToggle={vi.fn()}
        slots={slots}
      />
    );

    // A touch device has no pointer to hover with and no Ctrl key to hold, so
    // a control that waits for a hover is a control it never gets.
    expect(part()).toHaveStyle({ opacity: "1" });
    expect(part()).toHaveAttribute("data-shown", "");
  });

  it("waits for hover or focus where hovering is possible", () => {
    hoveringPointer(true);
    render(
      <ColumnSelectCheckboxChrome
        label="Select column: Team"
        checked={false}
        onToggle={vi.fn()}
        slots={slots}
      />
    );

    expect(part()).toHaveStyle({ opacity: "0" });

    fireEvent.pointerEnter(part());
    expect(part()).toHaveStyle({ opacity: "1" });

    fireEvent.pointerLeave(part());
    expect(part()).toHaveStyle({ opacity: "0" });

    // Focus reveals it too, so a keyboard reaches what a mouse does.
    fireEvent.focus(part());
    expect(part()).toHaveStyle({ opacity: "1" });
  });

  it("shows a selected column's state whether or not the pointer is near", () => {
    hoveringPointer(true);
    render(
      <ColumnSelectCheckboxChrome
        label="Select column: Team"
        checked
        onToggle={vi.fn()}
        slots={slots}
      />
    );

    // A ticked box that fades out is a selection with nothing on screen
    // saying so.
    expect(part()).toHaveStyle({ opacity: "1" });
  });
});

describe("columnSelectLabel", () => {
  it("names what it does and which column", () => {
    expect(
      columnSelectLabel("Select column", { key: "team", header: "Team" })
    ).toBe("Select column: Team");
  });

  it("falls back to the key when the header is not text", () => {
    expect(
      columnSelectLabel("Select column", { key: "team", header: <b>Team</b> })
    ).toBe("Select column: team");
  });

  it("has an English fallback, so a missing label is never a bare colon", () => {
    expect(columnSelectLabel(undefined, { key: "team" })).toBe(
      "Select column: team"
    );
  });
});
