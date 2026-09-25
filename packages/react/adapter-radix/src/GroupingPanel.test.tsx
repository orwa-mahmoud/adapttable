import { defaultLabels } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/react";
import type { GroupingPanelState } from "@adapttable/react/adapter";
import { Theme } from "@radix-ui/themes";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GroupingPanel } from "./components/GroupingPanel";
import { DataTable } from "./data-table.test-utils";
import { groupingPanel } from "./grouping-panel";
import { renderRadix } from "./test-utils";

interface Row {
  id: string;
  team: string;
  budget: number;
}

const columns: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "budget", header: "Budget", accessor: (row) => row.budget },
];

function panelState(
  overrides: Partial<GroupingPanelState> = {}
): GroupingPanelState {
  return {
    groupBy: ["team"],
    aggregateOverrides: {},
    canSetAggregates: true,
    announcement: "",
    headerDragProps: () => ({}),
    chipDragProps: () => ({ draggable: true }),
    chipKeyboardProps: (_key, label) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": `Move ${label}`,
      onKeyDown: vi.fn(),
    }),
    dropProps: () => ({}),
    removeDropProps: () => ({}),
    add: vi.fn(),
    remove: vi.fn(),
    moveBy: vi.fn(),
    setAggregate: vi.fn(),
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
          ],
        },
      ],
      candidates: [
        {
          columnKey: "budget",
          active: true,
          operations: [
            { id: "sum", builtIn: true },
            { id: "avg", builtIn: true },
          ],
        },
      ],
      atDefaults: true,
      hasDefaults: true,
    },
    setAggregateOperation: vi.fn(),
    addAggregate: vi.fn(),
    removeAggregate: vi.fn(),
    restoreAggregateDefaults: vi.fn(),
    ...overrides,
  };
}

function mountPanel(
  state = panelState(),
  options: {
    mobile?: boolean;
    dir?: "ltr" | "rtl";
    container?: HTMLElement;
  } = {}
) {
  return renderRadix(
    <GroupingPanel
      state={state}
      columns={columns}
      labels={defaultLabels}
      mobile={options.mobile ?? false}
      dir={options.dir}
      container={options.container}
    />
  );
}

