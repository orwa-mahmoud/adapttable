import { type GroupingPanelState, resolveLabels } from "@adapttable/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";

type AnyColumn = ColumnDef<unknown>;

import {
  type GroupingPanelAggregationItemProps,
  type GroupingPanelAggregationRemoveProps,
  type GroupingPanelChecklistProps,
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelRestoreProps,
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
  AggregationItem: ({
    label,
    readOnly,
    readOnlyLabel,
    children,
    ...props
  }: GroupingPanelAggregationItemProps) => (
    <span data-read-only={readOnly || undefined} {...props}>
      <span>{label}</span>
      {readOnly ? <span>{readOnlyLabel}</span> : children}
    </span>
  ),
  AggregationRemove: ({
    label,
    onRemove,
    ...props
  }: GroupingPanelAggregationRemoveProps) => (
    <button type="button" aria-label={label} onClick={onRemove} {...props}>
      {"x"}
    </button>
  ),
  AggregationPicker: ({
    label,
    options,
    onToggle,
    disabled,
    ...props
  }: GroupingPanelChecklistProps) => (
    <fieldset aria-label={label} {...props}>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="checkbox"
            aria-label={option.label}
            checked={option.checked}
            disabled={disabled}
            onChange={(event) => onToggle(option.value, event.target.checked)}
            data-adapttable-part="grouping-aggregation-option"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  ),
  AggregationRestore: ({
    label,
    disabled,
    onRestore,
    ...props
  }: GroupingPanelRestoreProps) => (
    <button type="button" disabled={disabled} onClick={onRestore} {...props}>
      {label}
    </button>
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
    aggregations: { items: [], candidates: [], atDefaults: true },
    setAggregateOperation: vi.fn(),
    addAggregate: vi.fn(),
    removeAggregate: vi.fn(),
    restoreAggregateDefaults: vi.fn(),
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

  it("shows every active aggregation, its operation, and its way out", () => {
    const state = panelState({
      aggregations: {
        items: [
          {
            columnKey: "budget",
            operationId: "sum",
            editable: true,
            origin: "declared",
            operations: [
              { id: "sum", builtIn: true },
              { id: "avg", builtIn: true },
              { id: "median", builtIn: false, label: "Median" },
            ],
          },
          {
            columnKey: "person",
            editable: false,
            origin: "host",
            operations: [],
          },
        ],
        candidates: [
          {
            columnKey: "budget",
            active: true,
            operations: [{ id: "sum", builtIn: true }],
          },
          {
            columnKey: "load",
            active: false,
            operations: [{ id: "avg", builtIn: true }],
          },
        ],
        atDefaults: true,
      },
    });
    mount(state);

    // The active aggregation names its column and its actual operation —
    // nothing has to be discovered by pointing a picker somewhere.
    const operation = screen.getByRole("combobox", {
      name: "Budget aggregation",
    });
    expect(operation).toHaveValue("sum");
    // Only what this column offers, the host's own operation included, and
    // no "Default": a column is aggregated with an operation, or not at all.
    expect(
      [...operation.querySelectorAll("option")].map((option) => option.value)
    ).toEqual(["sum", "avg", "median"]);
    expect(screen.getByText("Median")).toBeInTheDocument();

    fireEvent.change(operation, { target: { value: "avg" } });
    expect(state.setAggregateOperation).toHaveBeenCalledWith("budget", "avg");

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Budget aggregation" })
    );
    expect(state.removeAggregate).toHaveBeenCalledWith("budget");

    // The app's own aggregate says who owns it, and offers nothing to press.
    expect(screen.getByText("Set by the app")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Person aggregation" })
    ).not.toBeInTheDocument();
  });

  it("keeps the picker and the remove control saying the same thing", () => {
    const state = panelState({
      aggregations: {
        items: [
          {
            columnKey: "budget",
            operationId: "sum",
            editable: true,
            origin: "declared",
            operations: [{ id: "sum", builtIn: true }],
          },
        ],
        candidates: [
          {
            columnKey: "budget",
            active: true,
            operations: [{ id: "sum", builtIn: true }],
          },
          {
            columnKey: "load",
            active: false,
            operations: [{ id: "avg", builtIn: true }],
          },
        ],
        atDefaults: true,
      },
    });
    mount(state);

    const budget = screen.getByRole("checkbox", { name: "Budget" });
    const load = screen.getByRole("checkbox", { name: "load" });
    expect(budget).toBeChecked();
    expect(load).not.toBeChecked();

    // Unchecking is the same act as pressing the item's own remove control.
    fireEvent.click(budget);
    expect(state.removeAggregate).toHaveBeenCalledWith("budget");
    fireEvent.click(load);
    expect(state.addAggregate).toHaveBeenCalledWith("load");

    // Nothing to put back while the declared setup is what is on screen.
    const restore = screen.getByRole("button", { name: "Restore defaults" });
    expect(restore).toBeDisabled();
  });

  it("offers to restore the declared setup once a reader has changed it", () => {
    const state = panelState({
      aggregations: {
        items: [],
        candidates: [
          {
            columnKey: "budget",
            active: false,
            operations: [{ id: "sum", builtIn: true }],
          },
        ],
        atDefaults: false,
      },
    });
    mount(state);

    const restore = screen.getByRole("button", { name: "Restore defaults" });
    expect(restore).toBeEnabled();
    fireEvent.click(restore);
    expect(state.restoreAggregateDefaults).toHaveBeenCalled();
  });

  it("moves focus to the next remaining remove after an item is taken away", async () => {
    function Harness() {
      const [keys, setKeys] = useState(["budget", "load"]);
      const items = keys.map((columnKey) => ({
        columnKey,
        operationId: columnKey === "budget" ? "sum" : "avg",
        editable: true,
        origin: "reader" as const,
        operations: [
          { id: columnKey === "budget" ? "sum" : "avg", builtIn: true },
        ],
      }));
      return (
        <GroupingPanelChrome
          state={panelState({
            aggregations: {
              items,
              candidates: keys.map((columnKey) => ({
                columnKey,
                active: true,
                operations: [{ id: "sum", builtIn: true }],
              })),
              atDefaults: false,
            },
            removeAggregate: (key) =>
              setKeys((current) => current.filter((entry) => entry !== key)),
          })}
          columns={[
            { key: "team", header: "Team" },
            { key: "budget", header: "Budget" },
            { key: "load", header: "Load" },
          ]}
          labels={resolveLabels(undefined)}
          mobile={false}
          slots={slots}
        />
      );
    }
    render(<Harness />);
    const removeBudget = screen.getByRole("button", {
      name: "Remove Budget aggregation",
    });
    removeBudget.focus();
    fireEvent.click(removeBudget);
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Remove Load aggregation" })
      );
    });
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

  it("opens the drag-to-ungroup line below the chips, never above them", () => {
    // The target appears the instant a chip leaves the strip. On a line above
    // the chips it moves the one under the pointer, and a drag whose source is
    // pulled away as it starts never begins — so the line that opens has to be
    // one no chip sits below.
    mount(
      panelState({
        groupBy: ["team", "budget", "person"],
        drag: { key: "team", source: "chip" },
      })
    );
    const zone = screen.getByLabelText("Drop here to remove grouping");
    for (const name of ["Move Team", "Move Budget", "Move Person"]) {
      const chip = screen.getByRole("button", { name });
      expect(
        chip.compareDocumentPosition(zone) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });

  it("leaves a column the host closed to grouping out of the panel", () => {
    const closed = [
      { key: "team", header: "Team" },
      { key: "budget", header: "Budget", groupable: false },
    ] as unknown as AnyColumn[];
    render(
      <GroupingPanelChrome
        state={panelState({ groupBy: [] })}
        columns={closed}
        labels={resolveLabels(undefined)}
        mobile={false}
        slots={slots}
      />
    );

    const options = [
      ...screen
        .getByRole("combobox", { name: "Add grouping column" })
        .querySelectorAll("option"),
    ].map((option) => option.textContent);
    expect(options).toContain("Team");
    expect(options).not.toContain("Budget");
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

  it("reorders chips with keyboard arrows", () => {
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
