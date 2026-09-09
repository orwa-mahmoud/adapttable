import type { UseColumnLayoutResult } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/react";
import {
  featureHostOf,
  FeatureHostProvider,
  type GroupingPanelState,
  useTableFeatures,
} from "@adapttable/react/adapter";
import type { TableFeature } from "@adapttable/react/features";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnMenu } from "./components/ColumnMenu";
import { renderChakra } from "./test-utils";

interface Row {
  id: string;
}
const cols: ColumnDef<Row>[] = [
  { key: "a", header: "Alpha", accessor: (r) => r.id, renameable: true },
  { key: "b", header: "Bravo", accessor: (r) => r.id },
  { key: "c", header: "Charlie", accessor: (r) => r.id },
];

function fakeLayout(): UseColumnLayoutResult<Row> {
  return {
    state: { hidden: [], order: [], pinned: { a: "start" }, widths: {} },
    visibleColumns: cols,
    isHidden: () => false,
    setHidden: vi.fn(),
    toggleVisible: vi.fn(),
    setPinned: vi.fn(),
    move: vi.fn(),
    setWidth: vi.fn(),
    setName: vi.fn(),
    resetName: vi.fn(),
    pinOffset: () => undefined,
    reset: vi.fn(),
    toggleColumnGroup: vi.fn(),
  };
}

const labels = {
  columns: "Columns",
  pinStart: "Pin to start",
  pinEnd: "Pin to end",
  unpin: "Unpin",
  moveStart: "Move to start",
  moveEnd: "Move to end",
  resetColumns: "Reset columns",
  autoSizeColumns: "Size columns to content",
  autoSizeColumn: "Size column to content",
  showColumn: "Show column",
  hideColumn: "Hide column",
  searchColumns: "Search columns",
  showAllColumns: "Show all",
  hideAllColumns: "Hide all",
  unpinAllColumns: "Unpin all",
  resetColumn: "Reset column",
  renameColumn: "Rename column",
  columnName: "Column name",
  saveColumnName: "Save name",
  cancelColumnRename: "Cancel",
  columnNameRequired: "Column name is required",
  columnRenamed: ({ previous, name }: { previous: string; name: string }) =>
    `${previous} renamed to ${name}`,
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  filterColumn: "Filter column",
  columnActions: "Column actions",
  actions: "Actions",
  reorderRow: "Reorder",
  groupByColumn: (label: string) => `Group by ${label}`,
  ungroupColumn: (label: string) => `Ungroup ${label}`,
  groupingAggregation: "Group aggregation",
  groupingRemoveAggregation: (name: string) => `Remove ${name} aggregation`,
  groupingAverage: "Average",
  selectionCount: "Count",
  selectionSum: "Sum",
  selectionMin: "Minimum",
  selectionMax: "Maximum",
};

