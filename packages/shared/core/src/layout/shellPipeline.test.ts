/**
 * The shell pipeline is the order a table's optional layers run in and what
 * each one hands the next. Every binding mounts the stages its own way, so
 * what has to hold here is the order itself, the runtime view a feature above
 * the table reads, and each overlay laying exactly its fields onto the shell.
 */
import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
} from "../columns/columnMenuModel";
import { createTableEngine } from "../engine/createTableEngine";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { TableSource } from "../source/TableSource";
import {
  cellNavigationInput,
  CHROME_EXTRA_SLOT_ORDER,
  exportPageOnly,
  finishShellBody,
  finishShellLive,
  liveColumnLayout,
  livePinning,
  overlayChromeExtras,
  printToolbarProps,
  readableRowLabel,
  renderedRowsOf,
  type RuntimeChromeInput,
  SHELL_LIVE_STAGE_ORDER,
  TableRuntimePublisher,
  tableRuntimeView,
  undoRedoToolbarProps,
  viewControlsToolbarProps,
} from "./shellPipeline";

interface Row {
  id: string;
  name: string;
  score: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", score: 3 },
  { id: "b", name: "Bob", score: 4 },
];

const getRowId = (row: Row) => row.id;

const COLUMNS: ColumnMetadata<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "score", header: { node: true }, mobileLabel: "Score" },
  { key: "id" },
  { key: ACTIONS_COLUMN_KEY },
  { key: REORDER_COLUMN_KEY },
];

function makeSource(overrides: Partial<TableSource<Row>> = {}) {
  return {
    rows: ROWS,
    page: 1,
    limit: 10,
    defaultLimit: 10,
    total: 2,
    search: "",
    sortBy: "name",
    sortDir: "asc",
    setPage: vi.fn(),
    setLimit: vi.fn(),
    setSearch: vi.fn(),
    setSort: vi.fn(),
    extra: {},
    setExtras: vi.fn(),
    clearExtras: vi.fn(),
    groupBy: ["name"],
    setGroupBy: vi.fn(),
    paginationMode: "paged",
    ...overrides,
  } as unknown as TableSource<Row>;
}

function makeChrome(
  overrides: Partial<RuntimeChromeInput<Row>> = {}
): RuntimeChromeInput<Row> {
  return {
    source: makeSource(),
    getRowId,
    allColumns: COLUMNS,
    columnLayout: {
      visibleColumns: COLUMNS,
      state: { order: [], hidden: [], pinned: {} },
      setHidden: vi.fn(),
      move: vi.fn(),
      setOrder: vi.fn(),
      setPinned: vi.fn(),
    },
    table: { labels: {} },
    ...overrides,
  };
}

describe("stage order", () => {
  it("nests the chrome extras outermost first", () => {
    expect(CHROME_EXTRA_SLOT_ORDER).toEqual([
      "column-layout-live",
      "filter-chips-live",
      "grouping-live",
      "tree-live",
      "selection-live",
      "row-actions-live",
      "pinning-live",
      "expansion-live",
      "editing-live",
    ]);
  });

  it("runs the live stages after history, each after what it reads", () => {
    expect(SHELL_LIVE_STAGE_ORDER).toEqual([
      "find-live",
      "cell-nav-live",
      "export-live",
      "fullscreen-live",
      "selection-stats-live",
    ]);
  });
});

describe("renderedRowsOf", () => {
  it("prefers grouped leaves over a tree over the source rows", () => {
    const grouping = {
      entries: [
        { kind: "group", key: "g" },
        { kind: "row", key: "b", row: ROWS[1], index: 0 },
      ] as unknown as GroupedFlatEntry<Row>[],
    };
    const tree = { entries: [{ row: ROWS[0]! }] };
    const source = { rows: ROWS };
    expect(renderedRowsOf({ source, grouping, tree })).toEqual([ROWS[1]]);
    expect(renderedRowsOf({ source, tree })).toEqual([ROWS[0]]);
    expect(renderedRowsOf({ source })).toBe(ROWS);
  });
});

