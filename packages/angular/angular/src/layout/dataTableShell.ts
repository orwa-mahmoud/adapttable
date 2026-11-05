/** Shared Angular signals and lifecycle above injectDataTable; kits own all rendered controls. */
import {
  AdaptCellTemplate,
  type AdaptTableFeature,
  type Attrs,
  type BatchEditHandler,
  type CellEditHandler,
  type ColumnDef,
  type ColumnInput,
  createFeatureResources,
  type DataTable,
  type DataTableClassNames,
  editableCellController,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditHistoryOptions,
  editingBundleFor,
  featureOptionsOf,
  type FeatureResources,
  findMarkAttrs,
  flattenColumns,
  type GridFocus,
  injectDataTable,
  injectDensity,
  injectExportCsv,
  injectFindFocus,
  injectFindInTable,
  injectFindScroll,
  injectFindShortcut,
  injectFindWindowScroll,
  injectFullscreen,
  injectGridFocus,
  injectGrouping,
  injectIsMobile,
  injectRowMutations,
  injectRowSelection,
  injectTableData,
  injectTableEditHistory,
  type LiveEditConflictInput,
  type MobileCardRenderer,
  mountTableFeatures,
  readMaybe,
  type RowActionsRenderer,
  type RowSelection,
  type SummaryRowFn,
  type TableAssistantProps,
  tableFeaturesOf,
  type TableQueryHandler,
  urlAdapterFor,
} from "@adapttable/angular";
import { type SidePanelOptions } from "@adapttable/angular/features";
import {
  ACTIONS_COLUMN_KEY,
  type ActiveFilterChip,
  asBatchGesture,
  type BulkAction,
  type CellNavigationChannelsOptions,
  type CellRange,
  type CellSpanAppearance,
  type ColumnLayoutState,
  type ConfirmHandler,
  type ContextMenuTarget,
  copyContextMenuSelection,
  defaultConfirm,
  type Direction,
  type ExportCsvOptions,
  type ExtraFilters,
  type ExtraRow,
  type FacetMap,
  FILTER_ENGINE_IMPL,
  type FilterDef,
  type FilterTypeSpec,
  type FrontendEngineFactory,
  type GetCellSpan,
  type PaginationMode,
  partitionPinnedRows,
  type PinnedRows,
  projectedGroupingSource,
  type QueryAggregate,
  type QuerySupport,
  requestDensityChange,
  resolveDensity,
  type RowAction,
  type RowActionsLayout,
  type RowHeight,
  type RowStyle,
  type SavedViewsControllerOptions,
  sourceCapabilities,
  stableKey,
  type TableDensity,
  type TableLabels,
  type TableQueryParams,
  type TableSource,
  type TreeShape,
  withRowMutationActions,
  withRowPinActions,
} from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  AGENT_APPROVAL_STATE,
  type AgentApprovalProps,
  type AssemblyFns,
  BATCH_EDIT_BAR,
  BULK_BAR,
  type BulkBarSlotProps,
  chromeFeatureNotices,
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  COMMAND_PALETTE_LIVE,
  CONTEXT_MENU_LIVE,
  FILTER_DRAWER,
  FILTER_HEADER,
  FILTER_POPOVER,
  FILTERS_FORM,
  FILTERS_ICON,
  FIND_BAR,
  type FindBarProps,
  type FindInTableState,
  GROUPING_PANEL,
  printToolbarProps,
  renderedRowsOf,
  ROW_REORDER_ANNOUNCER,
  type RowMutationsState,
  SAVED_VIEWS,
  type SavedViewsSlotProps,
  SEARCH_ICON,
  type SelectionState,
  SIDE_PANEL,
  STATUS_BAR,
  TABLE_ASSISTANT,
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
  TREE_CELL,
  undoRedoToolbarProps,
} from "@adapttable/core/binding";
import {
  computed,
  contentChild,
  contentChildren,
  Directive,
  effect,
  type ElementRef,
  inject,
  Injector,
  input,
  type OnInit,
  output,
  type Signal,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
} from "@angular/core";

import { type CommandPaletteInjectOptions } from "../actions/commandPalette";
import {
  ADAPTTABLE_CONTEXT_MENU,
  type TableContextMenuOptions,
} from "../actions/tableContextMenu";
import { type BatchEditBarProps } from "../editing/rowEditGate";
import {
  type FiltersMode,
  type FiltersView,
  filtersViewFor,
} from "../filters/tableFilters";
import { selectionStatsOf } from "../focus/selectionStats";
import { SURFACE_OCCUPIED } from "./surfaceChannels";
import {
  bodyWindowFor,
  buildSurfaceBody,
  type TableSurfaceView,
} from "./tableSurfaceHost";
export type {
  BodyCellView,
  BodyRow,
  BodySlot,
  RowActionsCell,
} from "./tableSurfaceHost";
import { injectGroupingPanelState } from "../grouping/groupingPanelState";
import type { TableGrouping } from "../grouping/tableGrouping";
import { injectRowReorder } from "../rows/rowReorder";
import { injectTableRowPinning } from "../rows/tableRowPinning";
import { frontendRowModelOf } from "../source/rowModel";
import { injectRowDetail } from "../tree/tableRowDetail";
import { injectTree } from "../tree/tableTree";
import { injectColumnWindow } from "../virtual/columnWindow";
import { tableRuntimeFor } from "./tableRuntime";

/** A required kit-rendered surface exposes its native scroll element. @public */
export interface DataTableSurface {
  readonly scrollElement: () => HTMLElement | null | undefined;
}

function historyFor<TRow>(
  featureOptions: Readonly<Record<string, unknown>>,
  columns: Signal<readonly ColumnDef<TRow>[]>,
  injector: Injector
): ReturnType<typeof injectTableEditHistory<TRow>> | undefined {
  if (
    featureOptions.editHistory === undefined ||
    featureOptions.editHistory === false
  )
    return undefined;
  return injectTableEditHistory<TRow>(
    computed(() => ({
      editHistory: featureOptions.editHistory as boolean | EditHistoryOptions,
      columns: columns(),
      onCellEdit: featureOptions.onCellEdit as
        CellEditHandler<TRow> | undefined,
    })),
    injector
  );
}

/** Record inline and batch writes as their respective core gestures. */
function editingOptionsFor<TRow>(
  featureOptions: Readonly<Record<string, unknown>>,
  history: ReturnType<typeof injectTableEditHistory<TRow>> | undefined
): Readonly<Record<string, unknown>> {
  if (!history) return featureOptions;
  return {
    ...featureOptions,
    onCellEdit: history().onCellEdit,
    onBatchEdit: asBatchGesture(
      featureOptions.onBatchEdit as BatchEditHandler<TRow> | undefined,
      history().history.record
    ),
  };
}

/** The live find state, when the feature is composed. */
function findStateFor<TRow>(options: {
  readonly enabled: boolean;
  readonly table: DataTable<TRow>;
  readonly urlAdapter: ReturnType<typeof urlAdapterFor>;
  readonly urlSync: boolean;
  readonly urlKey: string | undefined;
  readonly injector: Injector;
}): Signal<FindInTableState> | undefined {
  if (!options.enabled) return undefined;
  const { table } = options;
  return injectFindInTable<TRow>({
    rows: computed(() => table.source().rows),
    columns: table.columns,
    firstRowIndex: computed(() => table.windowStart()),
    urlAdapter: options.urlAdapter,
    urlSync: options.urlSync,
    urlKey: options.urlKey,
    injector: options.injector,
  });
}

/** Shortcut, scroll and grid focus for a composed find bar. */
function wireFindChrome<TRow>(options: {
  readonly find: Signal<FindInTableState> | undefined;
  readonly grid: GridFocus<TRow> | undefined;
  readonly root: () => HTMLElement | null;
  readonly injector: Injector;
}): void {
  const { find, grid, injector } = options;
  if (!find) return;
  const current = computed(() => find().current);
  injectFindShortcut({
    root: options.root,
    openBar: computed(() => find().openBar),
    injector,
  });
  injectFindScroll({
    root: options.root,
    current,
    enabled: computed(() => grid === undefined),
    injector,
  });
  if (!grid) return;
  injectFindFocus({
    find,
    focusCell: grid.focusCell,
    selectRange: grid.selectRange,
    enabled: grid.enabled,
    injector,
  });
}