const byLabel = (name: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;

function groupingState(): GroupingPanelState {
  return {
    groupBy: ["b"],
    aggregateOverrides: {},
    canSetAggregates: true,
    announcement: "",
    headerDragProps: () => ({}),
    chipDragProps: () => ({}),
    chipKeyboardProps: () => ({
      tabIndex: 0,
      role: "button",
      "aria-label": "Move grouping",
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
  };
}

function ChoiceMenu({
  onChange,
}: Readonly<{ onChange: (value: string) => void }>) {
  const choiceFeature: TableFeature<Row> = {
    id: "column-choice-test",
    setup(host) {
      host.registerColumnMenuAction((_row, context) =>
        context.groupingPanel
          ? {
              kind: "choice",
              id: "aggregation-test",
              label: "Group aggregation",
              disabled: false,
              value: "",
              options: [
                { value: "", label: "Default" },
                { value: "sum", label: "Sum" },
              ],
              onChange,
            }
          : undefined
      );
    },
  };
  const props = useTableFeatures({ features: [choiceFeature] });
  return (
    <FeatureHostProvider host={featureHostOf(props)}>
      <ColumnMenu
        allColumns={cols}
        layout={fakeLayout()}
        labels={labels}
        onAutoSize={() => undefined}
        groupingPanel={groupingState()}
      />
    </FeatureHostProvider>
  );
}

describe("chakra ColumnMenu", () => {
  it("shows drop-position feedback while dragging a row", async () => {
    const layout = fakeLayout();
    renderChakra(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    const dt = {
      data: new Map<string, string>(),
      effectAllowed: "",
      dropEffect: "",
      get types() {
        return [...this.data.keys()];
      },
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      getData(type: string) {
        return this.data.get(type) ?? "";
      },
    };
    const rowOf = (name: string) =>
      screen.getByText(name).closest("[draggable]")!;
    fireEvent.dragStart(rowOf("Alpha"), { dataTransfer: dt });
    fireEvent.dragOver(rowOf("Charlie"), { dataTransfer: dt });
    // The source dims; the hovered target marks its landing edge.
    expect(rowOf("Alpha")).toHaveAttribute("data-dragging");
    expect(rowOf("Charlie")).toHaveAttribute("data-drop", "after");
    fireEvent.drop(rowOf("Charlie"), { dataTransfer: dt });
    expect(layout.move).toHaveBeenCalledWith("a", 2);
    expect(rowOf("Alpha")).not.toHaveAttribute("data-dragging");
    expect(rowOf("Charlie")).not.toHaveAttribute("data-drop");

    // Reverse drag: hovering an EARLIER row marks the "before" edge.
    fireEvent.dragStart(rowOf("Charlie"), { dataTransfer: dt });
    fireEvent.dragOver(rowOf("Alpha"), { dataTransfer: dt });
    expect(rowOf("Alpha")).toHaveAttribute("data-drop", "before");
    fireEvent.dragEnd(rowOf("Charlie"), { dataTransfer: dt });
    expect(rowOf("Alpha")).not.toHaveAttribute("data-drop");
  });

  it("toggles visibility, pins, reorders, and resets", async () => {
    const layout = fakeLayout();
    renderChakra(
      <ColumnMenu
        allColumns={cols}
        layout={layout}
        labels={labels}
        onAutoSize={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // visibility via the eye control (aria-label is the column name)
    fireEvent.click(byLabel("Hide column: Bravo"));
    expect(layout.toggleVisible).toHaveBeenCalledWith("b");

    // pin toggle: a is pinned to start → next click unpins; b is unpinned → pins to start
    fireEvent.click(byLabel("Unpin: Alpha"));
    expect(layout.setPinned).toHaveBeenCalledWith("a", undefined);
    fireEvent.click(byLabel("Pin to start: Bravo"));
    expect(layout.setPinned).toHaveBeenCalledWith("b", "start");

    // reorder via grip keyboard
    fireEvent.keyDown(byLabel("Move to start / Move to end: Alpha"), {
      key: "ArrowRight",
    });
    expect(layout.move).toHaveBeenCalledWith("a", 1);

    fireEvent.click(screen.getByText("Reset columns"));
    expect(layout.reset).toHaveBeenCalled();
  });

  it("lists the actions column with an eye toggle and a one-click end pin", async () => {
    const layout = fakeLayout();
    renderChakra(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={layout}
        labels={labels}
        hasRowActions
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // The trailing entry is listed by its display name, visible by default.
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(byLabel("Hide column: Actions")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(byLabel("Hide column: Actions"));
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");

    // Unpinned → ONE click pins straight to the inline end (never left).
    fireEvent.click(byLabel("Pin to end: Actions"));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", "end");
  });

  it("unpins end-pinned actions in one click and marks them hidden", async () => {
    const layout = fakeLayout();
    layout.state = {
      ...layout.state,
      pinned: { ...layout.state.pinned, actions: "end" },
    };
    layout.isHidden = (key) => key === "actions";
    renderChakra(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={layout}
        labels={labels}
        hasRowActions
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // Hidden → the eye flips to "show" and reads not-pressed.
    expect(byLabel("Show column: Actions")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    // Pinned → ONE click unpins (the right↔unpinned toggle, no cycle).
    fireEvent.click(byLabel("Unpin: Actions"));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", undefined);
  });

  it("lists a leading reorder row with an eye and a start pin", async () => {
    const layout = fakeLayout();
    renderChakra(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={layout}
        labels={labels}
        hasRowReorder
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    expect(screen.getByText("Reorder")).toBeInTheDocument();
    fireEvent.click(byLabel("Hide column: Reorder"));
    expect(layout.toggleVisible).toHaveBeenCalledWith("reorder");
    fireEvent.click(byLabel("Pin to start: Reorder"));
    expect(layout.setPinned).toHaveBeenCalledWith("reorder", "start");
  });

  it("filters the chooser by the search box", async () => {
    renderChakra(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={fakeLayout()}
        labels={labels}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.change(
      document.querySelector('[data-adapttable-part="column-menu-search"]')!,
      { target: { value: "bravo" } }
    );
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("renames a data column with Chakra controls and announces it", async () => {
    const onRenameColumn = vi.fn();
    renderChakra(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={fakeLayout()}
        labels={labels}
        onRenameColumn={onRenameColumn}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(byLabel("Column actions: Alpha"));

    const renameAction = screen.getByRole("button", {
      name: "Rename column",
    });
    fireEvent.click(renameAction);
    expect(renameAction).toBeDisabled();

    const input = screen.getByRole("textbox", { name: "Column name" });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: " " } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Column name is required"
    );

    fireEvent.change(input, { target: { value: "  Account owner  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(onRenameColumn).toHaveBeenCalledWith("a", "Account owner");
    expect(
      document.querySelector('[data-adapttable-part="column-rename-announcer"]')
    ).toHaveTextContent("Alpha renamed to Account owner");
    expect(
      document.querySelector('[data-adapttable-part="column-rename-form"]')
    ).toBeNull();
    const restoredAction = screen.getByRole("button", {
      name: "Rename column",
    });
    expect(restoredAction).toBeEnabled();

    restoredAction.focus();
    fireEvent.click(restoredAction);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(restoredAction).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Reset column" }));
    expect(screen.queryByRole("button", { name: "Rename column" })).toBeNull();
  });

  it("does not offer rename without the host callback", async () => {
    renderChakra(
      <ColumnMenu
        allColumns={cols}
        onAutoSize={() => undefined}
        layout={fakeLayout()}
        labels={labels}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(byLabel("Column actions: Alpha"));
    expect(screen.queryByRole("button", { name: "Rename column" })).toBeNull();
  });

  it("copies the host dark class onto the portalled columns card", async () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <div className="dark">
          <ColumnMenu
            allColumns={cols}
            onAutoSize={() => undefined}
            layout={fakeLayout()}
            labels={labels}
          />
        </div>
      </ChakraProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    expect(
      document.querySelector('[data-adapttable-color-mode="dark"]')
    ).not.toBeNull();
  });

  it("renders plugin choices as labelled selects without closing", async () => {
    const onChange = vi.fn();
    renderChakra(<ChoiceMenu onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(byLabel("Column actions: Alpha"));
    const choice = screen.getByRole("combobox", {
      name: "Group aggregation",
    });
    fireEvent.change(choice, { target: { value: "sum" } });

    expect(onChange).toHaveBeenCalledWith("sum");
    expect(choice).toBeInTheDocument();
  });
});