describe("readableRowLabel", () => {
  it("uses a formatted value first", () => {
    const chrome = makeChrome({
      columnLayout: {
        ...makeChrome().columnLayout,
        visibleColumns: [
          { key: "x", formatValue: () => "" },
          { key: "name", formatValue: (row) => `~${row.name}` },
        ],
      },
    });
    expect(readableRowLabel(chrome, ROWS[0]!)).toBe("~Alice");
  });

  it("uses a primitive cell when nothing formats it", () => {
    const layout = makeChrome().columnLayout;
    const label = (column: ColumnMetadata<Row>) =>
      readableRowLabel(
        makeChrome({
          columnLayout: {
            ...layout,
            visibleColumns: [{ key: "obj", accessor: () => ({}) }, column],
          },
        }),
        ROWS[1]!
      );
    expect(label({ key: "s", accessor: (row) => row.name })).toBe("Bob");
    expect(label({ key: "n", accessor: (row) => row.score })).toBe("4");
    expect(label({ key: "b", accessor: () => true })).toBe("true");
  });

  it("falls back to the row id", () => {
    const chrome = makeChrome({
      columnLayout: {
        ...makeChrome().columnLayout,
        visibleColumns: [{ key: "none" }, { key: "nil", accessor: () => null }],
      },
    });
    expect(readableRowLabel(chrome, ROWS[0]!)).toBe("a");
  });
});

describe("liveColumnLayout", () => {
  it("is absent unless a layout-owning feature made the setters real", () => {
    expect(liveColumnLayout(makeChrome())).toBeUndefined();
  });

  it("leaves the reserved columns out and follows the order", () => {
    const base = makeChrome().columnLayout;
    const chrome = makeChrome({
      columnLayoutLive: true,
      columnLayout: {
        ...base,
        state: {
          order: ["id", REORDER_COLUMN_KEY, "score", "name"],
          hidden: ["score", ACTIONS_COLUMN_KEY],
          pinned: {},
        },
      },
    });
    const live = liveColumnLayout(chrome);
    expect(live?.keys).toEqual(["id", "score", "name"]);
    expect(live?.hidden).toEqual(["score"]);
    expect(live?.setHidden).toBe(base.setHidden);
    expect(live?.move).toBe(base.move);
    expect(live?.setOrder).toBe(base.setOrder);
  });
});

describe("livePinning", () => {
  it("always offers column pinning and no row pin without the feature", () => {
    const chrome = makeChrome();
    const pinning = livePinning(chrome);
    expect(pinning.columns).toBe(chrome.columnLayout.state.pinned);
    expect(pinning.setColumnPin).toBe(chrome.columnLayout.setPinned);
    expect(pinning.rows).toBeUndefined();
    expect(pinning.setRowPin).toBeUndefined();
  });

  it("pins to an edge and unpins without a layout reset", () => {
    const rowPinning = {
      state: { top: ["a"], bottom: [] },
      pin: vi.fn(),
      unpin: vi.fn(),
    };
    const pinning = livePinning(makeChrome({ rowPinning }));
    expect(pinning.rows).toBe(rowPinning.state);
    pinning.setRowPin?.("b", "bottom");
    expect(rowPinning.pin).toHaveBeenCalledWith("b", "bottom");
    pinning.setRowPin?.("a", undefined);
    expect(rowPinning.unpin).toHaveBeenCalledWith("a");
    expect(rowPinning.pin).toHaveBeenCalledTimes(1);
  });
});