/** Ask a flat virtual window to render the current match. */
function scrollFindWindow<TRow>(options: {
  readonly find: Signal<FindInTableState> | undefined;
  readonly rows: Signal<readonly TRow[]>;
  readonly firstRowIndex: Signal<number>;
  readonly scrollToIndex: () => ((index: number) => void) | undefined;
  readonly injector: Injector;
}): void {
  const { find } = options;
  if (!find) return;
  injectFindWindowScroll({
    current: computed(() => find().current),
    rows: options.rows,
    firstRowIndex: options.firstRowIndex,
    scrollToIndex: options.scrollToIndex,
    injector: options.injector,
  });
}

/** Copy or cut the cell the menu was opened on, once cell navigation is on. */
function menuCopy<TRow>(
  grid: GridFocus<TRow> | undefined,
  target: ContextMenuTarget<TRow>,
  cut?: boolean
): void {
  if (!grid) return;
  copyContextMenuSelection(
    { range: grid.range(), cellAt: grid.cellAt, copyCells: grid.copyCells },
    target,
    cut
  );
}

/** The menu slot's props, including the handlers the built-in entries call. */
function mountedContextMenu<TRow>(input: {
  readonly contextMenu: TableContextMenuOptions<TRow>["contextMenu"];
  readonly table: DataTable<TRow>;
  readonly pinning:
    | Signal<{ readonly actions: readonly RowAction<TRow>[] } | undefined>
    | undefined;
  readonly grid: GridFocus<TRow> | undefined;
  readonly filters: FiltersView | undefined;
  readonly rowKey: (row: TRow) => string;
  readonly onCellCut: Signal<((range: CellRange) => void) | undefined>;
}): Signal<
  TableContextMenuOptions<TRow> & {
    readonly children: (regionProps: Record<string, unknown>) => undefined;
  }
> {
  const { table, grid, filters } = input;
  const options = contextMenuOptionsFor({
    contextMenu: input.contextMenu,
    columns: table.columns,
    labels: table.labels,
    rowFor: (rowId) =>
      table.source().rows.find((row) => input.rowKey(row) === rowId),
    sortBy: table.sortBy,
    sortDir: table.sortDir,
    isPinned: (columnKey) =>
      table.layout().state.pinned[columnKey] !== undefined,
    rowPins: computed(() => input.pinning?.()?.actions ?? []),
    featureHost: table.featureHost,
    gridNavigation: grid !== undefined,
    onSort: (columnKey, direction) => {
      table.source().setSort(columnKey, direction);
    },
    onHide: (columnKey) => {
      table.layout().toggleVisible(columnKey);
    },
    onFilter: filters ? () => filters.show() : undefined,
    onCopy: (target) => menuCopy(grid, target),
    cut: computed(() => grid !== undefined && input.onCellCut() !== undefined),
    onCut: (target) => menuCopy(grid, target, true),
  });
  // The slot type requires `children` for the React root wrapper. Angular
  // binds the region handlers on the table root instead.
  return computed(() => ({ ...options(), children: () => undefined }));
}

/** Props for the context-menu slot, whether or not a feature fills it. */
function contextMenuOptionsFor<TRow>(options: {
  readonly contextMenu: TableContextMenuOptions<TRow>["contextMenu"];
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  readonly labels: Signal<TableLabels>;
  readonly rowFor: (rowId: string) => TRow | undefined;
  readonly sortBy: Signal<string | undefined>;
  readonly sortDir: Signal<"asc" | "desc" | undefined>;
  readonly isPinned: (columnKey: string) => boolean;
  readonly rowPins: Signal<readonly RowAction<TRow>[]>;
  readonly featureHost: TableContextMenuOptions<TRow>["featureHost"];
  readonly gridNavigation: boolean;
  readonly onSort: (columnKey: string, direction: "asc" | "desc") => void;
  readonly onHide: (columnKey: string) => void;
  readonly onFilter: (() => void) | undefined;
  readonly onCopy: (target: ContextMenuTarget<TRow>) => void;
  readonly cut: Signal<boolean>;
  readonly onCut: (target: ContextMenuTarget<TRow>) => void;
}): Signal<TableContextMenuOptions<TRow>> {
  return computed(() => ({
    contextMenu: options.contextMenu,
    columns: options.columns(),
    labels: options.labels(),
    rowFor: options.rowFor,
    actions: {
      onCopy: options.onCopy,
      onCut: options.cut() ? options.onCut : undefined,
      onSort: options.onSort,
      onHide: options.onHide,
      onFilter: options.onFilter,
    },
    sortBy: options.sortBy(),
    sortDir: options.sortDir(),
    isPinned: options.isPinned,
    rowPins: options.rowPins(),
    featureHost: options.featureHost,
    gridNavigation: options.gridNavigation,
  }));
}

/** Props for the command-palette slot, whether or not a feature fills it. */
function commandPalettePropsFor(options: {
  readonly commandPalette: CommandPaletteInjectOptions["commandPalette"];
  readonly onPrint: CommandPaletteInjectOptions["onPrint"];
  readonly labels: Signal<TableLabels>;
  readonly dir: Signal<Direction>;
  readonly clearFilters: () => void;
  readonly featureHost: CommandPaletteInjectOptions["featureHost"];
  readonly exportCsv:
    | Signal<
        | {
            readonly onExportCsv?: () => void;
            readonly exportLabel?: string;
          }
        | undefined
      >
    | undefined;
  readonly filterCount: Signal<number>;
}): Signal<CommandPaletteInjectOptions> {
  return computed(() => {
    const exported = options.exportCsv?.();
    return {
      commandPalette: options.commandPalette,
      labels: options.labels(),
      dir: options.dir(),
      onPrint: options.onPrint,
      onExport: exported?.onExportCsv,
      exportLabel: exported?.exportLabel,
      onClearFilters: options.clearFilters,
      hasFilters: options.filterCount() > 0,
      featureHost: options.featureHost,
    };
  });
}

/** The find bar's slot props, while find is composed. */
function findBarFor(
  find: Signal<FindInTableState> | undefined,
  labels: Signal<TableLabels>
): Signal<FindBarProps> | undefined {
  if (!find) return undefined;
  return computed(() => ({ find: find(), labels: labels() }));
}

/** Cell attributes, with find marks when the grid is not painting them. */
function cellAttrsWithFind<TRow>(
  table: DataTable<TRow>,
  grid: GridFocus<TRow> | undefined,
  find: Signal<FindInTableState> | undefined
): (column: ColumnDef<TRow>, index: number, col: number) => Attrs {
  return (column, index, col) => {
    if (grid) return grid.cellAttrs(column, index, col);
    const base = table.cellAttrs(column);
    const state = find?.();
    if (!state?.open) return base;
    return findMarkAttrs(base, state, {
      row: table.windowStart() + index,
      col,
    });
  };
}

/**
 * What the compatibility shell renders once its inputs have arrived.
 * Structural fields come from {@link TableSurfaceView}.
 *
 * @public
 */
export interface TableView<TRow> extends TableSurfaceView<TRow> {
  /** A host template or component replacing the resolved row actions. */
  readonly renderRowActions: Signal<RowActionsRenderer<TRow> | undefined>;
  /** The host's live changed-cell marks, shared by cells and card values. */
  readonly isCellFlashing: (rowId: string, columnKey: string) => boolean;
  /** The find bar's props, when `findInTable()` is composed. */
  readonly findBar: Signal<FindBarProps> | undefined;
  /** Props for the command-palette slot. Empty when the feature is absent. */
  readonly commandPalette: Signal<CommandPaletteInjectOptions>;
  /** Props for the context-menu slot. Empty when the feature is absent. */
  readonly contextMenu: Signal<
    TableContextMenuOptions<TRow> & {
      readonly children: (regionProps: Record<string, unknown>) => undefined;
    }
  >;
  /**
   * A cell's attributes, with find's match marks when the grid is not
   * painting them itself.
   */
  readonly markedCellAttrs: (
    column: ColumnDef<TRow>,
    index: number,
    col: number,
    rowId?: string
  ) => Attrs;
  /** Whether the Columns menu is composed. */
  readonly columnMenu: boolean;
  /** The Columns menu's props. */
  readonly columnMenuProps: Signal<ColumnMenuSlotProps<never>>;
  /** The filters, when a filters feature is composed. */
  readonly filters: FiltersView | undefined;
  /** The selection bar's props, when bulk actions are composed. */
  readonly bulkBar: Signal<BulkBarSlotProps<SelectionState>> | undefined;
  /** The actions column's list, absent while hidden or empty. */
  readonly rowActions: Signal<RowAction<TRow>[] | undefined>;
  /** A strip of buttons, or a menu. */
  readonly rowActionsLayout: RowActionsLayout | undefined;
  /** Host-owned row additions and mutations. */
  readonly rowMutations: Signal<RowMutationsState<TRow>>;
  /** Asks before an action that declares a `confirm`. */
  readonly confirm: ConfirmHandler;
  /** The toolbar extras' props: density, fullscreen and export. */
  readonly toolbarExtras: Signal<ToolbarExtrasSlotProps>;
  /** The saved-views menu's props, when it is composed. */
  readonly savedViews:
    Signal<SavedViewsSlotProps<SavedViewsControllerOptions>> | undefined;
  /** The batch-edit bar's props, when batch editing is composed. */
  readonly batchBar: Signal<BatchEditBarProps<TRow> | undefined> | undefined;
}

