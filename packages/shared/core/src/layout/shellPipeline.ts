/**
 * The shell pipeline — the order a table's optional layers run in, and what
 * each one reads and writes.
 *
 * A table is finished in stages. The chrome extras (layout, chips, grouping,
 * tree, selection, row actions, pinning, expansion, editing) each may replace
 * fields the next reads, so they nest in a fixed order. The body resolves the
 * window. The live stages (find, cell navigation, export, fullscreen, the
 * selection figures) run after history, each reading what the one before it
 * produced. A binding mounts each stage its own way — a component, a
 * directive, a signal graph — but the order and the data passed between
 * stages are the same everywhere, so they live here.
 */
import { computedAggregateKeys } from "../aggregate/aggregationModel";
import type { ColumnMetadata } from "../columnModel";
import { applyColumnOrder, type PinSide } from "../columns/columnLayoutModel";
import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
} from "../columns/columnMenuModel";
import type { TableEngine } from "../engine/createTableEngine";
import { createNeutralTable, type NeutralTable } from "../engine/neutralTable";
import { deriveRuntimeOperations } from "../features/runtimeOperations";
import type { TableRuntimeView } from "../features/tableRuntime";
import type { FilterDef } from "../filters/filterDefs";
import type { FilterTypeRegistry } from "../filters/filterRegistry";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { RowPinSide } from "../rows/rowPinModel";
import type { TableSource } from "../source/TableSource";
import type { BulkAction, RowAction, TableLabels } from "../types";
import { sourceWindowStart } from "./chromeModel";

/**
 * The chrome-extra slots, outermost first.
 *
 * Each may replace fields the next reads — the layout decides which columns
 * exist before grouping buckets them, and grouping decides the row set before
 * editing addresses a row — so the sequence is the contract.
 *
 * @public
 */
export const CHROME_EXTRA_SLOT_ORDER = [
  "column-layout-live",
  "filter-chips-live",
  "grouping-live",
  "tree-live",
  "selection-live",
  "row-actions-live",
  "pinning-live",
  "expansion-live",
  "editing-live",
] as const;

/**
 * The live stages after history, in the order they run. Each reads what
 * the ones before it produced: cell navigation needs find's walk, export
 * and the selection figures need the selected range.
 *
 * @public
 */
export const SHELL_LIVE_STAGE_ORDER = [
  "find-live",
  "cell-nav-live",
  "export-live",
  "fullscreen-live",
  "selection-stats-live",
] as const;

/**
 * One of {@link SHELL_LIVE_STAGE_ORDER}.
 *
 * @public
 */
export type ShellLiveStageId = (typeof SHELL_LIVE_STAGE_ORDER)[number];

/** A column as the runtime projection reads it. */
export type RuntimeColumn<TRow> = ColumnMetadata<TRow>;

/**
 * The finished chrome, as the runtime projection reads it. Every binding's
 * chrome has these fields.
 *
 * @public
 */
