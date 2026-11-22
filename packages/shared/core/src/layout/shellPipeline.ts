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
import { computedAggregateKeys } from "../aggregate/computedAggregateKeys";
import {
  applyColumnOrder,
  type ColumnLayoutContribution,
  type PinningContribution,
  type PinSide,
} from "../columns/columnLayoutModel";
import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
} from "../columns/columnMenuModel";
import type { ColumnMetadata } from "../contracts/columns";
import type { TableEngine } from "../engine/createTableEngine";
import { createNeutralTable, type NeutralTable } from "../engine/neutralTable";
import {
  type GroupingContribution,
  projectGroupingContribution,
} from "../features/featureContribution";
import { deriveRuntimeOperations } from "../features/runtimeOperations";
import {
  type CommandPaletteContribution,
  type ContextMenuContribution,
  type DensityContribution,
  type FindContribution,
  type FullscreenContribution,
  type PrintContribution,
  projectShellOperations,
  readShellOverlay,
  withShellOperations,
} from "../features/shellOperations";
import type { TableRuntimeView } from "../features/tableRuntime";
import type { FilterDef } from "../filters/filterDefs";
import { filteringContributionOf } from "../filters/filterFormModel";
import type { FilterTypeRegistry } from "../filters/filterRegistry";
import type { RowPinningContribution, RowPinSide } from "../rows/rowPinModel";
import type { DetailContribution } from "../rows/rowsBindingState";
import {
  type SelectionContribution,
  selectionContributionOf,
} from "../selection/selectionBindingState";
import type { TableSource } from "../source/TableSource";
import type { TreeContribution } from "../tree/treeBindingState";
import type { BulkAction, RowAction, TableLabels } from "../types";
import { sourceWindowStart } from "./chromeModel";

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
  readonly grouping?: GroupingContribution<TRow>;
  /**
   * Grouping a feature contributed when the host published none.
   * A defined `grouping` wins.
   */
  readonly featureGrouping?: GroupingContribution<TRow>;
  /** The host's tree bundle, when a tree renders. */
  readonly tree?: TreeContribution<TRow>;
  /** Selection, when composed. */
  readonly table: {
    readonly selection?: SelectionContribution | null;
    readonly labels: object;
  };
  /** Row pinning, when composed. Column pinning stays on the layout. */
  readonly rowPinning?: RowPinningContribution;
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
  /** The find bar, when find can open. */
  readonly find?: FindContribution;
  /** The density chooser, when that feature is composed. */
  readonly density?: DensityContribution;
  /** Fullscreen, when the browser supports it. */
  readonly fullscreen?: FullscreenContribution;
  /** The context menu, when that feature is composed. */
  readonly contextMenu?: ContextMenuContribution<TRow>;
  /** The command palette, when it is armed. */
  readonly commandPalette?: CommandPaletteContribution;
  /** Print, when the host asked for the control. */
  readonly print?: PrintContribution;
}

/**
 * The rows the reader sees, in render order: grouped leaves, tree nodes, or
 * the source rows.
 *
 * @public
 */