/**
 * Shared Angular table inputs, outputs and feature lifecycle. Native adapter
 * templates supply the controls and desktop/mobile scroll surfaces.
 *
 * @public
 */
@Directive({})
export abstract class AdaptDataTableShell<TRow> implements OnInit {
  /**
   * The rows: every row for a table that searches, sorts and pages them
   * itself, or the current page when `onQueryChange` fetches it. The host
   * owns the array.
   */
  readonly data = input<readonly TRow[]>();
  /**
   * A prebuilt source — `injectQuerySource`'s, or any `TableSource` — in
   * place of `data`. Replacements and signal updates stay live.
   */
  readonly source = input<Signal<TableSource<TRow>> | TableSource<TRow>>();
  /**
   * `"server"` makes `onQueryChange` fetch the rows; `"frontend"` keeps the
   * table's own processing and makes `onQueryChange` a notification. Absent:
   * `data` with `onQueryChange` is server, `data` alone is frontend.
   */
  readonly mode = input<"frontend" | "server">();
  /**
   * Called with one consolidated query per real change: on the server tier
   * the host fetches that page and the superseded request's `signal` is
   * aborted; on the frontend tier it is told what the reader did.
   */
  readonly onQueryChange = input<TableQueryHandler>();
  /** Server tier: the row count across every page. */
  readonly total = input<number>();
  /** A request in flight. */
  readonly loading = input<boolean>();
  /** A failure to show. */
  readonly error = input<Error | null>();
  /** Server tier: what the endpoint can answer beyond the baseline query. */
  readonly supports = input<QuerySupport>();
  /** Server tier: aggregates to ask the endpoint for. */
  readonly aggregates = input<readonly QueryAggregate[]>();
  /** Server tier: the `key` of the query the current `data` answers. */
  readonly responseKey = input<string>();
  /** Server tier: distinct-value counts from the last fetch. */
  readonly facets = input<FacetMap>();
  /** Server tier: filter keys to count; defaults to every checklist filter. */
  readonly facetKeys = input<readonly string[]>();
  /** The columns in order, and header groups over them. */
  readonly columns = input.required<readonly ColumnInput<TRow>[]>();
  /** A row's stable id. */
  readonly rowKey = input.required<(row: TRow) => string>();
  /** The table's accessible name. Defaults to the `table` label. */
  readonly tableLabel = input<string>();
  /** Text direction. */
  readonly dir = input<Direction>("ltr");
  /** Show the phone layout whatever the viewport. */
  readonly forceMobile = input<boolean>();
  /** Keep the desktop header in view while the table or the page scrolls. */
  readonly stickyHeader = input(false);
  /**
   * Top inset in px for a header that sticks to the page, such as the height
   * of an app bar it must clear. Inside a scroll box the header sticks at 0.
   */
  readonly stickyTop = input(0);
  /**
   * Viewport width, in pixels, at or below which the table shows cards.
   * Read when the table is created.
   */
  readonly mobileBreakpoint = input<number>();
  /** Classes for mobile-card and row-action parts. */
  readonly classNames = input<DataTableClassNames>({});
  /** Replace a card's fields while preserving its interactive shell. */
  readonly renderCard = input<MobileCardRenderer<TRow>>();
  /** Replace row actions on desktop and cards with a template or component. */
  readonly renderRowActions = input<RowActionsRenderer<TRow>>();
  /** Activate a row by clicking its body, Enter or Space. */
  readonly onRowClick = input<(row: TRow) => void>();
  /** Live changed-cell reader, such as `injectChangedCellFlash().isFlashing`. */
  readonly isCellFlashing =
    input<(rowId: string, columnKey: string) => boolean>();
  /** Translated labels, merged over the English defaults. */
  readonly labels = input<TableLabels>();
  /**
   * Active locale for columns that read by `i18n` path: the cells, filter
   * choices, search and sort all read that locale's field.
   */
  readonly locale = input<string>();
  /** The search box's placeholder. Defaults to the `searchPlaceholder` label. */
  readonly searchPlaceholder = input<string>();
  /**
   * Draw the search box. On by default; a nested table turns it off, since a
   * second search box inside a row reads as chrome rather than as a feature.
   */
  readonly searchable = input(true);
  /**
   * How long the search box waits after the last keystroke before it
   * searches, in milliseconds. Read when the table is created.
   */
  readonly searchDebounceMs = input<number>();
  /**
   * One value per column for a summary row under the body — `aggregate`
   * builds one. A column's `footer` renders its value; without either, no
   * summary row is drawn.
   */
  readonly summaryRow = input<SummaryRowFn<TRow>>();
  /** Choose URL state or this table's retained private state. */
  readonly urlSync = input(true);
  /** Namespace for this table's URL params. */
  readonly urlKey = input<string>();
  /** View-state defaults while the selected backend is silent. */
  readonly defaults = input<
    Partial<TableQueryParams> & { extra?: ExtraFilters }
  >();
  /**
   * Pagination mode. Defaults to `"auto"` (phone → infinite). Pass
   * `"infinite"` with {@link virtualize} so the body windows.
   */
  readonly paginationMode = input<PaginationMode>();
  /**
   * Cap the table body's height; the body scrolls inside the box and a
   * composed {@link virtualize} tracks the box instead of the page.
   */
  readonly maxHeight = input<number | string>();
  /**
   * How many placeholder rows the first-load skeleton draws. Absent, the
   * page size.
   */
  readonly skeletonRows = input<number>();
  /** Which edge a projected side panel sits on. */
  readonly sidePanelSide = input<"start" | "end">("end");
  /** Offer a checkbox on every row. */
  readonly selectable = input(false);
  /** The selected row ids, to control the selection. */
  readonly selectedIds = input<readonly string[]>();
  /**
   * Arrow keys move between cells. Prefer composing
   * `cellNavigation()` when listing features; this input still toggles the
   * grid alone.
   */
  readonly cellNavigation = input(false);
  /**
   * Told a range after Cut has reached the clipboard — the context menu and
   * Ctrl/Cmd+X. Read on each cut.
   */
  readonly onCellCut = input<(range: CellRange) => void>();
  /**
   * The live features this table composes, such as `columnMenu()`. Replacing
   * the list updates options, slots and mounted behavior.
   */
  readonly features = input<readonly AdaptTableFeature[]>([]);
  /** Optional conversation props drawn by a composed assistant feature. */
  readonly assistant = input<TableAssistantProps>();
  /** Optional whole-row version used to detect a live cell edit conflict. */
  readonly rowVersion = input<(row: TRow) => string | number>();
  /** How to resolve incoming changes while a draft is open. Defaults to asking. */
  readonly editConflictPolicy = input<EditConflictPolicy>();
  /** Host conflict decision; takes precedence over the policy. */
  readonly onEditConflict = input<EditConflictHandler<TRow>>();
  /**
   * The pointer gesture that opens a cell's editor. `"doubleClick"` (default)
   * keeps a single click for selecting the cell; `"click"` opens the editor on
   * the first click. Enter and F2 open it either way.
   */
  readonly editActivation = input<"doubleClick" | "click">();
  /** The column layout, to control it. */
  readonly columnLayout = input<ColumnLayoutState>();
  /** The layout an uncontrolled table starts from. Read once. */
  readonly defaultColumnLayout = input<Partial<ColumnLayoutState>>();
  /**
   * Called when the user renames a column. With it, the Columns menu offers
   * a rename. Replacing it updates the live layout controller.
   */
  readonly onColumnRename = input<(key: string, name: string) => void>();
  /**
   * Where the Filters button opens its panel: an anchored popover with no
   * backdrop, or a drawer that dims the page.
   */
  readonly filtersMode = input<FiltersMode>("popover");
  /** Close a header filter once a single-control write finishes. */
  readonly closeHeaderFilterOnSelect = input(false);
  /** The host's own chips, shown after the table's filter chips. */
  readonly extraChips = input<readonly ActiveFilterChip[]>([]);
  /** Controlled row density. Omit to use the composed chooser's state. */
  readonly density = input<TableDensity>();
  /** Every density request; a controlled table waits for its density input. */
  readonly densityChange = output<TableDensity>();
  /**
   * Asks before an action that declares a `confirm`. Defaults to the
   * browser's `confirm`. Each request reads the current handler.
   */
  readonly confirm = input<ConfirmHandler>();
  /** Every selection change, as the full list of selected ids. */
  readonly selectionChange = output<string[]>();
  /** Every column-layout change. */
  readonly columnLayoutChange = output<ColumnLayoutState>();