describe("tableRuntimeView", () => {
  it("projects the source query and a lean chrome", () => {
    const chrome = makeChrome();
    const view = tableRuntimeView(chrome, {});
    const source = chrome.source;
    expect(view.rows).toBe(ROWS);
    expect(view.visibleRows).toBe(ROWS);
    expect(view.getRowId).toBe(getRowId);
    expect(view.rowLabel(ROWS[0]!)).toBe("Alice");
    expect(view.sortBy).toBe("name");
    expect(view.query).toEqual({
      page: 1,
      limit: 10,
      defaultLimit: 10,
      total: 2,
      search: "",
      sortBy: "name",
      sortDir: "asc",
      setPage: source.setPage,
      setLimit: source.setLimit,
      setSearch: source.setSearch,
      setSort: source.setSort,
      extra: {},
      setExtras: source.setExtras,
      clearExtras: source.clearExtras,
    });
    expect(view.groupingState?.groupBy).toEqual(["name"]);
    expect(view.groupingState?.aggregateOverrides).toEqual({});
    expect(view.groupingState?.computedAggregateKeys).toBeUndefined();
    expect(view.groupingState?.columns).toBe(COLUMNS);
    expect(view.actions).toBeUndefined();
    expect(view.selection).toBeUndefined();
    expect(view.columnLayout).toBeUndefined();
    expect(view.editing).toBeUndefined();
    expect(view.pinning?.setRowPin).toBeUndefined();
  });

  it("labels grouping columns by string header, mobile label, then key", () => {
    const label = tableRuntimeView(makeChrome(), {}).groupingState?.columnLabel;
    expect(label?.("name")).toBe("Name");
    expect(label?.("score")).toBe("Score");
    expect(label?.("id")).toBe("id");
    expect(label?.("missing")).toBe("missing");
  });

  it("carries grouping, overrides and computed aggregate keys", () => {
    const grouping = {
      entries: [
        { kind: "group", key: "g", aggregateCells: { score: 7 } },
        { kind: "row", key: "a", row: ROWS[0], index: 0 },
      ] as unknown as GroupedFlatEntry<Row>[],
    };
    const view = tableRuntimeView(
      makeChrome({
        grouping,
        source: makeSource({ groupAggregateOverrides: { score: "sum" } }),
      }),
      {}
    );
    expect(view.grouping).toBe(grouping);
    expect(view.visibleRows).toEqual([ROWS[0]]);
    expect(view.groupingState?.computedAggregateKeys).toEqual(["score"]);
    expect(view.groupingState?.aggregateOverrides).toEqual({ score: "sum" });
  });

  it("publishes the host's own actions when either list is non-empty", () => {
    const rowAction = { key: "edit", label: "Edit", onClick: vi.fn() };
    const bulkAction = { key: "del", label: "Delete", onClick: vi.fn() };
    const chrome = makeChrome();
    expect(
      tableRuntimeView(chrome, { rowActions: [rowAction] }).actions
    ).toEqual({ row: [rowAction], bulk: [] });
    expect(
      tableRuntimeView(chrome, { bulkActions: [bulkAction] as never }).actions
    ).toEqual({ row: [], bulk: [bulkAction] });
    expect(
      tableRuntimeView(chrome, { rowActions: [], bulkActions: [] }).actions
    ).toBeUndefined();
  });

  it("publishes selection and the live column layout", () => {
    const selection = { selectedIds: new Set(["a"]), replace: vi.fn() };
    const view = tableRuntimeView(
      makeChrome({
        columnLayoutLive: true,
        table: { labels: {}, selection },
      }),
      {}
    );
    expect(view.selection).toEqual(selection);
    expect(view.columnLayout?.keys).toEqual(["name", "score", "id"]);
  });

  it("publishes editing, staging a cell only when batch editing drafts", () => {
    const onCellEdit = vi.fn();
    const plain = tableRuntimeView(makeChrome({ editing: { onCellEdit } }), {});
    expect(plain.editing?.onCellEdit).toBe(onCellEdit);
    expect(plain.editing?.stageCell).toBeUndefined();

    const setDraft = vi.fn();
    const batch = tableRuntimeView(
      makeChrome({ editing: { batch: { setDraft } } }),
      {}
    );
    batch.editing?.stageCell?.(ROWS[0]!, "a", "name", "Ada");
    expect(setDraft).toHaveBeenCalledWith(ROWS[0], "a", "name", "Ada");
  });
});

