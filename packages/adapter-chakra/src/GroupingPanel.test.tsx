import { resolveLabels } from "@adapttable/core";
import type { GroupingPanelState } from "@adapttable/react/adapter";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GroupingPanel } from "./components/GroupingPanel";
import { renderChakra } from "./test-utils";

const columns = [
  { key: "team", header: "Team" },
  { key: "budget", header: "Budget" },
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
      items: [],
      candidates: [],
      atDefaults: true,
      hasDefaults: false,
    },
    setAggregateOperation: vi.fn(),
    addAggregate: vi.fn(),
    removeAggregate: vi.fn(),
    restoreAggregateDefaults: vi.fn(),
    ...overrides,
  };
}

describe("Chakra GroupingPanel", () => {
  it("uses labelled controls to add and remove grouping fields", () => {
    const state = panelState();
    renderChakra(
      <GroupingPanel
        state={state}
        columns={columns}
        labels={resolveLabels(undefined)}
        mobile={false}
      />
    );

    const handle = screen.getByRole("button", { name: "Move Team" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Team from grouping" })
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Add grouping column" }),
      { target: { value: "budget" } }
    );

    expect(state.remove).toHaveBeenCalledWith("team");
    expect(state.add).toHaveBeenCalledWith("budget");
  });

  it("edits aggregations and restores declared defaults", () => {
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
    renderChakra(
      <GroupingPanel
        state={state}
        columns={columns}
        labels={resolveLabels(undefined)}
        mobile={false}
      />
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Budget aggregation" }),
      { target: { value: "avg" } }
    );
    expect(state.setAggregateOperation).toHaveBeenCalledWith("budget", "avg");
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Budget aggregation" })
    );
    expect(state.removeAggregate).toHaveBeenCalledWith("budget");

    fireEvent.change(
      screen.getByRole("combobox", { name: "Add aggregation column" }),
      { target: { value: "team" } }
    );
    expect(state.addAggregate).toHaveBeenCalledWith("team");

    fireEvent.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(state.restoreAggregateDefaults).toHaveBeenCalled();
  });

  it("shows active insertion and drop-to-remove states", () => {
    const state = panelState({
      groupBy: ["team", "budget"],
      drag: {
        key: "budget",
        source: "chip",
        overIndex: 0,
        overRemove: true,
      },
      dropProps: () => ({ "data-drop-active": true }),
      removeDropProps: () => ({ "data-drop-active": true }),
    });
    renderChakra(
      <GroupingPanel
        state={state}
        columns={columns}
        labels={resolveLabels(undefined)}
        mobile={false}
      />
    );

    expect(
      document.querySelector(
        '[data-adapttable-part="grouping-drop-zone"][data-drop-active="true"]'
      )
    ).not.toBeNull();
    expect(
      screen.getByRole("region", { name: "Drop here to remove grouping" })
    ).toHaveAttribute("data-drop-active", "true");
  });
});
