import type { UseColumnLayoutResult } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/react";
import {
  featureHostOf,
  FeatureHostProvider,
  type GroupingPanelState,
  useTableFeatures,
} from "@adapttable/react/adapter";
import type { TableFeature } from "@adapttable/react/features";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ColumnMenu } from "./components/ColumnMenu";

interface Row {
  id: string;
}
const cols: ColumnDef<Row>[] = [
  { key: "a", header: "Alpha", accessor: (r) => r.id },
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
  actions: "Actions",
  reorderRow: "Reorder",
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
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  filterColumn: "Filter column",
  columnActions: "Column actions",
  renameColumn: "Rename column",
  columnName: "Column name",
  saveColumnName: "Save",
  cancelColumnRename: "Cancel",
  columnNameRequired: "Enter a column name.",
  columnRenamed: ({ previous, name }: { previous: string; name: string }) =>
    `${previous} renamed to ${name}.`,
  groupByColumn: (label: string) => `Group by ${label}`,
  ungroupColumn: (label: string) => `Ungroup ${label}`,
  groupingAggregation: "Group aggregation",
  groupingAggregationNone: "None",
  groupingRemoveAggregation: (name: string) => `Remove ${name} aggregation`,
  groupingAverage: "Average",
  selectionCount: "Count",
  selectionSum: "Sum",
  selectionMin: "Minimum",
  selectionMax: "Maximum",
};

// Mantine renders the dropdown in a portal whose buttons testing-library's
// role query treats as hidden mid-transition; query by aria-label directly.
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

