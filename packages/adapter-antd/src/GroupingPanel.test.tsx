import { defaultLabels } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/react";
import type {
  GroupingPanelSlotProps,
  GroupingPanelState,
} from "@adapttable/react/adapter";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GroupingPanel } from "./components/GroupingPanel";
import { renderAntd } from "./test-utils";

interface Row {
  team: string;
  amount: number;
}

const columns: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "amount", header: "Amount", accessor: (row) => row.amount },
];

function panelState() {
  const remove = vi.fn();
  const moveBy = vi.fn();
  const state: GroupingPanelState = {
    groupBy: ["team"],
    aggregateOverrides: {},
    canSetAggregates: true,
    announcement: "",
    headerDragProps: () => ({ draggable: true }),
    chipDragProps: () => ({ draggable: true }),
    chipKeyboardProps: (key, label) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": defaultLabels.moveGroupingColumn(label),
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") moveBy(key, 1);
      },
    }),
    dropProps: () => ({}),
    removeDropProps: () => ({ "data-drop-active": true }),
    add: vi.fn(),
    remove,
    moveBy,
    setAggregate: vi.fn(),
  };
  return { state, remove, moveBy };
}

function props(
  state: GroupingPanelState,
  mobile = false
): GroupingPanelSlotProps<Row> {
  return { state, columns, labels: defaultLabels, mobile };
}

describe("GroupingPanel (antd)", () => {
  it("renders visible kit-owned drop targets and accessible chip controls", () => {
    const { state, remove, moveBy } = panelState();
    renderAntd(<GroupingPanel {...props(state)} />);

    expect(
      document.querySelector('[data-adapttable-part="grouping-panel"]')
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Row grouping" })
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-adapttable-part="grouping-drop-zone"]')
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("group", { name: "Drag columns here to group" })
    ).toHaveLength(2);

    const handle = screen.getByRole("button", {
      name: "Move Team grouping",
    });
    expect(handle).toHaveAttribute("draggable", "true");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(moveBy).toHaveBeenCalledWith("team", 1);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Team from grouping",
      })
    );
    expect(remove).toHaveBeenCalledWith("team");
  });

  it("wraps for mobile and replaces drag targets with add/remove controls", () => {
    const { state } = panelState();
    renderAntd(<GroupingPanel {...props(state, true)} />);

    expect(document.querySelector('[data-mobile="true"]')).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="grouping-drop-zone"]')
    ).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Add grouping column" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Remove Team from grouping",
      })
    ).toHaveStyle({ minHeight: "40px" });
  });

  it("shows a visible removal target during a chip drag", () => {
    const { state } = panelState();
    state.drag = { key: "team", source: "chip", overRemove: true };
    renderAntd(<GroupingPanel {...props(state)} />);

    const removeZone = document.querySelector(
      '[data-adapttable-part="grouping-remove-zone"]'
    );
    expect(removeZone).toBeVisible();
    expect(removeZone).toHaveAttribute("data-drop-active");
    expect(removeZone).toHaveTextContent("Drop here to remove grouping");
  });
});