describe("TableRuntimePublisher", () => {
  function makeEngine() {
    return createTableEngine<Row>({
      data: ROWS,
      columns: [{ key: "name", header: "Name" }],
      rowKey: getRowId,
      tableId: "people",
    });
  }

  it("publishes no neutral table without an engine", () => {
    const publisher = new TableRuntimePublisher<Row>();
    const view = publisher.update(makeChrome(), {});
    expect(view.neutralTable).toBeUndefined();
    expect(view.rows).toBe(ROWS);
  });

  it("creates the neutral table once and reads the latest view", () => {
    const engine = makeEngine();
    const publisher = new TableRuntimePublisher<Row>();
    const selection = { selectedIds: new Set<string>(), replace: vi.fn() };
    const first = publisher.update(
      makeChrome({
        source: makeSource({ tableEngine: engine }),
        table: { labels: {}, selection },
      }),
      {}
    );
    const neutral = first.neutralTable;
    expect(neutral?.tableId).toBe("people");
    expect(neutral?.operations.setSelection).toBe(true);
    expect(neutral?.rows("visible")).toEqual(ROWS);

    // The host turns selection off and a tree reorders the rendered rows.
    const second = publisher.update(
      makeChrome({
        source: makeSource({ tableEngine: engine }),
        tree: { entries: [{ row: ROWS[1]! }] },
      }),
      {}
    );
    expect(second.neutralTable).toBe(neutral);
    expect(neutral?.operations.setSelection).toBe(false);
    expect(neutral?.rows("visible")).toEqual([ROWS[1]]);
  });

  it("drops the neutral table from a render whose source lost its engine", () => {
    const publisher = new TableRuntimePublisher<Row>();
    const withEngine = publisher.update(
      makeChrome({ source: makeSource({ tableEngine: makeEngine() }) }),
      {}
    );
    expect(withEngine.neutralTable).toBeDefined();
    expect(publisher.update(makeChrome(), {}).neutralTable).toBeUndefined();
  });
});

describe("cellNavigationInput", () => {
  const columns = ["c0", "c1"];

  it("counts the dataset around the pinned rows and offsets a paged window", () => {
    const top = { id: "t", name: "Top", score: 0 };
    const bottom = { id: "z", name: "Bottom", score: 0 };
    const activate = vi.fn();
    const input = cellNavigationInput<Row, string>({
      source: {
        rows: ROWS,
        total: 40,
        paginationMode: "paged",
        page: 3,
        limit: 10,
      },
      pinnedRows: { top: [top], bottom: [bottom] },
      columns,
      columnsWindowed: true,
      headerCheckbox: true,
      activate,
    });
    expect(input.rowCount).toBe(42);
    expect(input.rows).toEqual([top, ...ROWS, bottom]);
    expect(input.firstRowIndex).toBe(20);
    expect(input.columns).toBe(columns);
    expect(input.columnsWindowed).toBe(true);
    expect(input.headerCheckbox).toBe(true);

    input.onActivate({ row: 21, col: 1 });
    expect(activate).toHaveBeenCalledWith(ROWS[0], "c1");
  });

  it("counts loaded rows past the total and skips cells off the grid", () => {
    const activate = vi.fn();
    const input = cellNavigationInput<Row, string>({
      source: {
        rows: ROWS,
        total: 0,
        paginationMode: "infinite",
        page: 1,
        limit: 10,
      },
      columns,
      columnsWindowed: false,
      headerCheckbox: false,
      activate,
    });
    expect(input.rowCount).toBe(2);
    expect(input.rows).toEqual(ROWS);
    expect(input.firstRowIndex).toBe(0);
    input.onActivate({ row: 5, col: 0 });
    input.onActivate({ row: 0, col: 9 });
    expect(activate).not.toHaveBeenCalled();
    input.onActivate({ row: 1, col: 0 });
    expect(activate).toHaveBeenCalledWith(ROWS[1], "c0");
  });

  it("does nothing on activate when nothing opens a cell", () => {
    const input = cellNavigationInput<Row, string>({
      source: {
        rows: ROWS,
        total: 2,
        paginationMode: "paged",
        page: 1,
        limit: 10,
      },
      columns,
      columnsWindowed: false,
      headerCheckbox: false,
    });
    expect(() => {
      input.onActivate({ row: 0, col: 0 });
    }).not.toThrow();
  });
});