describe("mantine ColumnMenu", () => {
  it("shows drop-position feedback while dragging a row", async () => {
    const user = userEvent.setup();
    const layout = fakeLayout();
    render(
      <MantineProvider>
        <ColumnMenu
          allColumns={cols}
          layout={layout}
          labels={labels}
          onAutoSize={() => undefined}
        />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
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
    const user = userEvent.setup();
    const layout = fakeLayout();
    render(
      <MantineProvider>
        <ColumnMenu
          allColumns={cols}
          layout={layout}
          labels={labels}
          onAutoSize={() => undefined}
        />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
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

    // Without hasRowActions the menu never lists the actions column.
    expect(screen.queryByText("Actions")).toBeNull();
  });

  it("lists the actions column with eye + one-click end-pin toggles", async () => {
    const user = userEvent.setup();
    const layout = fakeLayout();
    render(
      <MantineProvider>
        <ColumnMenu
          allColumns={cols}
          onAutoSize={() => undefined}
          layout={layout}
          labels={labels}
          hasRowActions
        />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    // The actions row gets the same eye toggle as data rows…
    const eye = byLabel("Hide column: Actions");
    expect(eye).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(eye);
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");

    // …and a pin toggle that pins to the inline end in ONE click — no
    // left-pin stop in the cycle.
    fireEvent.click(byLabel("Pin to end: Actions"));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", "end");

    // No drag grip and no draggable row: the actions column always trails.
    expect(
      document.querySelector(
        '[aria-label="Move to start / Move to end: Actions"]'
      )
    ).toBeNull();
    expect(screen.getByText("Actions").closest("[draggable]")).toBeNull();
  });

  it("unpins a pinned actions column and re-shows a hidden one", async () => {
    const user = userEvent.setup();
    const layout = fakeLayout();
    layout.state = {
      hidden: ["actions"],
      order: [],
      pinned: { actions: "end" },
      widths: {},
    };
    layout.isHidden = (key) => key === "actions";
    render(
      <MantineProvider>
        <ColumnMenu
          allColumns={cols}
          onAutoSize={() => undefined}
          layout={layout}
          labels={labels}
          hasRowActions
        />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");

    const eye = byLabel("Show column: Actions");
    expect(eye).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(eye);
    expect(layout.toggleVisible).toHaveBeenCalledWith("actions");

    // Pinned → one click unpins (right ↔ none, nothing in between).
    fireEvent.click(byLabel("Unpin: Actions"));
    expect(layout.setPinned).toHaveBeenCalledWith("actions", undefined);
  });

  it("lists a leading reorder row with an eye and a start pin", async () => {
    const user = userEvent.setup();
    const layout = fakeLayout();
    render(
      <MantineProvider>
        <ColumnMenu
          allColumns={cols}
          layout={layout}
          labels={labels}
          hasRowReorder
          onAutoSize={() => undefined}
        />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    expect(screen.getByText("Reorder")).toBeInTheDocument();
    fireEvent.click(byLabel("Hide column: Reorder"));
    expect(layout.toggleVisible).toHaveBeenCalledWith("reorder");
    fireEvent.click(byLabel("Pin to start: Reorder"));
    expect(layout.setPinned).toHaveBeenCalledWith("reorder", "start");
  });

  // Regression: the menu portals to <body>, so it does not inherit the
  // table's direction. Under an Arabic locale the grip and pin controls
  // stayed on the LTR sides while the table itself mirrored. Only Chakra
  // passed `dir` through; the rest silently dropped it.
  it("filters the chooser by the search box", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <ColumnMenu
          allColumns={cols}
          layout={fakeLayout()}
          labels={labels}
          onAutoSize={() => undefined}
        />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.change(
      document.querySelector('[data-adapttable-part="column-menu-search"]')!,
      { target: { value: "bravo" } }
    );
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("forwards dir to the portalled menu", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <ColumnMenu
          allColumns={cols}
          onAutoSize={() => undefined}
          layout={fakeLayout()}
          labels={labels}
          dir="rtl"
        />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    const reset = await screen.findByText("Reset columns");
    expect(reset.closest('[dir="rtl"]')).not.toBeNull();
  });

  it("renames inline with validation, announcements, and focus restoration", async () => {
    const user = userEvent.setup();
    const layout = fakeLayout();
    const onRenameColumn = vi.fn();
    const renameableColumns = [
      { ...cols[0]!, renameable: true },
      cols[1]!,
      cols[2]!,
    ];
    render(
      <MantineProvider>
        <ColumnMenu
          allColumns={renameableColumns}
          layout={layout}
          labels={labels}
          onAutoSize={() => undefined}
          onRenameColumn={onRenameColumn}
        />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(byLabel("Column actions: Alpha"));

    const renameAction = screen.getByText("Rename column").closest("button")!;
    await user.click(renameAction);
    expect(renameAction).toBeDisabled();

    const input = document.querySelector<HTMLInputElement>(
      '[data-adapttable-part="column-rename-input"]'
    )!;
    expect(input).toHaveAttribute(
      "data-adapttable-part",
      "column-rename-input"
    );
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    const error = document.querySelector<HTMLElement>(
      '[data-adapttable-part="column-rename-error"]'
    )!;
    expect(error).toHaveTextContent("Enter a column name.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);

    fireEvent.change(input, { target: { value: "  Account owner  " } });
    expect(
      document.querySelector('[data-adapttable-part="column-rename-error"]')
    ).toBeNull();
    await user.click(
      document.querySelector<HTMLButtonElement>(
        '[data-adapttable-part="column-rename-save"]'
      )!
    );
    expect(onRenameColumn).toHaveBeenCalledWith("a", "Account owner");
    expect(
      document.querySelector('[data-adapttable-part="column-rename-form"]')
    ).toBeNull();
    expect(renameAction).toBeInTheDocument();
    await waitFor(() => expect(renameAction).toHaveFocus());
    expect(
      document.querySelector('[data-adapttable-part="column-rename-announcer"]')
    ).toHaveTextContent("Alpha renamed to Account owner.");

    await user.click(renameAction);
    fireEvent.keyDown(
      document.querySelector('[data-adapttable-part="column-rename-input"]')!,
      { key: "Escape" }
    );
    await waitFor(() => expect(renameAction).toHaveFocus());

    await user.click(renameAction);
    await user.click(
      document.querySelector<HTMLButtonElement>(
        '[data-adapttable-part="column-rename-cancel"]'
      )!
    );
    await waitFor(() => expect(renameAction).toHaveFocus());
  });

  it("renders plugin choices as labelled selects without closing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MantineProvider env="test">
        <ChoiceMenu onChange={onChange} />
      </MantineProvider>
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(byLabel("Column actions: Alpha"));
    const choice = screen.getByRole("combobox", {
      name: "Group aggregation",
    });
    await user.click(choice);
    await user.click(await screen.findByRole("option", { name: "Sum" }));

    expect(onChange).toHaveBeenCalledWith("sum");
    expect(choice).toBeInTheDocument();
  });
});
