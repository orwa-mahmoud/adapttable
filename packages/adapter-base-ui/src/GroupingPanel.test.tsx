import { defaultLabels } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/react";
import type { GroupingPanelState } from "@adapttable/react/adapter";
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { columnMenu } from "./column-menu";
import { GroupingPanel } from "./components/GroupingPanel";
import { DataTable } from "./DataTable";
import { groupingPanel } from "./grouping-panel";
import { renderBaseUi } from "./test-utils";

interface Row {
  id: string;
  team: string;
  amount: number;
}

const columns: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "amount", header: "Amount", accessor: (row) => row.amount },
];
const rows: Row[] = [
  { id: "1", team: "Core", amount: 10 },
  { id: "2", team: "Platform", amount: 20 },
];

function panelState(
  overrides: Partial<GroupingPanelState> = {}
): GroupingPanelState {
  return {
    groupBy: ["team"],
    aggregateOverrides: {},
    canSetAggregates: true,
    drag: undefined,
    announcement: "",
    headerDragProps: () => ({ draggable: true }),
    chipDragProps: () => ({ draggable: true }),
    chipKeyboardProps: (_key, label) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": defaultLabels.moveGroupingColumn(label),
      onKeyDown: vi.fn(),
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

function renderPanel(state = panelState(), mobile = false) {
  renderBaseUi(
    <GroupingPanel
      state={state}
      columns={columns}
      labels={defaultLabels}
      mobile={mobile}
    />
  );
}

describe("GroupingPanel (base-ui)", () => {
  it("renders kit controls with accessible move and remove actions", () => {
    const onMoveKey = vi.fn();
    const state = panelState({
      chipKeyboardProps: (_key, label) => ({
        tabIndex: 0,
        role: "button",
        "aria-label": defaultLabels.moveGroupingColumn(label),
        onKeyDown: onMoveKey,
      }),
    });
    renderPanel(state);

    expect(
      screen.getByRole("region", { name: defaultLabels.groupingPanel })
    ).toBeInTheDocument();
    const handle = screen.getByRole("button", {
      name: defaultLabels.moveGroupingColumn("Team"),
    });
    expect(handle).toHaveAttribute("draggable", "true");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onMoveKey).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole("button", {
        name: defaultLabels.removeGroupingColumn("Team"),
      })
    );
    expect(state.remove).toHaveBeenCalledWith("team");
  });

  it("shows insertion feedback and the remove target during chip dragging", () => {
    // Three fields, dragging the last: the boundaries either side of it would
    // leave it where it is, so the ones that CAN take it are the two ahead.
    const state = panelState({
      groupBy: ["team", "status", "budget"],
      drag: {
        key: "budget",
        source: "chip",
        overIndex: 1,
        overRemove: true,
      },
      dropProps: (index) => ({
        "data-drop-active": index === 1,
      }),
      removeDropProps: () => ({ "data-drop-active": true }),
    });
    renderPanel(state);

    const drops = document.querySelectorAll(
      '[data-adapttable-part="grouping-drop-zone"]'
    );
    expect(drops).toHaveLength(4);
    expect(drops[1]).toHaveAttribute("data-drop-active", "true");
    expect(
      screen.getByText(defaultLabels.groupingDropToRemove)
    ).toHaveAttribute("data-drop-active", "true");
  });

  it("uses the wrapped mobile surface and hides drag-only insertion targets", () => {
    renderPanel(panelState(), true);

    expect(
      document.querySelector('[data-adapttable-part="grouping-panel"]')
    ).toHaveAttribute("data-mobile", "true");
    expect(
      document.querySelector('[data-adapttable-part="grouping-drop-zone"]')
    ).toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="grouping-add"]')
    ).not.toBeNull();
  });
});

describe("groupingPanel feature (base-ui)", () => {
  function renderTable() {
    renderBaseUi(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        features={[columnMenu(), groupingPanel(["team"])]}
      />
    );
  }

  it("owns the group headers and renders the panel before the table", () => {
    renderTable();

    const panel = document.querySelector(
      '[data-adapttable-part="grouping-panel"]'
    )!;
    const table = screen.getByRole("table");
    expect(
      panel.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      document.querySelector('[data-adapttable-part="group-row"]')
    ).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: /Team/ })).toHaveAttribute(
      "draggable",
      "true"
    );
  });

  it("renders grouping choices in the column menu without closing it", async () => {
    renderTable();
    fireEvent.click(
      screen.getByRole("button", { name: defaultLabels.columns })
    );
    await screen.findByText(defaultLabels.resetColumns);
    fireEvent.click(
      screen.getByRole("button", {
        name: `${defaultLabels.columnActions}: Amount`,
      })
    );

    const submenu = document.querySelector(
      '[data-adapttable-part="column-menu-submenu"]'
    );
    expect(submenu).not.toBeNull();
    const choice = within(submenu as HTMLElement).getByRole("combobox", {
      name: defaultLabels.groupingAggregation,
    });
    fireEvent.click(choice);
    fireEvent.click(
      await screen.findByRole("option", { name: defaultLabels.selectionSum })
    );

    expect(
      within(submenu as HTMLElement).getByRole("combobox", {
        name: defaultLabels.groupingAggregation,
      })
    ).toBeInTheDocument();
  });
});
