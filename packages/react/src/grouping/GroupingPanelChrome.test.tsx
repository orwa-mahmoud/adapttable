import { type GroupingPanelState, resolveLabels } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";

type AnyColumn = ColumnDef<unknown>;

import {
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlots,
  type GroupingPanelSurfaceProps,
} from "./GroupingPanelChrome";

const slots: GroupingPanelSlots = {
  Surface: ({
    children,
    label,
    mobile: _mobile,
    dir,
    ...props
  }: GroupingPanelSurfaceProps) => (
    <section aria-label={label} dir={dir} {...props}>
      {children}
    </section>
  ),
  DropZone: ({
    label,
    dropProps,
    active: _active,
    empty: _empty,
    ...props
  }: GroupingPanelDropZoneProps) => (
    <div aria-label={label} {...dropProps} {...props} />
  ),
  Chip: ({
    label,
    dragProps,
    keyboardProps,
    onRemove,
    removeLabel,
    ...props
  }: GroupingPanelChipProps) => (
    <span {...props}>
      <button type="button" {...dragProps} {...keyboardProps}>
        {label}
      </button>
      <button type="button" aria-label={removeLabel} onClick={onRemove}>
        {"x"}
      </button>
    </span>
  ),
  Select: ({
    label,
    value,
    options,
    onChange,
    ...props
  }: GroupingPanelSelectProps) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      >
        {value === "" && !options.some((option) => option.value === "") ? (
          <option value="">{label}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
  RemoveZone: ({
    label,
    dropProps,
    active: _active,
    ...props
  }: GroupingPanelRemoveZoneProps) => (
    <div aria-label={label} {...dropProps} {...props} />
  ),
};

function panelState(
  overrides: Partial<GroupingPanelState> = {}
): GroupingPanelState {
  return {
    groupBy: ["team"],
    aggregateOverrides: {},
    canSetAggregates: true,
    announcement: "",
    headerDragProps: () => ({}),
    chipDragProps: () => ({}),
    chipKeyboardProps: (_key, label) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": `Move ${label}`,
      onKeyDown: () => undefined,
    }),
    dropProps: () => ({}),
    removeDropProps: () => ({}),
    add: vi.fn(),
    remove: vi.fn(),
    moveBy: vi.fn(),
    setAggregate: vi.fn(),
    ...overrides,
  };
}

const columns = [
  { key: "team", header: "Team" },
  { key: "budget", header: "Budget" },
  { key: "person", header: "Person" },
];

function mount(
  state: GroupingPanelState,
  mobile = false,
  columnDefs: readonly AnyColumn[] = columns
): void {
  render(
    <GroupingPanelChrome
      state={state}
      columns={columnDefs}
      labels={resolveLabels(undefined)}
      mobile={mobile}
      slots={slots}
    />
  );
}

function dropZones(): readonly HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="grouping-drop-zone"]'
    ),
  ];
}

/** Drop handlers that accept, and say which boundary answered. */
function recordingDropProps(seen: string[]): GroupingPanelState["dropProps"] {
  return (index: number) => ({
    onDragEnter: (event) => {
      seen.push(`enter:${index}`);
      event.preventDefault();
    },
    onDragOver: (event) => {
      seen.push(`over:${index}`);
      event.preventDefault();
    },
    onDragLeave: () => {
      seen.push(`leave:${index}`);
    },
    onDrop: (event) => {
      seen.push(`drop:${index}`);
      event.preventDefault();
    },
  });
}