describe("GroupingPanel (radix)", () => {
  it("uses accessible Radix controls to add, reorder, aggregate, and remove", () => {
    const keyboard = vi.fn();
    const state = panelState({
      aggregateOverrides: { budget: "sum" },
      chipKeyboardProps: (_key, label) => ({
        tabIndex: 0,
        role: "button",
        "aria-label": `Move ${label}`,
        onKeyDown: keyboard,
      }),
    });
    mountPanel(state);

    const add = screen.getByRole("combobox", { name: "Add grouping column" });
    fireEvent.click(add);
    fireEvent.click(screen.getByRole("option", { name: "Budget" }));
    expect(state.add).toHaveBeenCalledWith("budget");

    const handle = screen.getByRole("button", { name: "Move Team" });
    expect(handle).toHaveAttribute("draggable", "true");
    expect(handle).toHaveStyle({ minWidth: "44px", minHeight: "44px" });
    expect(
      screen.queryByText(defaultLabels.groupingPanel, { selector: "span" })
    ).not.toBeInTheDocument();
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(keyboard).toHaveBeenCalled();

    const aggregate = screen.getByRole("combobox", {
      name: "Budget aggregation",
    });
    fireEvent.click(aggregate);
    fireEvent.click(screen.getByRole("option", { name: "Average" }));
    expect(state.setAggregateOperation).toHaveBeenCalledWith("budget", "avg");
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Budget aggregation" })
    );
    expect(state.removeAggregate).toHaveBeenCalledWith("budget");

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Team from grouping" })
    );
    expect(state.remove).toHaveBeenCalledWith("team");
  });

  it("adds an aggregation from the picker and restores declared defaults", () => {
    const state = panelState({
      aggregations: {
        items: [
          {
            columnKey: "budget",
            operationId: "avg",
            editable: true,
            origin: "declared",
            operations: [
              { id: "sum", builtIn: true },
              { id: "avg", builtIn: true },
            ],
          },
        ],
        candidates: [
          {
            columnKey: "budget",
            active: true,
            operations: [
              { id: "sum", builtIn: true },
              { id: "avg", builtIn: true },
            ],
          },
          {
            columnKey: "team",
            active: false,
            operations: [{ id: "count", builtIn: true }],
          },
        ],
        atDefaults: false,
        hasDefaults: true,
      },
    });
    mountPanel(state);

    fireEvent.click(
      screen.getByRole("combobox", { name: "Add aggregation column" })
    );
    fireEvent.click(screen.getByRole("option", { name: "Team" }));
    expect(state.addAggregate).toHaveBeenCalledWith("team");

    fireEvent.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(state.restoreAggregateDefaults).toHaveBeenCalled();
  });

  it("keeps insertion and remove targets visibly active during drag", () => {
    const { unmount } = mountPanel(
      panelState({
        groupBy: [],
        drag: { key: "team", source: "header", overIndex: 0 },
      })
    );
    const insertion = document.querySelector<HTMLElement>(
      '[data-adapttable-part="grouping-drop-zone"]'
    )!;
    expect(insertion).toHaveAttribute("data-active", "true");
    expect(insertion.style.minBlockSize).toBe("44px");
    expect(insertion.style.borderColor).toBe("var(--accent-9)");

    unmount();
    mountPanel(
      panelState({
        drag: { key: "team", source: "chip", overRemove: true },
      })
    );
    const remove = document.querySelector<HTMLElement>(
      '[data-adapttable-part="grouping-remove-zone"]'
    )!;
    expect(remove).toHaveAttribute("data-active", "true");
    expect(remove).toHaveTextContent("Drop here to remove grouping");
    expect(remove.style.minBlockSize).toBe("44px");
  });

  it("wraps into touch-sized select controls on mobile without drag targets", () => {
    mountPanel(panelState(), { mobile: true });

    expect(
      document.querySelector('[data-adapttable-part="grouping-panel"]')
    ).toHaveAttribute("data-mobile", "true");
    expect(
      document.querySelector('[data-adapttable-part="grouping-drop-zone"]')
    ).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Add grouping column" })
    ).toHaveStyle({ minHeight: "44px" });
  });

  it("portals choices into the fullscreen container with RTL direction", () => {
    const portal = document.createElement("div");
    document.body.append(portal);
    mountPanel(panelState(), { dir: "rtl", container: portal });

    fireEvent.click(
      screen.getByRole("combobox", { name: "Add grouping column" })
    );
    const option = screen.getByRole("option", { name: "Budget" });
    expect(portal).toContainElement(option);
    expect(option.closest('[dir="rtl"]')).not.toBeNull();
    portal.remove();
  });

  it("owns group headers and wires the panel above the draggable table", () => {
    render(
      <Theme>
        <DataTable<Row>
          data={[
            { id: "1", team: "Core", budget: 10 },
            { id: "2", team: "Web", budget: 20 },
          ]}
          columns={columns}
          rowKey={(row) => row.id}
          urlSync={false}
          enableColumnMenu
          features={[groupingPanel<Row>("team", {})]}
        />
      </Theme>
    );

    expect(
      document.querySelector('[data-adapttable-part="grouping-panel"]')
    ).not.toBeNull();
    expect(
      document.querySelectorAll('[data-adapttable-part="group-row"]')
    ).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "Team" })).toHaveAttribute(
      "draggable",
      "true"
    );

    const panel = document.querySelector(
      '[data-adapttable-part="grouping-panel"]'
    );
    const table = document.querySelector('[data-adapttable-part="table"]');
    expect(
      panel!.compareDocumentPosition(table!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