  /**
   * Cell templates the host declares inside the table's element.
   *
   * @internal
   */
  protected readonly cellTemplates = contentChildren(AdaptCellTemplate);
  /**
   * The table and chrome for the current feature composition.
   *
   * @internal
   */
  protected readonly view = signal<TableView<TRow> | undefined>(undefined);
  /** A host template rendered under the pager. */
  readonly tableFooter = contentChild<TemplateRef<unknown>>("tableFooter");
  /** A host template rendered beside the body. */
  readonly sidePanel = contentChild<TemplateRef<unknown>>("sidePanel");
  /** The feature panel, stamped only while it is open. */
  private readonly featureSidePanelTpl =
    viewChild<TemplateRef<unknown>>("featureSidePanel");
  /** The side-panel slot. @internal */
  protected readonly sidePanelSlot = SIDE_PANEL;
  /** A pending feature-owned approval, drawn only by its composed kit slot. */
  protected readonly agentApprovalSlot = AGENT_APPROVAL;
  protected readonly tableAssistantSlot = TABLE_ASSISTANT;
  protected readonly agentApprovalProps = computed((): AgentApprovalProps => ({
    pending:
      this.view()?.table.featureState.get(AGENT_APPROVAL_STATE)() ?? null,
    labels: this.view()?.table.labels(),
  }));
  /** The status-bar slot. @internal */
  protected readonly statusBarSlot = STATUS_BAR;
  /** The feature's panel options, read live so a controlled `open` updates. */
  private readonly liveSidePanel = computed(
    () =>
      featureOptionsOf(tableFeaturesOf(this.injector, this.features()))
        .sidePanel as SidePanelOptions | undefined
  );
  /** Which edge the docked panel sits on. */
  protected readonly dockedSide = computed(
    () => this.liveSidePanel()?.side ?? this.sidePanelSide()
  );
  /**
   * The feature panel while it is open; otherwise the host's projected
   * template.
   */
  protected readonly dockedPanel = computed(() => {
    const options = this.liveSidePanel();
    if (options?.open != null) return this.featureSidePanelTpl();
    return this.sidePanel();
  });
  /** Props for the live panel, only while a feature panel is open. */
  protected readonly sidePanelProps = computed(() => {
    const options = this.liveSidePanel();
    if (options?.open == null) return undefined;
    return {
      panels: options.panels,
      openPanel: options.open,
      onOpenPanel: (key: string) => {
        options.onOpenChange(key);
      },
      onClose: () => {
        options.onOpenChange(null);
      },
      side: options.side ?? this.sidePanelSide(),
      labels: this.labels(),
    };
  });
  /** Props for the status strip, while a feature fills it. */
  protected readonly statusBarProps = computed(() => {
    const view = this.view();
    if (!view?.table.hasSlot(STATUS_BAR)) return undefined;
    return statusBarSlotProps(view, featureOptionsOf(this.features()));
  });
  /**
   * Whether the empty table is empty because nothing matched.
   *
   * @internal
   */
  protected readonly noResults = computed(
    () => this.view()?.table.emptyVariant() === "noResults"
  );

  /** The Columns menu's slot. @internal */
  protected readonly columnMenuSlot = COLUMN_MENU;
  /** The filter slots. @internal */
  protected readonly filterSlots = {
    form: FILTERS_FORM,
    popover: FILTER_POPOVER,
    drawer: FILTER_DRAWER,
    chips: ACTIVE_FILTER_CHIPS,
    header: FILTER_HEADER,
  };
  /** The saved-views slot. @internal */
  protected readonly savedViewsSlot = SAVED_VIEWS;
  /** The toolbar extras' slot. @internal */
  protected readonly toolbarExtrasSlot = TOOLBAR_EXTRAS;
  /** The selection bar's slot. @internal */
  protected readonly bulkBarSlot = BULK_BAR;
  /** The batch-edit bar's slot. @internal */
  protected readonly batchEditBarSlot = BATCH_EDIT_BAR;
  /** The grouping strip's slot. @internal */
  protected readonly groupingPanelSlot = GROUPING_PANEL;
  /** The find bar's slot. @internal */
  protected readonly findBarSlot = FIND_BAR;
  /** The command palette slot. @internal */
  protected readonly commandPaletteSlot = COMMAND_PALETTE_LIVE;
  /** The context menu slot. @internal */
  protected readonly contextMenuSlot = CONTEXT_MENU_LIVE;
  private readonly contextMenuRegion = inject(ADAPTTABLE_CONTEXT_MENU);
  /** The row-reorder announcer slot. @internal */
  protected readonly reorderAnnouncerSlot = ROW_REORDER_ANNOUNCER;
  /** The Filters button's glyph. @internal */
  protected readonly filtersIcon = FILTERS_ICON;
  /** The search box's glyph. @internal */
  protected readonly searchIcon = SEARCH_ICON;
  /**
   * The desktop body, when rendered — owns the scroll box virtualization
   * tracks.
   *
   * @internal
   */
  protected readonly desktopTable =
    viewChild<DataTableSurface>("desktopSurface");
  /** The phone card list, when rendered — the scroll box on phones. @internal */
  protected readonly mobileCards = viewChild<DataTableSurface>("mobileSurface");
  private readonly filtersForm = viewChild<TemplateRef<unknown>>("filtersForm");
  private readonly filtersTrigger =
    viewChild<TemplateRef<unknown>>("filtersTrigger");
  private scrollToGridRow: ((rowIndex: number) => void) | undefined;
  private readonly injector = inject(Injector);
  private readonly root = viewChild<ElementRef<HTMLElement>>("root");

  /** Ctrl/Cmd+X and the menu's Cut, after the clipboard write succeeds. */
  private cutSelection(range: CellRange): void {
    this.onCellCut()?.(range);
  }

  /** A right-click inside the table. */
  protected onMenuContext(event: MouseEvent): void {
    this.contextMenuRegion()?.onContextMenu(event);
  }

  /** Shift+F10 or the menu key inside the table. */
  protected onMenuKey(event: KeyboardEvent): void {
    this.contextMenuRegion()?.onKeyDown(event);
  }

  /** A touch press inside the table. */
  protected onMenuPointerDown(event: PointerEvent): void {
    this.contextMenuRegion()?.onPointerDown(event);
  }

  /** A finger moving inside the table. */
  protected onMenuPointerMove(event: PointerEvent): void {
    this.contextMenuRegion()?.onPointerMove(event);
  }

  /** The finger lifted. */
  protected onMenuPointerUp(): void {
    this.contextMenuRegion()?.onPointerUp();
  }

  /** The browser took the pointer. */
  protected onMenuPointerCancel(): void {
    this.contextMenuRegion()?.onPointerCancel();
  }

  /** The phone sort select: a column, or none. */
  protected sortBy(event: Event | string): void {
    const table = this.view();
    if (table === undefined) return;
    const value =
      typeof event === "string"
        ? event
        : (event.target as HTMLSelectElement).value;
    table.table
      .source()
      .setSort(
        value === "" ? undefined : value,
        table.table.sortDir() ?? "asc"
      );
  }