describe("GroupingPanelChrome", () => {
  it("adds, reorders, and removes grouping fields through accessible controls", () => {
    const state = panelState();
    mount(state);

    fireEvent.change(
      screen.getByRole("combobox", { name: "Add grouping column" }),
      { target: { value: "budget" } }
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Move Team" }), {
      key: "ArrowRight",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Team from grouping" })
    );

    expect(state.add).toHaveBeenCalledWith("budget");
    expect(state.remove).toHaveBeenCalledWith("team");
    expect(screen.getByLabelText("Row grouping")).toBeInTheDocument();
  });

  it("changes a per-column aggregation and exposes explicit none", () => {
    const state = panelState({
      aggregateOverrides: { budget: "sum" },
    });
    mount(state);

    expect(
      screen.getByRole("combobox", { name: "Group aggregation" })
    ).toHaveValue("sum");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Group aggregation" }),
      { target: { value: "none" } }
    );
    expect(state.setAggregate).toHaveBeenCalledWith("budget", "none");
  });

  it("exposes the drag-to-ungroup target while a chip drag is active", () => {
    mount(
      panelState({
        drag: { key: "team", source: "chip", overRemove: true },
      })
    );
    expect(
      screen.getByLabelText("Drop here to remove grouping")
    ).toBeInTheDocument();
  });

  it("offers only the boundaries that would actually move the dragged chip", () => {
    // Dropping a chip either side of itself lands it where it already is, so
    // those two boundaries do nothing — and they are the two nearest the
    // reader's hand. With three of them dead-or-live, offering the dead ones
    // reads as the drag failing.
    const dropProps = vi.fn((_index: number) => ({
      onDrop: () => undefined,
    }));
    mount(
      panelState({
        groupBy: ["team", "budget", "person"],
        drag: { key: "budget", source: "chip" },
        dropProps: dropProps as unknown as GroupingPanelState["dropProps"],
      })
    );

    // Boundaries 0 and 3 move it; 1 and 2 sit either side of it and cannot.
    // Each is offered twice — once as a caret, once as the chip beside it.
    const asked = [...new Set(dropProps.mock.calls.map(([index]) => index))];
    expect([...asked].sort((a, b) => a - b)).toEqual([0, 3]);
  });

  it("refuses the drop either side of the chip being dragged", () => {
    // A refusal has to reach the browser: a handler that never calls
    // preventDefault is what draws the "no" cursor over a dead boundary.
    mount(
      panelState({
        groupBy: ["team", "budget", "person"],
        drag: { key: "budget", source: "chip" },
        dropProps: recordingDropProps([]),
      })
    );

    const [, beside] = dropZones();
    expect(fireEvent.dragEnter(beside!)).toBe(true);
    expect(fireEvent.dragOver(beside!)).toBe(true);
    expect(fireEvent.dragLeave(beside!)).toBe(true);
    expect(fireEvent.drop(beside!)).toBe(true);
  });

  it("takes a drop on the chip itself, and yields to the caret inside it", () => {
    const seen: string[] = [];
    mount(
      panelState({
        groupBy: ["team", "budget"],
        drag: { key: "person", source: "header" },
        dropProps: recordingDropProps(seen),
      })
    );

    // The chip is the nearest target to the reader's hand.
    fireEvent.dragOver(screen.getByRole("button", { name: "Move Budget" }));
    expect(seen).toEqual(["over:1"]);

    // The caret inside it is the more precise answer, and it answered first.
    seen.length = 0;
    fireEvent.dragOver(dropZones()[1]!);
    expect(seen).toEqual(["over:1"]);
  });

  it("offers every boundary for a field arriving from the header", () => {
    const dropProps = vi.fn((_index: number) => ({
      onDrop: () => undefined,
    }));
    mount(
      panelState({
        groupBy: ["team", "budget"],
        // The field is not in the strip yet, so no boundary is a no-op.
        drag: { key: "person", source: "header" },
        dropProps: dropProps as unknown as GroupingPanelState["dropProps"],
      })
    );

    const asked = [...new Set(dropProps.mock.calls.map(([index]) => index))];
    expect([...asked].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it("reorders chips with keyboard arrows and changes aggregate column", () => {
    const moveBy = vi.fn();
    const state = panelState({
      groupBy: ["team", "budget"],
      aggregateOverrides: { person: "sum" },
      chipKeyboardProps: (key) => ({
        tabIndex: 0,
        role: "button",
        "aria-label": `Move ${key}`,
        onKeyDown: (event) => {
          if (event.key === "ArrowLeft") moveBy(key, -1);
        },
      }),
    });
    mount(state);

    fireEvent.keyDown(screen.getByRole("button", { name: "Move budget" }), {
      key: "ArrowLeft",
    });
    expect(moveBy).toHaveBeenCalledWith("budget", -1);

    fireEvent.change(
      screen.getByRole("combobox", { name: "Aggregate column" }),
      { target: { value: "person" } }
    );
    expect(
      screen.getByRole("combobox", { name: "Group aggregation" })
    ).toHaveValue("sum");
  });

  it("uses select controls instead of drag targets on mobile", () => {
    const { container } = render(
      <GroupingPanelChrome
        state={panelState()}
        columns={columns}
        labels={resolveLabels(undefined)}
        mobile
        slots={slots}
      />
    );
    expect(
      container.querySelector("[data-adapttable-part='grouping-drop-zone']")
    ).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Add grouping column" })
    ).toBeEnabled();
  });

  it("labels unknown keys and disables add when every column is grouped", () => {
    mount(
      panelState({
        groupBy: ["team", "budget", "person"],
      })
    );
    expect(
      screen.getByRole("combobox", { name: "Add grouping column" })
    ).toBeDisabled();
  });

  it("prefers mobile labels for non-string headers", () => {
    mount(panelState({ groupBy: ["code"] }), false, [
      { key: "code", header: null, mobileLabel: "Code label" },
    ]);
    expect(
      screen.getByRole("button", { name: "Move Code label" })
    ).toBeInTheDocument();
  });
});