export interface RuntimeChromeInput<TRow> {
  /** The view source. */
  readonly source: TableSource<TRow>;
  /** Row identity. */
  readonly getRowId: (row: TRow) => string;
  /** Declared columns, schema order. */
  readonly allColumns: readonly RuntimeColumn<TRow>[];
  /** Declarative filter definitions. */
  readonly filterDefs?: readonly FilterDef<TRow>[];
  /** Their registry. */
  readonly filterRegistry?: FilterTypeRegistry;
  /** Whether the layout setters write. */
  readonly columnLayoutLive?: boolean;
  /** Layout state and setters. */
  readonly columnLayout: {
    readonly visibleColumns: readonly RuntimeColumn<TRow>[];
    readonly state: {
      readonly order: readonly string[];
      readonly hidden: readonly string[];
      readonly pinned: Readonly<Record<string, PinSide>>;
    };
    readonly setHidden: (key: string, hidden: boolean) => void;
    readonly move: (key: string, toIndex: number) => void;
    readonly setOrder: (order: readonly string[]) => void;
    readonly setPinned: (key: string, side: PinSide | undefined) => void;
  };
  /** Grouped entries, when grouping renders. */
  readonly grouping?: { readonly entries: readonly GroupedFlatEntry<TRow>[] };
  /** Tree entries, when a tree renders. */
  readonly tree?: { readonly entries: readonly { readonly row: TRow }[] };
  /** Selection, when composed. */
  readonly table: {
    readonly selection?: {
      readonly selectedIds: ReadonlySet<string>;
      readonly allMatching?: boolean;
      readonly acrossPages?: boolean;
      readonly replace: (ids: readonly string[] | undefined) => void;
    } | null;
    readonly labels: object;
  };
  /** Row pinning, when composed. */
  readonly rowPinning?: {
    readonly state: {
      readonly top: readonly string[];
      readonly bottom: readonly string[];
    };
    readonly pin: (rowKey: string, side: RowPinSide) => void;
    readonly unpin: (rowKey: string) => void;
  };
  /** Editing, when composed. */
  readonly editing?: {
    readonly onCellEdit?: (
      row: TRow,
      key: string,
      nextValue: unknown
    ) => unknown;
    readonly batch?: {
      readonly setDraft: (
        row: TRow,
        rowId: string,
        columnKey: string,
        value: string
      ) => void;
    };
  };
}

/**
 * The rows the reader sees, in render order: grouped leaves, tree nodes, or
 * the source rows.
 *
 * @public
 */
export function renderedRowsOf<TRow>(chrome: {
  readonly source: { readonly rows: readonly TRow[] };
  readonly grouping?: { readonly entries: readonly GroupedFlatEntry<TRow>[] };
  readonly tree?: { readonly entries: readonly { readonly row: TRow }[] };
}): readonly TRow[] {
  if (chrome.grouping) {
    return chrome.grouping.entries.flatMap((entry) =>
      entry.kind === "row" ? [entry.row] : []
    );
  }
  if (chrome.tree) return chrome.tree.entries.map((entry) => entry.row);
  return chrome.source.rows;
}

/**
 * The best human-readable label for a row: the first visible column with a
 * formatted or primitive value, falling back to the row id.
 *
 * @public
 */
export function readableRowLabel<TRow>(
  chrome: Pick<RuntimeChromeInput<TRow>, "columnLayout" | "getRowId">,
  row: TRow
): string {
  for (const column of chrome.columnLayout.visibleColumns) {
    const formatted = column.formatValue?.(row);
    if (formatted !== undefined && formatted !== "") return formatted;
    const rendered = column.accessor?.(row);
    if (
      typeof rendered === "string" ||
      typeof rendered === "number" ||
      typeof rendered === "boolean"
    ) {
      return String(rendered);
    }
  }
  return chrome.getRowId(row);
}

/**
 * What the agent may hide and reorder: present only when a layout-owning
 * feature makes the setters real, reserved columns left out.
 *
 * @public
 */
export function liveColumnLayout<TRow>(
  chrome: Pick<
    RuntimeChromeInput<TRow>,
    "columnLayoutLive" | "allColumns" | "columnLayout"
  >
): TableRuntimeView<TRow>["columnLayout"] | undefined {
  if (!chrome.columnLayoutLive) return undefined;
  const reserved = new Set([ACTIONS_COLUMN_KEY, REORDER_COLUMN_KEY]);
  const declared = chrome.allColumns.filter(
    (column) => !reserved.has(column.key)
  );
  const keys = applyColumnOrder(declared, chrome.columnLayout.state.order)
    .map((column) => column.key)
    .filter((key) => !reserved.has(key));
  return {
    keys,
    hidden: chrome.columnLayout.state.hidden.filter(
      (key) => !reserved.has(key)
    ),
    setHidden: chrome.columnLayout.setHidden,
    move: chrome.columnLayout.move,
    setOrder: chrome.columnLayout.setOrder,
  };
}