describe("exportPageOnly", () => {
  it("is true only when the export-all notice was raised", () => {
    expect(exportPageOnly([{ kind: "export-all-page" }])).toBe(true);
    expect(exportPageOnly([{ kind: "pin-nested" }])).toBe(false);
    expect(exportPageOnly([])).toBe(false);
  });
});

describe("toolbar prop builders", () => {
  const fullscreen = { supported: true, active: true, toggle: vi.fn() };
  const onDensityChange = vi.fn();

  it("always carries density, and fullscreen only when asked and supported", () => {
    expect(
      viewControlsToolbarProps(
        { density: "compact", onDensityChange },
        fullscreen
      )
    ).toEqual({ density: "compact", onDensityChange });
    expect(
      viewControlsToolbarProps(
        { density: "compact", onDensityChange, fullscreen: true },
        { ...fullscreen, supported: false }
      )
    ).toEqual({ density: "compact", onDensityChange });
    expect(
      viewControlsToolbarProps(
        { density: "compact", onDensityChange, fullscreen: true },
        fullscreen
      )
    ).toEqual({
      density: "compact",
      onDensityChange,
      onToggleFullscreen: fullscreen.toggle,
      isFullscreen: true,
    });
  });

  it("offers undo / redo only when wanted and armed", () => {
    const history = {
      enabled: true,
      canUndo: true,
      canRedo: false,
      undo: vi.fn(),
      redo: vi.fn(),
    };
    const labels = { undoEdit: "Undo", redoEdit: "Redo" };
    expect(undoRedoToolbarProps(undefined, history, labels)).toEqual({});
    expect(
      undoRedoToolbarProps(true, { ...history, enabled: false }, labels)
    ).toEqual({});
    expect(undoRedoToolbarProps(true, history, labels)).toEqual({
      onUndo: history.undo,
      onRedo: history.redo,
      canUndo: true,
      canRedo: false,
      undoLabel: "Undo",
      redoLabel: "Redo",
    });
  });

  it("offers print only when wanted and wired", () => {
    const onPrint = vi.fn();
    expect(printToolbarProps(false, onPrint, { print: "Print" })).toEqual({});
    expect(printToolbarProps(true, undefined, { print: "Print" })).toEqual({});
    expect(printToolbarProps(true, onPrint, { print: "Print" })).toEqual({
      onPrint,
      printLabel: "Print",
    });
  });
});

describe("finishShellLive", () => {
  it("lays grid focus, history, view controls and export onto the shell", () => {
    const editHistory = {
      enabled: true,
      canUndo: false,
      canRedo: true,
      undo: vi.fn(),
      redo: vi.fn(),
    };
    const onDensityChange = vi.fn();
    const shell = {
      tableProps: { table: "t" },
      toolbarProps: { search: "s" },
      editHistory,
      labels: { undoEdit: "Undo", redoEdit: "Redo" },
      chromeProps: {
        density: "normal",
        onDensityChange,
        fullscreen: true,
        undoRedoButtons: true,
      },
    };
    const live = {
      find: { query: "" },
      gridFocus: { enabled: true },
      exportHandler: { onExport: vi.fn() },
      fullscreen: { supported: true, active: false, toggle: vi.fn() },
      stats: { count: 2 },
    };
    const finished = finishShellLive(shell, live) as typeof shell &
      Record<string, unknown>;
    expect(finished.gridFocus).toBe(live.gridFocus);
    expect(finished.find).toBe(live.find);
    expect(finished.editHistory).toBe(editHistory);
    expect(finished.fullscreen).toBe(live.fullscreen);
    expect(finished.selectionStats).toBe(live.stats);
    expect(finished.chromeProps).toBe(shell.chromeProps);
    expect(finished.tableProps).toEqual({
      table: "t",
      gridFocus: live.gridFocus,
    });
    expect(finished.toolbarProps).toEqual({
      search: "s",
      onUndo: editHistory.undo,
      onRedo: editHistory.redo,
      canUndo: false,
      canRedo: true,
      undoLabel: "Undo",
      redoLabel: "Redo",
      density: "normal",
      onDensityChange,
      onToggleFullscreen: live.fullscreen.toggle,
      isFullscreen: false,
      onExport: live.exportHandler.onExport,
    });
  });
});