  /** Reverse the current phone sort while preserving its selected column. */
  protected sortDirection(): void {
    const table = this.view()?.table;
    if (!table?.sortBy()) return;
    table
      .source()
      .setSort(table.sortBy(), table.sortDir() === "desc" ? "asc" : "desc");
  }

  ngOnInit(): void {
    const resources = createFeatureResources(this.injector);
    const features = computed(
      () => tableFeaturesOf(this.injector, this.features()),
      {
        equal: (left, right) =>
          left.length === right.length &&
          left.every((feature, index) => feature === right[index]),
      }
    );
    const inScrollBox = computed(() => this.maxHeight() != null);
    const configuration = computed(() => ({
      features: features(),
      inScrollBox: inScrollBox(),
      selectable: this.selectable(),
      cellNavigation: this.cellNavigation(),
      filtersMode: this.filtersMode(),
      closeHeaderFilterOnSelect: this.closeHeaderFilterOnSelect(),
      urlSync: this.urlSync(),
      urlKey: this.urlKey(),
    }));
    let previous = configuration();
    const assemble = (current: readonly AdaptTableFeature[]): void => {
      resources.reconcile(() => {
        this.assembleTable(current, resources);
      });
    };
    untracked(() => {
      assemble(previous.features);
    });
    effect(
      () => {
        const current = configuration();
        if (current === previous) return;
        previous = current;
        untracked(() => {
          assemble(current.features);
        });
      },
      { injector: this.injector }
    );
  }