/**
 * What the agent may pin. Column pinning is always present; row pinning
 * only when that feature is composed.
 *
 * @public
 */
export function livePinning<TRow>(
  chrome: Pick<RuntimeChromeInput<TRow>, "columnLayout" | "rowPinning">
): NonNullable<TableRuntimeView<TRow>["pinning"]> {
  const rowPinning = chrome.rowPinning;
  return {
    columns: chrome.columnLayout.state.pinned,
    setColumnPin: chrome.columnLayout.setPinned,
    rows: rowPinning?.state,
    setRowPin: rowPinning
      ? (rowKey: string, side: RowPinSide | undefined) => {
          // Unpin is the inverse of pin, not a layout reset: it takes this
          // row off whichever edge holds it and touches nothing else.
          if (side === undefined) rowPinning.unpin(rowKey);
          else rowPinning.pin(rowKey, side);
        }
      : undefined,
  };
}

/**
 * Project the finished chrome into the view a feature above the table reads.
 *
 * @param chrome - The chrome after every extra ran.
 * @param options - The host's own row and bulk actions, as composed.
 * @returns The view, without its neutral table.
 *
 * @public
 */
export function tableRuntimeView<TRow>(
  chrome: RuntimeChromeInput<TRow>,
  options: {
    readonly rowActions?: readonly RowAction<TRow>[];
    readonly bulkActions?: readonly BulkAction[];
  }
): TableRuntimeView<TRow> {
  const source = chrome.source;
  return {
    rows: source.rows,
    visibleRows: renderedRowsOf(chrome),
    getRowId: chrome.getRowId,
    rowLabel: (row: TRow) => readableRowLabel(chrome, row),
    sortBy: source.sortBy,
    query: {
      page: source.page,
      limit: source.limit,
      defaultLimit: source.defaultLimit,
      total: source.total,
      search: source.search,
      sortBy: source.sortBy,
      sortDir: source.sortDir,
      setPage: source.setPage,
      setLimit: source.setLimit,
      setSearch: source.setSearch,
      setSort: source.setSort,
      extra: source.extra,
      setExtras: source.setExtras,
      clearExtras: source.clearExtras,
    },
    filterDefs: chrome.filterDefs,
    filterRegistry: chrome.filterRegistry,
    grouping: chrome.grouping,
    groupingState: {
      groupBy: source.groupBy,
      aggregateOverrides: source.groupAggregateOverrides ?? {},
      columns: chrome.allColumns,
      computedAggregateKeys: chrome.grouping
        ? computedAggregateKeys(chrome.grouping.entries)
        : undefined,
      queryAggregates: source.queryAggregates,
      aggregateOperations: source.aggregateOperations,
      honorsAggregates: source.honorsAggregates,
      columnLabel: (key: string) => {
        const column = chrome.allColumns.find(
          (candidate) => candidate.key === key
        );
        if (typeof column?.header === "string") return column.header;
        return column?.mobileLabel ?? key;
      },
      setGroupBy: source.setGroupBy,
      initializeGroupBy: source.initializeGroupBy,
      setAggregateOverrides: source.setGroupAggregateOverrides,
    },
    tree: chrome.tree,
    sourceCapabilities: source.capabilities,
    // The host's own lists, as composed — not the resolved column, which hides
    // with the actions column and carries the built-in controls too.
    actions:
      (options.rowActions?.length ?? 0) + (options.bulkActions?.length ?? 0) > 0
        ? { row: options.rowActions ?? [], bulk: options.bulkActions ?? [] }
        : undefined,
    selection: chrome.table.selection
      ? {
          selectedIds: chrome.table.selection.selectedIds,
          ...(chrome.table.selection.allMatching === undefined
            ? {}
            : { allMatching: chrome.table.selection.allMatching }),
          ...(chrome.table.selection.acrossPages === undefined
            ? {}
            : { acrossPages: chrome.table.selection.acrossPages }),
          replace: chrome.table.selection.replace,
        }
      : undefined,
    pinning: livePinning(chrome),
    columnLayout: liveColumnLayout(chrome),
    editing: chrome.editing
      ? {
          onCellEdit: chrome.editing.onCellEdit,
          stageCell: chrome.editing.batch
            ? (row: TRow, rowId: string, columnKey: string, value: string) => {
                chrome.editing?.batch?.setDraft(row, rowId, columnKey, value);
              }
            : undefined,
        }
      : undefined,
  };
}