describe("overlayChromeExtras", () => {
  function makeOverlayChrome(
    overrides: Partial<Parameters<typeof overlayChromeExtras>[1]> = {}
  ): Parameters<typeof overlayChromeExtras>[1] {
    return {
      droppedColumns: [],
      columnLayout: {
        visibleColumns: [{ key: "name" }, { key: "score" }],
        state: {
          pinned: {
            [ACTIONS_COLUMN_KEY]: "end",
            [REORDER_COLUMN_KEY]: "start",
          },
          widths: { name: 120 },
          collapsedGroups: ["g"],
        },
        pinOffset: vi.fn(),
        setWidth: vi.fn(),
        toggleColumnGroup: vi.fn(),
        setName: vi.fn(),
      },
      table: { sortBy: "name" },
      source: { rows: [] },
      activeFilterCount: 3,
      rowMutations: { canAdd: true, addRow: vi.fn() },
      editingRows: ROWS,
      tree: { entries: [] },
      grouping: { entries: [] },
      editing: { active: null },
      detail: { render: vi.fn(), expansion: { expandedIds: new Set() } },
      rowPinning: { state: {} },
      rowActions: { open: vi.fn() },
      columnGroups: [{ key: "g" }],
      hasRowActions: true,
      ...overrides,
    };
  }

  function makeShell(chromeProps: {
    resizableColumns?: boolean;
    enableColumnMenu?: boolean;
    onColumnRename?: unknown;
  }) {
    return {
      tableProps: { table: { columns: [], base: true }, keep: 1 },
      toolbarProps: { search: "s" },
      autoSizeColumns: "shellAll",
      autoSizeColumn: "shellOne",
      chromeProps,
    };
  }

  it("carries every extra into the table and toolbar props", () => {
    const chrome = makeOverlayChrome({
      autoSizeColumns: "chromeAll",
      autoSizeColumn: "chromeOne",
    });
    const onColumnRename = vi.fn();
    const shell = makeShell({
      resizableColumns: true,
      enableColumnMenu: true,
      onColumnRename,
    });
    const out = overlayChromeExtras(shell, chrome) as ReturnType<
      typeof makeShell
    > &
      Record<string, unknown>;
    const layout = chrome.columnLayout;
    const table = {
      base: true,
      sortBy: "name",
      columns: layout.visibleColumns,
    };
    expect(out.chrome).toBe(chrome);
    expect(out.source).toBe(chrome.source);
    expect(out.table).toEqual(table);
    expect(out.autoSizeColumns).toBe("chromeAll");
    expect(out.autoSizeColumn).toBe("chromeOne");
    expect(out.hasRowActions).toBe(true);
    expect(out.chromeProps).toBe(shell.chromeProps);
    expect(out.toolbarProps).toEqual({
      search: "s",
      activeFilterCount: 3,
      onAddRow: chrome.rowMutations.addRow,
    });
    expect(out.tableProps).toEqual({
      keep: 1,
      table,
      rows: ROWS,
      actionsPinned: true,
      reorderPinned: true,
      tree: chrome.tree,
      grouping: chrome.grouping,
      editing: chrome.editing,
      renderRowDetail: chrome.detail?.render,
      expansion: chrome.detail?.expansion,
      rowPinning: chrome.rowPinning,
      rowActions: chrome.rowActions,
      pinOffset: layout.pinOffset,
      setWidth: layout.setWidth,
      columnWidths: layout.state.widths,
      collapsedColumnGroups: ["g"],
      columnGroups: chrome.columnGroups,
      onToggleColumnGroup: layout.toggleColumnGroup,
      onRenameColumn: layout.setName,
    });
  });

  it("drops columns, keeps the shell's auto-size and gates the setters", () => {
    const chrome = makeOverlayChrome({
      droppedColumns: ["score"],
      rowMutations: { canAdd: false, addRow: vi.fn() },
      detail: undefined,
      columnLayout: {
        ...makeOverlayChrome().columnLayout,
        state: { pinned: {}, widths: {} },
      },
    });
    const out = overlayChromeExtras(
      makeShell({ enableColumnMenu: true }),
      chrome
    ) as ReturnType<typeof makeShell> & Record<string, unknown>;
    const tableProps = out.tableProps as Record<string, unknown>;
    expect((out.table as { columns: unknown }).columns).toEqual([
      { key: "name" },
    ]);
    expect(out.autoSizeColumns).toBe("shellAll");
    expect(out.autoSizeColumn).toBe("shellOne");
    expect(
      (out.toolbarProps as Record<string, unknown>).onAddRow
    ).toBeUndefined();
    expect(tableProps.actionsPinned).toBe(false);
    expect(tableProps.reorderPinned).toBe(false);
    expect(tableProps.renderRowDetail).toBeUndefined();
    expect(tableProps.expansion).toBeUndefined();
    expect(tableProps.setWidth).toBeUndefined();
    // A column menu without a rename handler offers no rename.
    expect(tableProps.onRenameColumn).toBeUndefined();
    expect(tableProps.collapsedColumnGroups).toBeUndefined();
  });

  it("offers no rename when the column menu is off", () => {
    const out = overlayChromeExtras(
      makeShell({ onColumnRename: vi.fn() }),
      makeOverlayChrome()
    );
    expect(
      (out.tableProps as Record<string, unknown>).onRenameColumn
    ).toBeUndefined();
  });
});