export function renderedRowsOf<TRow>(chrome: {
  readonly source: { readonly rows: readonly TRow[] };
  readonly grouping?: GroupingContribution<TRow>;
  /**
   * Visible tree nodes. Only `row` is read. A full {@link TreeContribution}
   * still assigns, and so does the row-only entry this function published
   * before that type existed.
   */
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
): ColumnLayoutContribution | undefined {
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
): PinningContribution {
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

/** The grouping a runtime reads: the host's, or the composed feature's. */
function runtimeGrouping<TRow>(chrome: RuntimeChromeInput<TRow>) {
  return projectGroupingContribution({
    host: chrome.grouping,
    feature: chrome.featureGrouping,
  });
}

/** The rows in rendered order: groups and tree applied, nothing else read. */
function runtimeVisibleRows<TRow>(
  chrome: RuntimeChromeInput<TRow>,
  grouping = runtimeGrouping(chrome)
): readonly TRow[] {
  return renderedRowsOf({ source: chrome.source, grouping, tree: chrome.tree });
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
  const grouping = runtimeGrouping(chrome);
  const filtering = filteringContributionOf({
    defs: chrome.filterDefs,
    registry: chrome.filterRegistry,
  });
  return {
    rows: source.rows,
    visibleRows: runtimeVisibleRows(chrome, grouping),
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
    filtering,
    filterDefs: filtering?.defs,
    filterRegistry: filtering?.registry,
    grouping,
    groupingState: {
      groupBy: source.groupBy,
      aggregateOverrides: source.groupAggregateOverrides ?? {},
      columns: chrome.allColumns,
      computedAggregateKeys: grouping
        ? computedAggregateKeys(grouping.entries)
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
    selection: selectionContributionOf(chrome.table.selection),
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
    ...projectShellOperations(chrome),
  };
}

/**
 * What the features published for the runtime view apart from the chrome.
 *
 * @public
 */
export type RuntimeChannels<TRow> = Partial<RuntimeChromeInput<TRow>>;

/** Whether two channel sets hold the same values. */
function sameChannels<TRow>(
  left: RuntimeChannels<TRow>,
  right: RuntimeChannels<TRow>
): boolean {
  const keys = Object.keys(left) as (keyof RuntimeChannels<TRow>)[];
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => left[key] === right[key])
  );
}

/**
 * The host's own row and bulk actions, as composed.
 *
 * @public
 */
export interface RuntimeActions<TRow> {
  readonly rowActions?: readonly RowAction<TRow>[];
  readonly bulkActions?: readonly BulkAction[];
}

/**
 * One engine's latest render: the chrome as staged, and the view and rendered
 * rows built from it on first read, kept until the next render is staged.
 */
class RuntimeFrame<TRow> {
  #chrome: RuntimeChromeInput<TRow> | undefined;
  #channels: RuntimeChannels<TRow> = {};
  #input: RuntimeChromeInput<TRow> | undefined;
  #actions: RuntimeActions<TRow> = {};
  #view: TableRuntimeView<TRow> | undefined;
  #rows: readonly TRow[] | undefined;
  readonly neutral: NeutralTable<TRow> | undefined;

  constructor(engine: TableEngine<TRow> | undefined) {
    this.neutral = engine
      ? createNeutralTable(engine, engine.tableId, {
          visibleRows: () => this.visibleRows(),
          operations: () => this.#operations(),
        })
      : undefined;
  }

  stage(
    chrome: RuntimeChromeInput<TRow>,
    actions: RuntimeActions<TRow>,
    channels: RuntimeChannels<TRow>
  ): void {
    if (
      chrome === this.#chrome &&
      sameChannels(channels, this.#channels) &&
      actions.rowActions === this.#actions.rowActions &&
      actions.bulkActions === this.#actions.bulkActions
    ) {
      return;
    }
    this.#chrome = chrome;
    this.#channels = channels;
    this.#input = undefined;
    this.#actions = actions;
    this.#view = undefined;
    this.#rows = undefined;
  }

  /** The chrome with the channels laid over it, built on first read. */
  #inputOf(): RuntimeChromeInput<TRow> | undefined {
    const chrome = this.#chrome;
    if (chrome === undefined) return undefined;
    if (Object.keys(this.#channels).length === 0) return chrome;
    this.#input ??= { ...chrome, ...this.#channels };
    return this.#input;
  }

  view(): TableRuntimeView<TRow> | undefined {
    const input = this.#inputOf();
    if (input === undefined) return undefined;
    this.#view ??= {
      ...tableRuntimeView(input, this.#actions),
      neutralTable: this.neutral,
    };
    return this.#view;
  }

  visibleRows(): readonly TRow[] {
    const chrome = this.#inputOf();
    if (chrome === undefined) return [];
    this.#rows ??= this.#view
      ? (this.#view.visibleRows ?? this.#view.rows)
      : runtimeVisibleRows(chrome);
    return this.#rows;
  }

  #operations(): Readonly<Record<string, boolean>> {
    const view = this.view();
    if (!view) return {};
    const overlay = this.#chrome
      ? readShellOverlay<TRow>(this.#chrome)
      : undefined;
    return deriveRuntimeOperations(
      overlay ? withShellOperations(view, overlay) : view
    );
  }
}

/**
 * Keeps one table's runtime view and its neutral table across renders.
 *
 * A render is staged, not projected: the full view is built the first time
 * a reader asks for it and kept until the next render, so a table nobody
 * reads never builds it, and rendered rows are read without it.
 *
 * The neutral table is created from the engine the source publishes and
 * reads that engine's LATEST staged render on every call: a capability the
 * host later turns off (or on) still reaches the agent. When the source's
 * engine is replaced, a new neutral table is created for the new one and the
 * old one keeps reading its own last render.
 *
 * @public
 */
export class TableRuntimePublisher<TRow> {
  #engine: TableEngine<TRow> | undefined;
  #frame = new RuntimeFrame<TRow>(undefined);

  /**
   * Stage this render's chrome. Nothing is projected until it is read.
   *
   * @param chrome - The chrome after every extra ran.
   * @param actions - The host's own row and bulk actions.
   * @param channels - What the features published apart from the chrome:
   *   editing, the filter definitions. The chrome stays the owner the shell's
   *   operations are read by.
   */
  stage(
    chrome: RuntimeChromeInput<TRow> & {
      readonly source: { readonly tableEngine?: TableEngine<TRow> };
    },
    actions: RuntimeActions<TRow>,
    channels: RuntimeChannels<TRow> = {}
  ): void {
    const engine = chrome.source.tableEngine;
    // The neutral table belongs to the engine it reads. A replaced source
    // (another engine, or a server interval with none) starts a new frame
    // and leaves the old reader on its last render; the source owns its
    // engine, so it is never disposed here.
    if (engine !== this.#engine) {
      this.#engine = engine;
      this.#frame = new RuntimeFrame(engine);
    }
    this.#frame.stage(chrome, actions, channels);
  }

  /**
   * The latest staged render as the view a feature above the table reads,
   * with the neutral table when an engine exists; built on first read.
   *
   * @returns The view, or `undefined` before the first render.
   */
  view(): TableRuntimeView<TRow> | undefined {
    return this.#frame.view();
  }

  /**
   * The latest staged render's rows in rendered order, without the view.
   *
   * @returns The rendered rows.
   */
  visibleRows(): readonly TRow[] {
    return this.#frame.visibleRows();
  }
}

/**
 * How many rows the grid spans: the whole dataset (or the rows loaded so
 * far, when more than it reports) and any pinned rows. What a table names as
 * its row count to assistive tech, with or without the keyboard grid.
 *
 * @param source - The table's source.
 * @param pinnedRows - Rows pinned above and below the body.
 * @returns The row count.
 *
 * @public
 */
export function gridRowCount<TRow>(
  source: Pick<
    TableSource<TRow>,
    "rows" | "total" | "paginationMode" | "page" | "limit"
  >,
  pinnedRows?: {
    readonly top?: readonly TRow[];
    readonly bottom?: readonly TRow[];
  }
): number {
  return (
    Math.max(source.total, sourceWindowStart(source) + source.rows.length) +
    (pinnedRows?.top?.length ?? 0) +
    (pinnedRows?.bottom?.length ?? 0)
  );
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
    rowCount: gridRowCount(source, pinnedRows),
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
 * What undo and redo buttons draw from.
 *
 * @public
 */
export interface UndoRedoToolbarProps {
  /** Undo the last edit. */
  onUndo?: () => void;
  /** Redo the last undone edit. */
  onRedo?: () => void;
  /** Whether undo is available. */
  canUndo?: boolean;
  /** Whether redo is available. */
  canRedo?: boolean;
  /** Accessible undo label. */
  undoLabel?: string;
  /** Accessible redo label. */
  redoLabel?: string;
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
): UndoRedoToolbarProps {
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
 * table props, and find, fullscreen and the selection figures onto the
 * shell. The controls a feature adds to the toolbar read its own state.
 *
 * @public
 */
export function finishShellLive<
  TShell extends PipelineShell,
  TLive extends {
    readonly find: FindContribution;
    readonly gridFocus: unknown;
    readonly fullscreen: FullscreenContribution;
    readonly stats: unknown;
  },
>(shell: TShell, live: TLive): TShell {
  const { find, gridFocus, fullscreen, stats } = live;
  return {
    ...shell,
    gridFocus,
    find,
    fullscreen,
    selectionStats: stats,
    tableProps: { ...shell.tableProps, gridFocus },
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
  readonly rowMutations?: {
    readonly canAdd: boolean;
    readonly addRow: unknown;
  };
  readonly editingRows: unknown;
  readonly tree?: TreeContribution<unknown>;
  readonly grouping?: GroupingContribution<unknown>;
  readonly editing?: unknown;
  readonly detail?: DetailContribution;
  readonly rowPinning?: RowPinningContribution;
  readonly rowActions?: unknown;
  readonly columnGroups: unknown;
  readonly hasRowActions?: boolean;
}

/**
 * Lay the chrome the extras finished onto the shell the base chrome built.
 *
 * The shell captured the BASE chrome: its row universe is the page slice,
 * its table has every visible column. The extras may have grouped the rows,
 * armed editing, dropped columns for width — this carries all of that into
 * the table and toolbar props the kit renders from. `channels` are what the
 * features published apart from the chrome (editing, grouping); the result
 * keeps `base` as its chrome.
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
>(
  shell: TShell,
  base: OverlayChrome,
  channels: Partial<OverlayChrome> = {}
): TShell {
  const chrome: OverlayChrome = { ...base, ...channels };
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
    chrome: base,
    source: chrome.source,
    table,
    autoSizeColumns: chrome.autoSizeColumns ?? shell.autoSizeColumns,
    autoSizeColumn: chrome.autoSizeColumn ?? shell.autoSizeColumn,
    toolbarProps: {
      ...shell.toolbarProps,
      onAddRow: chrome.rowMutations?.canAdd
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
    hasRowActions: chrome.hasRowActions ?? false,
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
      readonly grouping?: { readonly entries: readonly unknown[] };
      readonly tree?: { readonly entries: readonly unknown[] };
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