/**
 * Keeps one table's runtime view and its neutral table across renders.
 *
 * The neutral table is created once, from the first engine the source
 * publishes, and keeps whatever binding it was handed — so it is handed a
 * stable one that reads the LATEST published view on every call. Handing it
 * the first view would freeze it, and a capability the host later turns off
 * (or on) would never reach the agent.
 *
 * @public
 */
export class TableRuntimePublisher<TRow> {
  #view: TableRuntimeView<TRow> | undefined;
  #visibleRows: readonly TRow[] = [];
  #neutral: NeutralTable<TRow> | undefined;
  readonly #binding = {
    visibleRows: (): readonly TRow[] => this.#visibleRows,
    operations: (): Readonly<Record<string, boolean>> =>
      this.#view ? deriveRuntimeOperations(this.#view) : {},
  };

  /**
   * Publish this render's chrome.
   *
   * @param chrome - The chrome after every extra ran.
   * @param options - The host's own row and bulk actions.
   * @returns The view to publish, with the neutral table when an engine exists.
   */
  update(
    chrome: RuntimeChromeInput<TRow> & {
      readonly source: { readonly tableEngine?: TableEngine<TRow> };
    },
    options: {
      readonly rowActions?: readonly RowAction<TRow>[];
      readonly bulkActions?: readonly BulkAction[];
    }
  ): TableRuntimeView<TRow> {
    const view = tableRuntimeView(chrome, options);
    this.#view = view;
    this.#visibleRows = view.visibleRows ?? view.rows;
    const engine = chrome.source.tableEngine;
    if (engine && !this.#neutral) {
      this.#neutral = createNeutralTable(engine, engine.tableId, this.#binding);
    }
    return { ...view, neutralTable: engine ? this.#neutral : undefined };
  }
}

/**
 * The inputs cell navigation runs over: the dataset-sized row count, the
 * rendered rows with the pinned ones around them, and Enter / F2 resolving
 * a focused cell to the row and column to open.
 *
 * @public
 */
export function cellNavigationInput<TRow, TColumn>(input: {
  readonly source: Pick<
    TableSource<TRow>,
    "rows" | "total" | "paginationMode" | "page" | "limit"
  >;
  readonly pinnedRows?: {
    readonly top?: readonly TRow[];
    readonly bottom?: readonly TRow[];
  };
  readonly columns: readonly TColumn[];
  readonly columnsWindowed: boolean;
  readonly headerCheckbox: boolean;
  /** Called with the focused cell's row and column when it should open. */
  readonly activate?: (row: TRow, column: TColumn) => void;
}): {
  readonly rowCount: number;
  readonly rows: readonly TRow[];
  readonly columns: readonly TColumn[];
  readonly columnsWindowed: boolean;
  readonly headerCheckbox: boolean;
  readonly firstRowIndex: number;
  readonly onActivate: (cell: { row: number; col: number }) => void;
} {
  const { source, pinnedRows } = input;
  const windowStart = sourceWindowStart(source);
  const rows = [
    ...(pinnedRows?.top ?? []),
    ...source.rows,
    ...(pinnedRows?.bottom ?? []),
  ];
  return {
    headerCheckbox: input.headerCheckbox,
    rowCount:
      Math.max(source.total, windowStart + source.rows.length) +
      (pinnedRows?.top?.length ?? 0) +
      (pinnedRows?.bottom?.length ?? 0),
    columns: input.columns,
    columnsWindowed: input.columnsWindowed,
    rows,
    firstRowIndex: windowStart,
    // Enter and F2 on a focused cell open it. The grid leaves those keys to
    // whatever is inside the cell, and the only thing that handles them is a
    // control the reader never reaches by arrowing — so a keyboard reader
    // could walk the grid and never edit anything.
    onActivate: (cell) => {
      if (!input.activate) return;
      const row = rows[cell.row - windowStart];
      const column = input.columns[cell.col];
      if (row === undefined || column === undefined) return;
      input.activate(row, column);
    },
  };
}

