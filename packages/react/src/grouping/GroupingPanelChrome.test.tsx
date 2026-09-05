import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resolveLabels } from "@adapttable/core";
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
import type { GroupingPanelState } from "@adapttable/core";

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
    <div
      aria-label={label}
      {...(dropProps as HTMLAttributes<HTMLDivElement>)}
      {...props}
    />
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
      <button
        type="button"
        {...(dragProps as ButtonHTMLAttributes<HTMLButtonElement>)}
        {...(keyboardProps as unknown as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
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
    <div
      aria-label={label}
      {...(dropProps as HTMLAttributes<HTMLDivElement>)}
      {...props}
    />
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