  /** Compose current chrome while retaining each unchanged controller scope. */
  private assembleTable(
    features: readonly AdaptTableFeature[],
    resources: FeatureResources
  ): void {
    const labels = computed((): TableLabels | undefined => {
      const placeholder = this.searchPlaceholder();
      return placeholder === undefined
        ? this.labels()
        : { ...this.labels(), searchPlaceholder: placeholder };
    });
    const liveOptions = resources.use("options", [], () =>
      computed(() =>
        featureOptionsOf(tableFeaturesOf(this.injector, this.features()))
      )
    );
    const featureOptions = liveOptions();
    const declaredFilters = featureOptions.filters;
    const filtersOn = Array.isArray(declaredFilters);
    const headerOn = featureOptions.headerFilters === true;
    // Filled once the table exists; the table reads the count lazily.
    const filtersRef = resources.use("filters-ref", [], () =>
      signal<FiltersView | undefined>(undefined)
    );
    // One URL backend for the table, its density and its saved views — a
    // private memory store when the table does not sync with the URL.
    const urlBackends = resources.use("url-backends", [], (injector) => ({
      shared: urlAdapterFor({ urlSync: true }, injector),
      private: urlAdapterFor({ urlSync: false }, injector),
    }));
    const activeUrlAdapter = resources.use("url", [], () =>
      computed(() =>
        this.urlSync() ? urlBackends.shared : urlBackends.private
      )
    );
    const urlAdapter = activeUrlAdapter();
    const viewportMobile = resources.use("mobile", [], (injector) =>
      injectIsMobile({ injector, breakpoint: this.mobileBreakpoint() })
    );
    const isMobile = computed(() => this.forceMobile() ?? viewportMobile());
    const data = resources.use("data", [], (injector) =>
      injectTableData<TRow>({
        source: computed(() => readMaybe(this.source())),
        data: this.data,
        mode: this.mode,
        onQueryChange: this.onQueryChange,
        total: this.total,
        loading: this.loading,
        error: this.error,
        supports: this.supports,
        aggregates: this.aggregates,
        responseKey: this.responseKey,
        facets: this.facets,
        facetKeys: this.facetKeys,
        columns: computed(() => flattenColumns(this.columns()).leaves),
        get engine() {
          const current = liveOptions();
          return Array.isArray(current.filters) ||
            current.headerFilters === true
            ? FILTER_ENGINE_IMPL
            : undefined;
        },
        get filters() {
          return liveOptions().filters as FilterDef<TRow>[] | undefined;
        },
        get filterTypes() {
          return liveOptions().filterTypes as FilterTypeSpec[] | undefined;
        },
        featureHost: computed(() => this.view()?.table.featureHost),
        getRowId: (row) => this.rowKey()(row),
        forceMobile: isMobile,
        urlAdapter: activeUrlAdapter,
        urlKey: this.urlKey,
        defaults: this.defaults,
        paginationMode: computed(() => this.paginationMode() ?? "auto"),
        locale: this.locale,
        mobileBreakpoint: this.mobileBreakpoint(),
        createEngine: computed(
          () =>
            frontendRowModelOf(
              tableFeaturesOf(this.injector, this.features())
            ) as FrontendEngineFactory<TRow> | undefined
        ),
        injector,
      })
    );
    const source = data.source;
    const declaredBulk = featureOptions.bulkActions;
    const bulk = Array.isArray(declaredBulk)
      ? (declaredBulk as BulkAction[])
      : undefined;
    const selectionState = resources.use("selection-state", [], () => ({
      controller: undefined as RowSelection | undefined,
    }));
    const selectable = this.selectable() || bulk !== undefined;
    const selectionController =
      selectable || selectionState.controller !== undefined
        ? resources.use("selection", [], (injector) =>
            injectRowSelection<TRow>({
              rows: computed(() => source().rows),
              rowKey: (row) => this.rowKey()(row),
              selectedIds: this.selectedIds,
              onSelectionChange: (ids) => {
                this.selectionChange.emit(ids);
              },
              labels,
              acrossPages: computed(
                () => sourceCapabilities(source()).selectAcrossPages
              ),
              resetKey: computed(() => {
                const current = source();
                return stableKey([
                  current.search,
                  current.extra,
                  current.filterTree,
                  current.groupBy,
                ]);
              }),
              injector,
            })
          )
        : undefined;
    selectionState.controller = selectionController;
    const selection = selectable ? selectionController : undefined;
    const selectionRef = resources.use("selection-ref", [], () =>
      signal<RowSelection | undefined>(undefined)
    );
    selectionRef.set(selection);
    // A grouped table renders the full filtered set as one page: a group
    // spans pages. The model reads the source before it is widened.
    const groupingRef = resources.use("grouping-ref", [], () =>
      signal<Signal<TableGrouping<TRow> | undefined> | undefined>(undefined)
    );
    const viewSource = resources.use("view-source", [], () =>
      computed(() =>
        projectedGroupingSource(source(), { model: groupingRef()?.() })
      )
    );
    const readRename = this.onColumnRename;
    const table = resources.use("table", [], (injector) =>
      injectDataTable<TRow>({
        source: viewSource,
        columns: this.columns,
        rowKey: (row) => this.rowKey()(row),
        tableLabel: this.tableLabel,
        labels,
        dir: this.dir,
        locale: this.locale,
        searchDebounceMs: this.searchDebounceMs(),
        forceMobile: isMobile,
        cellTemplates: this.cellTemplates,
        get selection() {
          return selectionRef();
        },
        features: this.features,
        activeFilterCount: computed(() => filtersRef()?.count() ?? 0),
        columnLayout: this.columnLayout,
        onColumnLayoutChange: (next) => {
          this.columnLayoutChange.emit(next);
        },
        defaultColumnLayout: this.defaultColumnLayout(),
        get onColumnRename() {
          return readRename();
        },
        injector,
      })
    );
    const filters =
      filtersOn || headerOn
        ? resources.use(
            "filters",
            [
              filtersOn,
              headerOn,
              this.filtersMode(),
              this.closeHeaderFilterOnSelect(),
            ],
            () =>
              filtersViewFor({
                table,
                source,
                runtime: data.runtime,
                mode: this.filtersMode(),
                button: filtersOn,
                header: headerOn,
                closeHeaderFilterOnSelect: this.closeHeaderFilterOnSelect(),
                dir: table.dir,
                extraChips: this.extraChips,
                form: this.filtersForm,
                trigger: this.filtersTrigger,
              })
          )
        : undefined;
    filtersRef.set(filters);
    const confirm: ConfirmHandler = (request) => {
      (this.confirm() ?? defaultConfirm)(request);
    };
    const rowMutations = resources.use(
      "mutations",
      [
        featureOptions.onAddRow,
        featureOptions.onDuplicateRow,
        featureOptions.onDeleteRow,
        featureOptions.confirmDeleteRow,
      ],
      (injector) =>
        injectRowMutations<TRow>(
          computed(() => ({
            onAddRow: featureOptions.onAddRow as (() => unknown) | undefined,
            onDuplicateRow: featureOptions.onDuplicateRow as
              ((row: TRow) => unknown) | undefined,
            onDeleteRow: featureOptions.onDeleteRow as
              ((row: TRow) => unknown) | undefined,
            confirmDeleteRow: featureOptions.confirmDeleteRow as
              boolean | undefined,
            labels: table.labels(),
          })),
          injector
        )
    );
    const rowActions = computed(() =>
      withRowMutationActions({
        host: featureOptions.rowActions as RowAction<TRow>[] | undefined,
        mutations: rowMutations().actions,
        actionsHidden: table.layout().isHidden(ACTIONS_COLUMN_KEY),
      })
    );
    const history = resources.use(
      "history",
      [featureOptions.editHistory, featureOptions.onCellEdit],
      (injector) =>
        historyFor(
          featureOptions,
          computed(() => table.allColumns()),
          injector
        )
    );
    const bulkBar =
      bulk && selection
        ? computed((): BulkBarSlotProps<SelectionState> => ({
            selection: selection.state(),
            total: source().total,
            bulkActions: bulk,
            confirm,
            labels: table.labels(),
          }))
        : undefined;
    const find = resources.use(
      "find",
      [featureOptions.findInTable, urlAdapter, this.urlKey()],
      (injector) =>
        findStateFor({
          enabled: featureOptions.findInTable === true,
          table,
          urlAdapter,
          urlSync: true,
          urlKey: this.urlKey(),
          injector,
        })
    );
    const grid = resources.use(
      "grid",
      [
        this.cellNavigation(),
        featureOptions.cellNavigation,
        find,
        history,
        featureOptions.onCellEdit,
        featureOptions.onCellPaste,
        featureOptions.onCellFill,
        featureOptions.getCellSpan,
      ],
      (injector) =>
        this.cellNavigation() || featureOptions.cellNavigation === true
          ? injectGridFocus({
              table,
              enabled: true,
              scrollToRow: (index) => this.scrollToGridRow?.(index),
              find,
              onActivate: (cell) => {
                const rows = table.rows();
                const row = rows[cell.row - table.windowStart()];
                const column = table.columns()[cell.col];
                if (row === undefined || column === undefined) return;
                const rowId = table.rowKey(row);
                // Covered cells have no editor in the rendered body. Resolve
                // the current row and column at the key press, then let core
                // apply the same permission and editor gates as a pointer.
                if (
                  !this.view()
                    ?.bodyCells()
                    .get(rowId)
                    ?.some((entry) => entry.column.key === column.key)
                )
                  return;
                editableCellController({
                  editing: this.view()?.editing?.(),
                  row,
                  column,
                  rowId,
                  rows,
                  columns: table.allColumns(),
                  rowKey: table.rowKey,
                }).begin();
              },
              host: computed(
                () =>
                  ({
                    onCellEdit: featureOptions.onCellEdit,
                    onCellPaste: featureOptions.onCellPaste,
                    onCellFill: featureOptions.onCellFill,
                    getCellSpan: featureOptions.getCellSpan,
                  }) as CellNavigationChannelsOptions<TRow>["host"]
              ),
              recordEdits: history?.().history.record,
              onUndo: history?.().history.undo,
              onRedo: history?.().history.redo,
              onCut: (range) => {
                this.cutSelection(range);
              },
              injector,
            })
          : undefined
    );
    const root = (): HTMLElement | null => this.root()?.nativeElement ?? null;
    resources.use("find-chrome", [find, grid], (injector) =>
      wireFindChrome({ find, grid, root, injector })
    );
    const densityState = resources.use(
      "density",
      [featureOptions.densityChooser, urlAdapter, this.urlKey()],
      (injector) =>
        featureOptions.densityChooser === true
          ? injectDensity({
              urlAdapter,
              urlKey: this.urlKey(),
              injector,
            })
          : undefined
    );
    const density = computed(() =>
      resolveDensity(this.density(), densityState?.density())
    );
    const fullscreen = resources.use(
      "fullscreen",
      [featureOptions.fullscreen],
      (injector) =>
        featureOptions.fullscreen === true
          ? injectFullscreen(
              computed(() => this.root()?.nativeElement),
              injector
            )
          : undefined
    );
    const savedViewsOption = featureOptions.savedViews as
      SavedViewsControllerOptions | undefined;
    const savedViews = savedViewsOption
      ? computed((): SavedViewsSlotProps<SavedViewsControllerOptions> => ({
          // The views capture and apply through the table's own backend
          // and namespace; the host's explicit values still win.
          options: {
            urlAdapter,
            urlKey: this.urlKey(),
            ...savedViewsOption,
          },
          labels: table.labels(),
        }))
      : undefined;
    const columnMenuProps = computed((): ColumnMenuSlotProps<never> => ({
      allColumns: table.allColumns() as never,
      layout: table.layout(),
      labels: table.labels(),
      dir: table.dir(),
      sortBy: table.sortBy(),
      sortDir: table.sortDir(),
      onAutoSize: () => {
        table.autoSizeColumns(root());
      },
      onAutoSizeColumn: (key) => {
        table.autoSizeColumn(root(), key);
      },
      onSortColumn: (key, dir) => {
        table.source().setSort(key, dir);
      },
      onRenameColumn: this.onColumnRename()
        ? table.layout().setName
        : undefined,
      hasRowActions: mergedActions().hasRowActions,
    }));
    const grouping = resources.use(
      "grouping",
      [
        features.some((feature) => feature.id === "grouping"),
        features.find((feature) => feature.id === "grouping-panel"),
        featureOptions.groupBy,
        featureOptions.onGroupByChange,
        featureOptions.groupFooters,
        featureOptions.groupPageSize,
        featureOptions.groupRowPageSize,
        featureOptions.groupFilter,
        featureOptions.groupSort,
        featureOptions.groupAggregates,
        featureOptions.collapsedGroupIds,
        featureOptions.onCollapsedGroupIdsChange,
        featureOptions.onGroupLoadMore,
        featureOptions.extraRows,
      ],
      (injector) =>
        injectGrouping<TRow>({
          table,
          source,
          features,
          injector,
        })
    );
    groupingRef.set(grouping);
    const tree = resources.use(
      "tree",
      [
        features.some((feature) => feature.id === "tree"),
        featureOptions.getChildren,
        featureOptions.getParentId,
        featureOptions.hasChildren,
        featureOptions.treeColumn,
        featureOptions.onLoadChildren,
        featureOptions.expandedIds,
        featureOptions.onExpandedIdsChange,
      ],
      (injector) => injectTree<TRow>({ table, source, features, injector })
    );
    const rowDetail = resources.use(
      "detail",
      [
        features.some(
          (feature) =>
            feature.id === "row-detail" || feature.id === "nested-table"
        ),
        featureOptions.renderRowDetail,
        featureOptions.nestedTable,
        featureOptions.defaultExpandedRowIds,
      ],
      (injector) => injectRowDetail<TRow>({ features, injector })
    );
    // Pinning refuses a grouped table or a tree: a nested list is not a flat
    // pin stack.
    const pinning = resources.use(
      "pinning",
      [
        featureOptions.rowPinningArmed,
        featureOptions.pinnedRowIds,
        featureOptions.onPinnedRowIdsChange,
        grouping,
        tree,
        urlAdapter,
        this.urlKey(),
      ],
      (injector) =>
        injectTableRowPinning<TRow>({
          features,
          getRowId: (row) => this.rowKey()(row),
          labels: table.labels,
          blocked: computed(
            () => grouping?.() !== undefined || tree?.() !== undefined
          ),
          urlAdapter,
          urlSync: true,
          urlKey: this.urlKey(),
          injector,
        })
    );
    const pinningRef = resources.use("pinning-ref", [], () =>
      signal<typeof pinning>(undefined)
    );
    pinningRef.set(pinning);
    const livePinning = resources.use("live-pinning", [], () =>
      computed(() => pinningRef()?.())
    );
    const pinnedRows = computed(() => {
      const pins = pinning?.();
      return pins
        ? partitionPinnedRows(table.source().rows, pins.state, (row) =>
            this.rowKey()(row)
          )
        : undefined;
    });
    const summaryRows = featureOptions.pinnedRows as
      PinnedRows<TRow> | undefined;
    const extraRows = featureOptions.extraRows as
      readonly ExtraRow[] | undefined;
    const getCellSpan = featureOptions.getCellSpan as
      GetCellSpan<TRow> | undefined;
    const exportOption = featureOptions.exportCsv as
      boolean | ExportCsvOptions<TRow> | undefined;
    const treeShape = featureOptions as TreeShape<TRow>;
    const exporter = resources.use(
      "export",
      [
        exportOption,
        selection,
        grid,
        grouping,
        tree,
        getCellSpan,
        table.featureHost,
      ],
      (injector) =>
        exportOption === undefined || exportOption === false
          ? undefined
          : injectExportCsv<TRow>({
              exportCsv: exportOption,
              source: table.source,
              columns: table.columns,
              context: computed(() => {
                const currentTree = tree?.();
                const getChildren = currentTree
                  ? treeShape.getChildren
                  : undefined;
                const getParentId = currentTree
                  ? treeShape.getParentId
                  : undefined;
                return {
                  selectedIds: selection?.selectedIds(),
                  getRowId: (row: TRow) => this.rowKey()(row),
                  allColumns: table.allColumns(),
                  range: grid?.range(),
                  firstRowIndex: table.windowStart(),
                  getCellSpan,
                  grouping: grouping?.(),
                  tree: currentTree
                    ? {
                        ...currentTree,
                        ...(getChildren ? { getChildren } : {}),
                        ...(getParentId ? { getParentId } : {}),
                      }
                    : undefined,
                  groupTotal: table.labels().groupTotal,
                  summaryRow: this.summaryRow(),
                };
              }),
              labels: table.labels,
              featureHost: table.featureHost,
              injector,
            })
    );
    const toolbarExtras = computed((): ToolbarExtrasSlotProps => ({
      density: density(),
      onDensityChange: (next) => {
        requestDensityChange(next, {
          controlled: this.density() !== undefined,
          setFeatureDensity: densityState?.setDensity,
          onDensityChange: (value) => {
            this.densityChange.emit(value);
          },
        });
      },
      onToggleFullscreen: fullscreen?.().supported
        ? fullscreen().toggle
        : undefined,
      isFullscreen: fullscreen?.().active,
      ...exporter?.(),
      ...(history
        ? undoRedoToolbarProps(
            featureOptions.undoRedoButtons === true,
            history().history,
            table.labels()
          )
        : {}),
      ...printToolbarProps(
        featureOptions.printButton === true,
        featureOptions.onPrint as (() => void) | undefined,
        table.labels()
      ),
      labels: table.labels(),
    }));
    const assembly = featureOptions.assembly as
      Partial<AssemblyFns<TRow>> | undefined;
    const rowClassName = featureOptions.rowClassName as
      ((row: TRow, index: number) => string | undefined) | undefined;
    const rowStyle = featureOptions.rowStyle as RowStyle<TRow> | undefined;
    const rowHeight = featureOptions.rowHeight as RowHeight<TRow> | undefined;
    const isCellFlashing = (rowId: string, columnKey: string): boolean => {
      const reader =
        this.isCellFlashing() ??
        (featureOptions.isCellFlashing as
          ((rowId: string, columnKey: string) => boolean) | undefined);
      return reader?.(rowId, columnKey) ?? false;
    };
    // The pin entries ride the actions column beside the host's actions.
    const mergedActions = computed(() =>
      withRowPinActions({
        rowActions: rowActions().rowActions,
        hasRowActions: rowActions().hasRowActions,
        pinning: pinning?.() !== undefined,
        pins: pinning?.()?.actions ?? [],
        actionsHidden: table.layout().isHidden(ACTIONS_COLUMN_KEY),
      })
    );
    const groupingPanel = resources.use(
      "grouping-panel",
      [features.find((feature) => feature.id === "grouping-panel"), grouping],
      (injector) =>
        injectGroupingPanelState({
          table,
          source: viewSource,
          features,
          grouping,
          injector,
        })
    );
    const reorder = resources.use(
      "reorder",
      [features.find((feature) => feature.id === "row-reorder"), grouping],
      (injector) =>
        injectRowReorder({
          table,
          source: viewSource,
          features,
          grouping,
          injector,
        })
    );
    const editing = resources.use(
      "editing",
      [
        featureOptions.onCellEdit,
        featureOptions.rowEditing,
        featureOptions.onRowEdit,
        featureOptions.batchEditing,
        featureOptions.onBatchEdit,
        featureOptions.dirtyIndicators,
        featureOptions.onDirtyChange,
        featureOptions.onEditStart,
        featureOptions.onEditCancel,
        featureOptions.onEditCommit,
        featureOptions.validateRow,
        featureOptions.applyEdit,
        featureOptions.onEditRollback,
        featureOptions.formatEditError,
        featureOptions.onEditError,
        featureOptions.rowEditIcons,
        featureOptions.onValidationFail,
        featureOptions.rowVersion,
        featureOptions.editConflictPolicy,
        featureOptions.onEditConflict,
        featureOptions.editActivation,
        history,
        grouping,
      ],
      (injector) =>
        editingBundleFor<TRow>({
          live: computed(() => ({
            rows: renderedRowsOf({
              source: viewSource(),
              grouping: grouping?.(),
            }),
            columns: table.allColumns(),
            rowKey: this.rowKey(),
            rowVersion:
              this.rowVersion() ??
              (featureOptions.rowVersion as LiveEditConflictInput<TRow>["rowVersion"]),
            editConflictPolicy:
              this.editConflictPolicy() ??
              (featureOptions.editConflictPolicy as
                EditConflictPolicy | undefined),
            onEditConflict:
              this.onEditConflict() ??
              (featureOptions.onEditConflict as
                EditConflictHandler<TRow> | undefined),
          })),
          featureOptions: editingOptionsFor(featureOptions, history),
          activation: computed(
            () =>
              this.editActivation() ??
              (featureOptions.editActivation as
                "doubleClick" | "click" | undefined)
          ),
          columns: computed(() => table.allColumns()),
          get featureHost() {
            return table.featureHost;
          },
          labels: table.labels,
          injector,
        })
    );

    const batchBar =
      editing === undefined
        ? undefined
        : computed((): BatchEditBarProps<TRow> | undefined => {
            const current = editing();
            if (current.batch === undefined) return undefined;
            return {
              batch: current.batch,
              contested: current.conflict?.anyContested,
              labels: table.labels(),
            };
          });
    const bodyWindow = resources.use(
      "body-window",
      [
        grouping,
        tree,
        rowDetail,
        pinning,
        featureOptions.virtualize,
        featureOptions.estimateRowSize,
        featureOptions.estimateCardSize,
        featureOptions.rowHeight,
        featureOptions.virtualOverscan,
        featureOptions.virtualScrollMargin,
        this.maxHeight() != null,
      ],
      (injector) =>
        bodyWindowFor({
          table,
          grouping,
          tree,
          expandable: rowDetail !== undefined,
          scrollRows: computed(
            () => pinnedRows()?.scroll ?? table.source().rows
          ),
          featureOptions,
          rowKey: (row) => this.rowKey()(row),
          maxHeight: this.maxHeight(),
          scrollBox: () =>
            (table.isMobile()
              ? this.mobileCards()?.scrollElement()
              : this.desktopTable()?.scrollElement()) ?? null,
          root: () => this.root()?.nativeElement ?? null,
          injector,
        })
    );
    this.scrollToGridRow = (index) => {
      const row = table.rows()[index - table.windowStart()];
      if (row === undefined) return;
      const rows = pinnedRows()?.scroll ?? table.source().rows;
      const localIndex = rows.indexOf(row);
      const window = bodyWindow();
      if (
        localIndex < 0 ||
        window.virtualization.rows.some((entry) => entry.row === row)
      )
        return;
      window.scrollToRowIndex?.(localIndex);
    };
    resources.use("find-window", [find, bodyWindow], (injector) =>
      scrollFindWindow({
        find,
        rows: computed(() => table.source().rows),
        firstRowIndex: computed(() => table.windowStart()),
        scrollToIndex: () => bodyWindow().scrollToRowIndex,
        injector,
      })
    );
    const rowKey = computed(() => this.rowKey());
    const rowActionList = computed(() => mergedActions().rowActions);
    const columnWindow = resources.use(
      "column-window",
      [featureOptions.virtualizeColumns],
      (injector) =>
        injectColumnWindow<TRow>({
          columns: table.columns,
          enabled: featureOptions.virtualizeColumns === true,
          widths: computed(() => table.layout().state.widths),
          pinnedKeys: computed(() => {
            const { pinned } = table.layout().state;
            return new Set(
              Object.keys(pinned).filter((key) => pinned[key] !== undefined)
            );
          }),
          getScrollElement: () => this.desktopTable()?.scrollElement() ?? null,
          injector,
        })
    );
    const surface = buildSurfaceBody({
      table,
      bodyWindow,
      columnWindow,
      selection,
      grid,
      editing,
      reorder,
      grouping,
      rowDetail,
      pinnedRows,
      summaryRows,
      extraRows,
      getCellSpan,
      rowActionList,
      rowKey,
      assembly,
      rowClassName,
      rowStyle,
      rowHeight,
      density,
      labels,
      featureOptions,
      maxHeight: () => this.maxHeight(),
      stickyHeader: () => this.stickyHeader(),
      stickyTop: () => this.stickyTop(),
      onRowClick: () => this.onRowClick(),
      summaryRow: () => this.summaryRow(),
    });
    const {
      body,
      bodyCells,
      showActions,
      bodyColSpan,
      renderedColumns,
      columnSpacers,
      columnIndex,
      virtualization,
      groupHeaders,
      editableCells,
      actionsCells,
      expandToggles,
      summary,
      showSummary,
      detailParent,
      stickyHead,
      reportHeaderHeight,
    } = surface;
    const findBar = findBarFor(find, table.labels);
    const commandPalette = commandPalettePropsFor({
      commandPalette:
        featureOptions.commandPalette as CommandPaletteInjectOptions["commandPalette"],
      onPrint: featureOptions.onPrint as (() => void) | undefined,
      labels: table.labels,
      dir: table.dir,
      clearFilters: table.clearFilters,
      featureHost: table.featureHost,
      exportCsv: exporter,
      filterCount: computed(() => filtersRef()?.count() ?? 0),
    });
    const contextMenu = mountedContextMenu({
      contextMenu:
        featureOptions.contextMenu as TableContextMenuOptions<TRow>["contextMenu"],
      table,
      pinning,
      grid,
      filters,
      rowKey: (row) => this.rowKey()(row),
      onCellCut: this.onCellCut,
    });
    const cellAttrs = cellAttrsWithFind(table, grid, find);
    const markedCellAttrs = (
      column: ColumnDef<TRow>,
      index: number,
      col: number,
      rowId?: string
    ): Attrs => {
      return {
        ...cellAttrs(column, index, col),
        "data-flash":
          rowId !== undefined && isCellFlashing(rowId, column.key)
            ? ""
            : undefined,
      };
    };
    const currentVirtualization = resources.use("view-virtualization", [], () =>
      signal(virtualization)
    );
    currentVirtualization.set(virtualization);
    const viewTable = resources.use("view-table", [table], () => {
      // Feature capabilities remain live getters on this stable view identity.
      const model = Object.defineProperties(
        { ...table },
        Object.getOwnPropertyDescriptors(table)
      );
      // A page sentinel below a bounded virtual body never leaves view.
      // The virtualizer requests more rows only at its own scroll end.
      Object.defineProperty(model, "canLoadMore", {
        value: computed(
          () =>
            table.canLoadMore() &&
            !(this.maxHeight() != null && currentVirtualization()().enabled)
        ),
      });
      return model;
    });
    this.view.set({
      table: viewTable,
      classNames: this.classNames,
      renderCard: this.renderCard,
      renderRowActions: this.renderRowActions,
      isCellFlashing,
      selection,
      grid,
      findBar,
      commandPalette,
      contextMenu,
      markedCellAttrs,
      columnMenu: table.featureOptions.enableColumnMenu === true,
      columnMenuProps,
      filters,
      bulkBar,
      rowActions: rowActionList,
      density,
      stickyHead,
      reportHeaderHeight,
      toolbarExtras,
      rowMutations,
      savedViews,
      groupingPanel,
      reorder,
      tree,
      treeCellFilled: table.slotFills.has(TREE_CELL.id),
      columnSelect:
        grid !== undefined && featureOptions.columnSelectionCheckbox === true,
      rowDetail,
      bodyCells,
      cellSpanAppearance: featureOptions.cellSpanAppearance as
        CellSpanAppearance | undefined,
      expandToggles,
      detailParent,
      summary,
      showSummary,
      editing,
      editableCells,
      showActions,
      actionsCells,
      batchBar,
      grouping,
      virtualization,
      body,
      groupHeaders,
      bodyColSpan,
      columns: renderedColumns,
      columnSpacers,
      columnIndex,
      rowActionsLayout: featureOptions.rowActionsLayout as
        RowActionsLayout | undefined,
      confirm,
    });
    table.featureState.set(SURFACE_OCCUPIED, {
      grid: grid !== undefined,
      grouping: grouping !== undefined,
      editing: editing !== undefined,
    });
    resources.use("mounted-features", [], (injector) => {
      const liveFeatures = computed(() =>
        tableFeaturesOf(this.injector, this.features())
      );
      const runtime = tableRuntimeFor(
        table,
        viewSource,
        liveFeatures,
        computed(() => this.view()?.grouping?.()),
        computed(() => {
          const current = this.view();
          const options = liveOptions();
          return {
            filterDefs: data.runtime().defs,
            filterRegistry: data.runtime().registry,
            columnLayoutLive: liveFeatures().some((feature) =>
              [
                "column-menu",
                "resizable-columns",
                "collapsible-column-groups",
                "context-menu",
                "saved-views",
                "fit-columns",
              ].includes(feature.id ?? "")
            ),
            selection: current?.selection?.state(),
            tree: current?.tree?.(),
            rowPinning: livePinning(),
            editing: current?.editing?.(),
            rowActions: options.rowActions as
              readonly RowAction<TRow>[] | undefined,
            bulkActions: options.bulkActions as
              readonly BulkAction[] | undefined,
          };
        })
      );
      return mountTableFeatures(liveFeatures, {
        runtime,
        state: table.featureState,
        injector,
      });
    });
  }
}