/**
 * Whether an export may only write the page on screen — the source could
 * not cover everything the host asked for.
 *
 * @public
 */
export function exportPageOnly(
  notices: readonly { readonly kind: string }[]
): boolean {
  return notices.some((notice) => notice.kind === "export-all-page");
}

/**
 * The density contract and the optional fullscreen toggle a toolbar gets.
 *
 * Density is always readable and writable; feature composition decides
 * whether a control renders for it. Fullscreen appears only when the host
 * asked for it AND the browser allows it.
 *
 * @public
 */
export function viewControlsToolbarProps<TDensity>(
  props: {
    readonly density: TDensity;
    readonly onDensityChange: (next: TDensity) => void;
    readonly fullscreen?: boolean;
  },
  fullscreen: {
    readonly supported: boolean;
    readonly active: boolean;
    readonly toggle: () => void;
  }
): {
  density: TDensity;
  onDensityChange: (next: TDensity) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
} {
  return {
    density: props.density,
    onDensityChange: props.onDensityChange,
    ...(props.fullscreen === true && fullscreen.supported
      ? {
          onToggleFullscreen: fullscreen.toggle,
          isFullscreen: fullscreen.active,
        }
      : {}),
  };
}

/**
 * The undo / redo half of a toolbar's props, or nothing: the host asked for
 * the buttons AND a history is armed for them to drive.
 *
 * @public
 */
export function undoRedoToolbarProps(
  wanted: boolean | undefined,
  history: {
    readonly enabled: boolean;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly undo: () => unknown;
    readonly redo: () => unknown;
  },
  labels: Pick<TableLabels, "undoEdit" | "redoEdit">
): {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoLabel?: string;
  redoLabel?: string;
} {
  if (wanted !== true || !history.enabled) return {};
  return {
    onUndo: history.undo,
    onRedo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undoLabel: labels.undoEdit,
    redoLabel: labels.redoEdit,
  };
}

/**
 * The print button's half of a toolbar's props, or nothing: the host asked
 * for the button AND wired a handler.
 *
 * @public
 */
export function printToolbarProps(
  wanted: boolean | undefined,
  onPrint: (() => void) | undefined,
  labels: Pick<TableLabels, "print">
): { onPrint?: () => void; printLabel?: string } {
  if (wanted !== true || onPrint === undefined) return {};
  return { onPrint, printLabel: labels.print };
}

/** A shell as the pipeline's overlays read and write it. */
export interface PipelineShell {
  readonly tableProps: object;
  readonly toolbarProps: object;
}

/**
 * Lay the live stages' results onto a finished shell: grid focus into the
 * table props, and undo / redo, view controls and the export button into
 * the toolbar props.
 *
 * @public
 */
export function finishShellLive<
  TShell extends PipelineShell,
  TLive extends {
    readonly find: unknown;
    readonly gridFocus: unknown;
    readonly exportHandler: object;
    readonly fullscreen: {
      readonly supported: boolean;
      readonly active: boolean;
      readonly toggle: () => void;
    };
    readonly stats: unknown;
  },
  TDensity,