describe("finishShellBody", () => {
  function makeShell(chrome: { grouping?: object; tree?: object }) {
    return {
      tableProps: {
        virtualScrollRef: "shellRef" as string,
        columnWindow: "shellWindow",
        keep: 1,
      },
      toolbarProps: { search: "s" },
      chrome,
    };
  }

  function makeBody(overrides: Record<string, unknown> = {}) {
    return {
      virtualization: {
        enabled: true,
        rows: ["r1", "r2"],
        paddingTop: 10,
        paddingBottom: 20,
        measureElement: "measure",
        measureRowPair: "pair",
      },
      loadMoreRef: "loadMore",
      canLoadMore: true,
      virtualScrollRef: "bodyRef" as string,
      pinnedTopRows: ["pt"],
      pinnedBottomRows: ["pb"],
      pinnedSummaryTop: ["st"],
      pinnedSummaryBottom: ["sb"],
      ...overrides,
    };
  }

  const compose = vi.fn(
    (first: string, second: string) => `${first}+${second}`
  );

  it("lays the window, pins, sentinel and composed scroll ref onto the shell", () => {
    const shell = makeShell({});
    const out = finishShellBody(
      shell,
      makeBody({ columnWindow: "bodyWindow" }),
      compose
    ) as ReturnType<typeof makeShell> & Record<string, unknown>;
    expect(compose).toHaveBeenCalledWith("shellRef", "bodyRef");
    expect(out.loadMoreRef).toBe("loadMore");
    expect(out.canLoadMore).toBe(true);
    expect(out.chrome).toBe(shell.chrome);
    expect(out.tableProps).toEqual({
      keep: 1,
      pinnedTopRows: ["pt"],
      pinnedBottomRows: ["pb"],
      pinnedSummaryTop: ["st"],
      pinnedSummaryBottom: ["sb"],
      rowEntries: ["r1", "r2"],
      paddingTop: 10,
      paddingBottom: 20,
      measureElement: "measure",
      measureRowPair: "pair",
      columnWindow: "bodyWindow",
      grouping: undefined,
      tree: undefined,
      virtualScrollRef: "shellRef+bodyRef",
    });
    expect(out.toolbarProps).toEqual({ search: "s", showRowsPerPage: true });
  });

  it("keeps the shell's column window and hides row entries when not windowed", () => {
    const out = finishShellBody(
      makeShell({}),
      makeBody({
        canLoadMore: false,
        virtualization: {
          enabled: false,
          rows: ["r1"],
          paddingTop: 0,
          paddingBottom: 0,
        },
      }),
      compose
    );
    const tableProps = out.tableProps as Record<string, unknown>;
    expect(tableProps.rowEntries).toBeUndefined();
    expect(tableProps.columnWindow).toBe("shellWindow");
    expect(out.toolbarProps).toEqual({ search: "s", showRowsPerPage: false });
  });

  it("replaces grouped and tree entries with the windowed ones", () => {
    const grouping = { entries: ["all"], other: 1 };
    const tree = { entries: ["all"], other: 2 };
    const out = finishShellBody(
      makeShell({ grouping, tree }),
      makeBody({ groupingEntries: ["g1"], treeEntries: ["t1"] }),
      compose
    );
    const tableProps = out.tableProps as Record<string, unknown>;
    expect(tableProps.grouping).toEqual({ entries: ["g1"], other: 1 });
    expect(tableProps.tree).toEqual({ entries: ["t1"], other: 2 });
    // Grouping renders every row, so no rows-per-page control.
    expect((out.toolbarProps as Record<string, unknown>).showRowsPerPage).toBe(
      false
    );
  });

  it("keeps grouped and tree entries when the body windowed none", () => {
    const grouping = { entries: ["all"] };
    const tree = { entries: ["all"] };
    const out = finishShellBody(
      makeShell({ grouping, tree }),
      makeBody(),
      compose
    );
    const tableProps = out.tableProps as Record<string, unknown>;
    expect(tableProps.grouping).toBe(grouping);
    expect(tableProps.tree).toBe(tree);
  });
});