/** Grouping keys from a feature patch, which may be one key or a list. */
function groupByKeys(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value as readonly string[];
}

/** What the status strip shows for one table. */
function statusBarSlotProps<TRow>(
  view: TableView<TRow>,
  options: Readonly<Record<string, unknown>>
) {
  const source = view.table.source();
  const columns = view.table.columns();
  const keys = groupByKeys(options.groupBy);
  const labels = view.table.labels();
  return {
    enabled: options.statusBar === true,
    shown: source.rows.length,
    page: source.page,
    limit: source.limit,
    total: source.total,
    selected: view.selection?.selectedCount() ?? 0,
    stats:
      options.selectionStats === true
        ? selectionStatsOf({
            enabled: true,
            range: view.grid?.range() ?? null,
            rows: source.rows,
            columns,
            firstRowIndex: view.table.windowStart(),
          })
        : null,
    labels,
    notices: chromeFeatureNotices({
      options: {
        virtualize: options.virtualize === true,
        onCellEdit: options.onCellEdit,
        rowEditing: options.rowEditing === true,
        onRowEdit: options.onRowEdit,
        batchEditing: options.batchEditing === true,
        onBatchEdit: options.onBatchEdit,
        exportCsv: options.exportCsv as
          boolean | ExportCsvOptions<TRow> | undefined,
        pinnedRowIds: options.pinnedRowIds,
        onPinnedRowIdsChange: options.onPinnedRowIdsChange,
      },
      source,
      groupByKeys: keys,
      rowReorderRequested:
        options.rowReorder != null && options.rowReorder !== false,
      nestedArmed:
        keys.length > 0 || options.tree != null || options.nestedTable != null,
      hasEditableColumn: columns.some((column) => column.editable != null),
      labels,
    }),
  };
}