>(
  shell: TShell & {
    readonly editHistory: Parameters<typeof undoRedoToolbarProps>[1];
    readonly labels: Pick<TableLabels, "undoEdit" | "redoEdit">;
    readonly chromeProps: {
      readonly density: TDensity;
      readonly onDensityChange: (next: TDensity) => void;
      readonly fullscreen?: boolean;
      readonly undoRedoButtons?: boolean;
    };
  },
  live: TLive
): TShell {
  const { find, gridFocus, exportHandler, fullscreen, stats } = live;
  return {
    ...shell,
    gridFocus,
    find,
    editHistory: shell.editHistory,
    fullscreen,
    selectionStats: stats,
    tableProps: { ...shell.tableProps, gridFocus },
    toolbarProps: {
      ...shell.toolbarProps,
      ...undoRedoToolbarProps(
        shell.chromeProps.undoRedoButtons,
        shell.editHistory,
        shell.labels
      ),
      ...viewControlsToolbarProps(shell.chromeProps, fullscreen),
      ...exportHandler,
    },
  };
}

/** The chrome as {@link overlayChromeExtras} reads it. */
export interface OverlayChrome {
  readonly droppedColumns: readonly string[];
  readonly columnLayout: {
    readonly visibleColumns: readonly { readonly key: string }[];
    readonly state: {
      readonly pinned: Readonly<Record<string, PinSide | undefined>>;
      readonly widths: unknown;
      readonly collapsedGroups?: unknown;
    };
    readonly pinOffset: unknown;
    readonly setWidth: unknown;
    readonly toggleColumnGroup: unknown;
    readonly setName: unknown;
  };
  readonly table: object;
  readonly source: unknown;
  readonly autoSizeColumns?: unknown;
  readonly autoSizeColumn?: unknown;
  readonly activeFilterCount: number;
  readonly rowMutations: { readonly canAdd: boolean; readonly addRow: unknown };
  readonly editingRows: unknown;
  readonly tree?: unknown;
  readonly grouping?: unknown;
  readonly editing?: unknown;
  readonly detail?: { readonly render: unknown; readonly expansion: unknown };
  readonly rowPinning?: unknown;
  readonly rowActions?: unknown;
  readonly columnGroups: unknown;
  readonly hasRowActions: boolean;
}

/**
 * Lay the chrome the extras finished onto the shell the base chrome built.
 *
 * The shell captured the BASE chrome: its row universe is the page slice,
 * its table has every visible column. The extras may have grouped the rows,
 * armed editing, dropped columns for width — this carries all of that into
 * the table and toolbar props the kit renders from.
 *
 * @public
 */
export function overlayChromeExtras<
  TShell extends PipelineShell & {
    readonly tableProps: { readonly table: object };
    readonly autoSizeColumns: unknown;
    readonly autoSizeColumn: unknown;
    readonly chromeProps: {
      readonly resizableColumns?: boolean;
      readonly enableColumnMenu?: boolean;
      readonly onColumnRename?: unknown;
    };
  },
>(shell: TShell, chrome: OverlayChrome): TShell {
  const dropped = new Set(chrome.droppedColumns);
  const visible = chrome.columnLayout.visibleColumns;
  const columns =
    dropped.size === 0
      ? visible
      : visible.filter((column) => !dropped.has(column.key));
  const table = { ...shell.tableProps.table, ...chrome.table, columns };
  const layout = chrome.columnLayout;
  return {
    ...shell,
    chrome,
    source: chrome.source,
    table,
    autoSizeColumns: chrome.autoSizeColumns ?? shell.autoSizeColumns,
    autoSizeColumn: chrome.autoSizeColumn ?? shell.autoSizeColumn,
    toolbarProps: {
      ...shell.toolbarProps,
      activeFilterCount: chrome.activeFilterCount,
      onAddRow: chrome.rowMutations.canAdd
        ? chrome.rowMutations.addRow
        : undefined,
    },
    tableProps: {
      ...shell.tableProps,
      table,
      // The row universe an editable cell resolves its commit against. The
      // shell captured the base chrome's, which is the page slice; grouping
      // renders the FULL filtered set, so a commit on any row past page one
      // would find no row and close the editor without a word.
      rows: chrome.editingRows,
      actionsPinned: layout.state.pinned[ACTIONS_COLUMN_KEY] === "end",
      reorderPinned: layout.state.pinned[REORDER_COLUMN_KEY] === "start",
      tree: chrome.tree,
      grouping: chrome.grouping,
      editing: chrome.editing,
      renderRowDetail: chrome.detail?.render,
      expansion: chrome.detail?.expansion,
      rowPinning: chrome.rowPinning,
      rowActions: chrome.rowActions,
      pinOffset: layout.pinOffset,
      setWidth:
        shell.chromeProps.resizableColumns === true
          ? layout.setWidth
          : undefined,
      columnWidths: layout.state.widths,
      collapsedColumnGroups: layout.state.collapsedGroups,
      columnGroups: chrome.columnGroups,
      onToggleColumnGroup: layout.toggleColumnGroup,
      onRenameColumn:
        shell.chromeProps.enableColumnMenu && shell.chromeProps.onColumnRename
          ? layout.setName
          : undefined,
    },
    hasRowActions: chrome.hasRowActions,
  };
}