describe("selection scope publication", () => {
  it("preserves runtimes that omit optional scope metadata", () => {
    const selectedIds = new Set(["a"]);
    const replace = vi.fn();
    const publisher = new TableRuntimePublisher<Row>();
    const published = publisher.update(
      makeChrome({
        table: { labels: {}, selection: { selectedIds, replace } },
      }),
      {}
    );
    expect(published.selection).toEqual({ selectedIds, replace });
    expect(published.selection).not.toHaveProperty("allMatching");
    expect(published.selection).not.toHaveProperty("acrossPages");
  });
  it.each([false, true])(
    "forwards all-matching and source reachability without changing host sets: %s",
    (enabled) => {
      const selectedIds = new Set(["b", "a"]);
      const replace = vi.fn();
      const publisher = new TableRuntimePublisher<Row>();
      const published = publisher.update(
        makeChrome({
          table: {
            labels: {},
            selection: {
              selectedIds,
              replace,
              allMatching: enabled,
              acrossPages: enabled,
            },
          },
        }),
        {}
      );
      expect(published.selection).toEqual({
        selectedIds,
        replace,
        allMatching: enabled,
        acrossPages: enabled,
      });
      expect(published.selection?.selectedIds).toBe(selectedIds);
      expect([...selectedIds]).toEqual(["b", "a"]);
      expect(replace).not.toHaveBeenCalled();
    }
  );
});