/** A resolved chrome body, as {@link finishShellBody} reads it. */
export interface ShellBodyInput<TRef> {
  readonly virtualization: {
    readonly enabled: boolean;
    readonly rows: readonly unknown[];
    readonly paddingTop: number;
    readonly paddingBottom: number;
    readonly measureElement?: unknown;
    readonly measureRowPair?: unknown;
  };
  readonly groupingEntries?: readonly unknown[];
  readonly treeEntries?: readonly unknown[];
  readonly loadMoreRef: unknown;
  readonly canLoadMore: boolean;
  readonly virtualScrollRef: TRef;
  readonly pinnedTopRows: readonly unknown[];
  readonly pinnedBottomRows: readonly unknown[];
  readonly pinnedSummaryTop: readonly unknown[];
  readonly pinnedSummaryBottom: readonly unknown[];
  readonly columnWindow?: unknown;
}

/**
 * Lay a resolved body onto a shell: the window, the pinned rows, the
 * load-more sentinel, the windowed grouped or tree entries, and one scroll
 * callback that names the box for the shell and hands it to the body.
 *
 * @param shell - The shell after the extras.
 * @param body - The resolved body.
 * @param composeRefs - Joins the shell's scroll callback and the body's.
 * @returns The finished shell.
 *
 * @public
 */
export function finishShellBody<
  TRef,
  TShell extends PipelineShell & {
    readonly tableProps: {
      readonly virtualScrollRef: TRef;
      readonly columnWindow: unknown;
    };
    readonly chrome: {
      readonly grouping?: object;
      readonly tree?: object;
    };
  },
>(
  shell: TShell,
  body: ShellBodyInput<TRef>,
  composeRefs: (first: TRef, second: TRef) => TRef
): TShell {
  const { grouping, tree } = shell.chrome;
  return {
    ...shell,
    loadMoreRef: body.loadMoreRef,
    canLoadMore: body.canLoadMore,
    tableProps: {
      ...shell.tableProps,
      pinnedTopRows: body.pinnedTopRows,
      pinnedBottomRows: body.pinnedBottomRows,
      pinnedSummaryTop: body.pinnedSummaryTop,
      pinnedSummaryBottom: body.pinnedSummaryBottom,
      rowEntries: body.virtualization.enabled
        ? body.virtualization.rows
        : undefined,
      paddingTop: body.virtualization.paddingTop,
      paddingBottom: body.virtualization.paddingBottom,
      measureElement: body.virtualization.measureElement,
      measureRowPair: body.virtualization.measureRowPair,
      columnWindow: body.columnWindow ?? shell.tableProps.columnWindow,
      grouping:
        grouping && body.groupingEntries
          ? { ...grouping, entries: body.groupingEntries }
          : grouping,
      tree:
        tree && body.treeEntries
          ? { ...tree, entries: body.treeEntries }
          : tree,
      virtualScrollRef: composeRefs(
        shell.tableProps.virtualScrollRef,
        body.virtualScrollRef
      ),
    },
    toolbarProps: {
      ...shell.toolbarProps,
      showRowsPerPage: body.canLoadMore && !grouping,
    },
  };
}
