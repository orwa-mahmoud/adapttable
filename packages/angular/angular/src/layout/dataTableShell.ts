/** Shared Angular signals and lifecycle above injectDataTable; kits own all rendered controls. */
import {
  AdaptCellTemplate,
  type AdaptTableFeature,
  type Attrs,
  type BatchEditHandler,
  type CellEditHandler,
  COLUMN_MENU_TOOLBAR_STATE,
  type ColumnDef,
  type ColumnInput,
  createFeatureResources,
  type DataTable,
  type DataTableClassNames,
  DENSITY_TOOLBAR_STATE,
  type DensityToolbar,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditHistoryImplementation,
  type EditHistoryOptions,
  EXPORT_TOOLBAR_STATE,
  type ExportToolbar,
  FEATURE_IMPLEMENTATIONS,
  featureImplementation,
  featureOptionsOf,
  type FeatureResources,
  type FindInTableImplementation,
  flattenColumns,
  FULLSCREEN_TOOLBAR_STATE,
  type FullscreenToolbar,
  type GridFocus,
  injectDataTable,
  injectDensity,
  injectFullscreen,
  injectIsMobile,
  injectPrefersReducedMotion,
  injectRowMutations,
  injectRowSelection,
  injectTableData,
  type injectTableEditHistory,
  type LiveEditConflictInput,
  type MaybeSignalOptional,
  type MobileCardRenderer,
  mountTableFeatures,
  PRINT_TOOLBAR_STATE,
  type PrintToolbar,
  readMaybe,
  type RowActionsRenderer,
  type RowSelection,
  SAVED_VIEWS_TOOLBAR_STATE,
  type SummaryRowFn,
  SURFACE_GRID,
  SURFACE_OCCUPIED,
  TABLE_STORE,
  type TableAssistantProps,
  tableFeaturesOf,
  type TableQueryHandler,
  UNDO_REDO_TOOLBAR_STATE,
  type UndoRedoToolbar,
  urlAdapterFor,
} from "@adapttable/angular";
import { type SidePanelOptions } from "@adapttable/angular/features";
import {
  ACTIONS_COLUMN_KEY,
  type ActiveFilterChip,
  type BulkAction,
  type CellNavigationChannelsOptions,
  type CellRange,
  type CellSpanAppearance,
  type ColumnLayoutState,
  type ConfirmHandler,
  type Direction,
  type ExportCsvOptions,
  type ExtraFilters,
  type ExtraRow,
  type FilterDef,
  type FilterTypeSpec,
  type FrontendEngineFactory,
  type GetCellSpan,
  type PaginationMode,
  type PinnedRows,
  type RowAction,
  type RowActionsLayout,
  type RowHeight,
  type RowStyle,
  type SavedViewsControllerOptions,
  sourceCapabilities,
  type TableDensity,
  type TableLabels,
  type TableQueryParams,
  type TableSource,
  type TreeShape,
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
  createTableStore,
  defaultConfirm,
  type FeatureListEntry,
  FILTER_DRAWER,
  FILTER_ENGINE,
  FILTER_HEADER,
  FILTER_POPOVER,
  FILTERS_FORM,
  FILTERS_ICON,
  FIND_BAR,
  type FindBarProps,
  type FindInTableState,
  flattenFeatures,
  GROUPING_PANEL,
  MOUNT_STAGGER,
  printToolbarProps,
  projectedGroupingSource,
  renderedRowsOf,
  reportFailure,
  requestDensityChange,
  resolveDensity,
  ROW_REORDER_ANNOUNCER,
  type RowMutationsState,
  sameItems,
  SAVED_VIEWS,
  type SavedViewsSlotProps,
  SEARCH_ICON,
  selectionResetKey,
  type SelectionState,
  SIDE_PANEL,
  type SidePanelSide,
  STATUS_BAR,
  TABLE_ASSISTANT,
  TOOLBAR_EXTRAS,
  type ToolbarEntrySlotProps,
  TREE_CELL,
  undoRedoToolbarProps,
  withRowMutationActions,
  withRowPinActions,
} from "@adapttable/core/binding";
import { loadLabels } from "@adapttable/i18n";
import {
  afterRenderEffect,
  computed,
  contentChild,
  contentChildren,
  DestroyRef,
  Directive,
  effect,
  type ElementRef,
  inject,
  Injector,
  input,
  type OnInit,
  output,
  PendingTasks,
  type Signal,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
} from "@angular/core";

import { mountForcedColorsStyles } from "../a11y/forcedColors";
import { type CommandPaletteInjectOptions } from "../actions/commandPalette";
import {
  COMMAND_PALETTE_VIEW,
  CONTEXT_MENU_VIEW,
} from "../actions/regionViewKeys";
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
import { staggerMounted } from "../motion/mountStagger";
import type { KitEnvironment } from "./kitEnvironment";
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
import { injectGrouping, type TableGrouping } from "../grouping/tableGrouping";
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
  implementation: EditHistoryImplementation | undefined,
  featureOptions: Readonly<Record<string, unknown>>,
  columns: Signal<readonly ColumnDef<TRow>[]>,
  injector: Injector
): ReturnType<typeof injectTableEditHistory<TRow>> | undefined {
  if (
    implementation === undefined ||
    featureOptions.editHistory === undefined ||
    featureOptions.editHistory === false
  )
    return undefined;
  return implementation.inject<TRow>(
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
  history: ReturnType<typeof injectTableEditHistory<TRow>> | undefined,
  implementation: EditHistoryImplementation | undefined
): Readonly<Record<string, unknown>> {
  if (!history || !implementation) return featureOptions;
  return {
    ...featureOptions,
    onCellEdit: history().onCellEdit,
    onBatchEdit: implementation.batchGesture(
      featureOptions.onBatchEdit as BatchEditHandler<TRow> | undefined,
      history().history.record
    ),
  };
}

/** The live find state, when the feature is composed. */
function findStateFor<TRow>(options: {
  readonly implementation: FindInTableImplementation | undefined;
  readonly enabled: boolean;
  readonly table: DataTable<TRow>;
  readonly urlAdapter: ReturnType<typeof urlAdapterFor>;
  readonly urlSync: boolean;
  readonly urlKey: string | undefined;
  readonly injector: Injector;
}): Signal<FindInTableState> | undefined {
  const { implementation, table } = options;
  if (!options.enabled || !implementation) return undefined;
  return implementation.state<TRow>({
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
  readonly implementation: FindInTableImplementation | undefined;
  readonly find: Signal<FindInTableState> | undefined;
  readonly grid: GridFocus<TRow> | undefined;
  readonly root: () => HTMLElement | null;
  readonly injector: Injector;
}): void {
  const { implementation, find, grid, injector } = options;
  if (!find || !implementation) return;
  const current = computed(() => find().current);
  implementation.shortcut({
    root: options.root,
    openBar: computed(() => find().openBar),
    injector,
  });
  implementation.scroll({
    root: options.root,
    current,
    enabled: computed(() => grid === undefined),
    injector,
  });
  if (!grid) return;
  implementation.focus({
    find,
    focusCell: grid.focusCell,
    selectRange: grid.selectRange,
    enabled: grid.enabled,
    injector,
  });
}

/** Ask a flat virtual window to render the current match. */
function scrollFindWindow<TRow>(options: {
  readonly implementation: FindInTableImplementation | undefined;
  readonly find: Signal<FindInTableState> | undefined;
  readonly rows: Signal<readonly TRow[]>;
  readonly firstRowIndex: Signal<number>;
  readonly scrollToIndex: () => ((index: number) => void) | undefined;
  readonly injector: Injector;
}): void {
  const { implementation, find } = options;
  if (!find || !implementation) return;
  implementation.windowScroll({
    current: computed(() => find().current),
    rows: options.rows,
    firstRowIndex: options.firstRowIndex,
    scrollToIndex: options.scrollToIndex,
    injector: options.injector,
  });
}

/**
 * Host-owned row mutations, while row actions wire an add, duplicate or
 * delete handler.
 */
function rowMutationsFor<TRow>(
  resources: FeatureResources,
  options: Readonly<Record<string, unknown>>,
  labels: Signal<Required<TableLabels>>
): Signal<RowMutationsState<TRow>> | undefined {
  const { onAddRow, onDuplicateRow, onDeleteRow, confirmDeleteRow } = options;
  if (
    onAddRow === undefined &&
    onDuplicateRow === undefined &&
    onDeleteRow === undefined
  ) {
    return undefined;
  }
  return resources.use(
    "mutations",
    [onAddRow, onDuplicateRow, onDeleteRow, confirmDeleteRow],
    (injector) =>
      injectRowMutations<TRow>(
        computed(() => ({
          onAddRow: onAddRow as (() => unknown) | undefined,
          onDuplicateRow: onDuplicateRow as
            ((row: TRow) => unknown) | undefined,
          onDeleteRow: onDeleteRow as ((row: TRow) => unknown) | undefined,
          confirmDeleteRow: confirmDeleteRow as boolean | undefined,
          labels: labels(),
        })),
        injector
      )
  );
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
  find: Signal<FindInTableState> | undefined,
  implementation: FindInTableImplementation | undefined
): (column: ColumnDef<TRow>, index: number, col: number) => Attrs {
  return (column, index, col) => {
    if (grid) return grid.cellAttrs(column, index, col);
    const base = table.cellAttrs(column);
    const state = find?.();
    if (!state?.open || !implementation) return base;
    return implementation.markAttrs(base, state, {
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
  /** Props for the command-palette slot, when a feature fills it. */
  readonly commandPalette: Signal<CommandPaletteInjectOptions> | undefined;
  /** Props for the context-menu slot, when a feature fills it. */
  readonly contextMenu:
    | Signal<
        TableContextMenuOptions<TRow> & {
          readonly children: (
            regionProps: Record<string, unknown>
          ) => undefined;
        }
      >
    | undefined;
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
  /** The filters, when a filters feature is composed. */
  readonly filters: FiltersView | undefined;
  /** The selection bar's props, when bulk actions are composed. */
  readonly bulkBar: Signal<BulkBarSlotProps<SelectionState>> | undefined;
  /** The actions column's list, absent while hidden or empty. */
  readonly rowActions: Signal<RowAction<TRow>[] | undefined>;
  /** A strip of buttons, or a menu. */
  readonly rowActionsLayout: RowActionsLayout | undefined;
  /** Host-owned row additions and mutations, when row actions wire any. */
  readonly rowMutations: Signal<RowMutationsState<TRow>> | undefined;
  /** Asks before an action that declares a `confirm`. */
  readonly confirm: ConfirmHandler;
  /**
   * The id selection uses for a row. A composed `selection({ getId })`
   * supplies it; otherwise it is the table row key.
   */
  readonly selectionRowId: (row: TRow) => string;
  /** What every toolbar entry receives: the labels. */
  readonly toolbarEntry: Signal<ToolbarEntrySlotProps>;
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
   * Every row; the table searches, sorts and pages them itself. The host owns
   * the array.
   */
  readonly data = input<readonly TRow[]>();
  /**
   * A prebuilt source in place of `data`: `injectServerData`'s for rows a
   * server pages, sorts and filters, `injectQuerySource`'s, or any
   * `TableSource`. Replacements and signal updates stay live.
   */
  readonly source = input<Signal<TableSource<TRow>> | TableSource<TRow>>();
  /**
   * Told of each committed change to page, page size, search, sort and
   * filters of a table over `data`, never of the mount. The table keeps
   * processing `data`.
   */
  readonly onViewChange = input<TableQueryHandler>();
  /** The rows of `data` are still loading. */
  readonly loading = input<boolean>();
  /** A failure to show. */
  readonly error = input<Error | null>();
  /** The columns in order, and header groups over them. */
  readonly columns = input.required<readonly ColumnInput<TRow>[]>();
  /** A row's stable id. */
  readonly rowKey = input.required<(row: TRow) => string>();
  /** The table's accessible name. Defaults to the `table` label. */
  readonly tableLabel = input<string>();
  /**
   * Text direction. An explicit value wins. Otherwise a kit may supply its
   * library's direction. With neither, the table stays left to right.
   */
  readonly dir = input<Direction>();
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
   * `"infinite"` with `virtualize` so the body windows.
   */
  readonly paginationMode = input<PaginationMode>();
  /**
   * Cap the table body's height; the body scrolls inside the box and a
   * composed `virtualize` tracks the box instead of the page.
   */
  readonly maxHeight = input<number | string>();
  /**
   * How many placeholder rows the first-load skeleton draws. Absent, the
   * page size.
   */
  readonly skeletonRows = input<number>();
  /** Which edge a projected side panel sits on. */
  readonly sidePanelSide = input<SidePanelSide>("end");
  /**
   * The live features this table composes, such as `columnMenu()`. Replacing
   * the list updates options, slots and mounted behavior.
   */
  readonly features = input<
    readonly AdaptTableFeature[],
    readonly FeatureListEntry<AdaptTableFeature>[]
  >([], { transform: flattenFeatures });
  /** Optional conversation props drawn by a composed assistant feature. */
  readonly assistant = input<TableAssistantProps>();
  /** The column layout, to control it. */
  readonly columnLayout = input<ColumnLayoutState>();
  /** The layout an uncontrolled table starts from. Read once. */
  readonly defaultColumnLayout = input<Partial<ColumnLayoutState>>();
  /**
   * Animate rows and cards as they mount. Off by default. Skipped when the
   * reader prefers reduced motion.
   */
  readonly animate = input(false);
  /** Controlled row density. Omit to use the composed chooser's state. */
  readonly density = input<TableDensity>();
  /** Every density request; a controlled table waits for its density input. */
  readonly densityChange = output<TableDensity>();
  /**
   * Asks before an action that declares a `confirm`. Defaults to the
   * browser's `confirm`. Each request reads the current handler.
   */
  readonly confirm = input<ConfirmHandler>();
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
  protected readonly dockedSide: Signal<SidePanelSide> = computed(
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
  private readonly pendingTasks = inject(PendingTasks);
  private readonly reducedMotion = injectPrefersReducedMotion();
  private readonly root = viewChild<ElementRef<HTMLElement>>("root");
  /** Skips a repeat entrance when the row count and layout have not changed. */
  private staggerGeneration = "";
  /** Labels for the kit library's locale, once loaded. */
  private readonly libraryLabels = signal<
    | { readonly locale: string; readonly labels: TableLabels | undefined }
    | undefined
  >(undefined);

  /** Ctrl/Cmd+X and the menu's Cut, after the clipboard write succeeds. */
  private cutSelection(range: CellRange): void {
    const cut = featureOptionsOf(
      tableFeaturesOf(this.injector, this.features())
    ).onCellCut as ((range: CellRange) => void) | undefined;
    cut?.(range);
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

  constructor() {
    mountForcedColorsStyles(() =>
      tableFeaturesOf(this.injector, this.features())
    );
    // Only the library locale's language is fetched, and only when neither
    // the kit nor the host supplies labels.
    effect((onCleanup) => {
      const kit = this.kitEnvironment();
      if (kit.labels !== undefined || this.labels() !== undefined) return;
      const locale = kit.locale;
      if (locale === undefined) return;
      let current = true;
      onCleanup(() => {
        current = false;
      });
      // A pending task holds server rendering until the language arrives, so
      // the page is serialized in it rather than in English.
      // A language that fails to load keeps the current copy and still
      // settles the task, so server rendering does not wait on it.
      this.pendingTasks.run(async () => {
        try {
          const labels = await loadLabels(locale);
          if (current) this.libraryLabels.set({ locale, labels });
        } catch (error: unknown) {
          reportFailure(`labels for "${locale}" did not load`, error);
        }
      });
    });
    afterRenderEffect(() => {
      const current = this.view();
      const rows = current?.table.source().rows.length ?? 0;
      const mobile = current?.table.isMobile() ?? false;
      const enabled = this.animate();
      const reduced = this.reducedMotion();
      // Motion off or reduced: nothing plays, so nothing is looked up.
      if (!enabled || reduced) {
        this.staggerGeneration = `${enabled}:${reduced}:${rows}:${mobile ? 1 : 0}`;
        return;
      }
      const root = this.root()?.nativeElement;
      const marked = root?.querySelectorAll(MOUNT_STAGGER.selector).length ?? 0;
      const generation = `${enabled}:${reduced}:${rows}:${mobile ? 1 : 0}:${marked}`;
      if (!root || marked === 0 || generation === this.staggerGeneration)
        return;
      this.staggerGeneration = generation;
      staggerMounted({ root, enabled, reduced, rows, mobile });
    });
  }

  ngOnInit(): void {
    // One store per table: every part created below keeps its state in it.
    const tableInjector = Injector.create({
      providers: [{ provide: TABLE_STORE, useValue: createTableStore() }],
      parent: this.injector,
    });
    // It lives as long as the table, so what its parts register to run on
    // destroy runs when the table goes.
    this.injector.get(DestroyRef).onDestroy(() => tableInjector.destroy());
    const resources = createFeatureResources(tableInjector);
    const features = computed(
      () => tableFeaturesOf(this.injector, this.features()),
      {
        equal: sameItems,
      }
    );
    const inScrollBox = computed(() => this.maxHeight() != null);
    const configuration = computed(() => ({
      features: features(),
      inScrollBox: inScrollBox(),
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

  /**
   * The kit's library settings. The binding calls this while resolving
   * direction, labels, locale and density, so overrides must read signals
   * here rather than inject.
   */
  protected kitEnvironment(): KitEnvironment {
    return {};
  }

  /** Compose current chrome while retaining each unchanged controller scope. */
  private assembleTable(
    features: readonly AdaptTableFeature[],
    resources: FeatureResources
  ): void {
    const labels = computed((): TableLabels | undefined => {
      const placeholder = this.searchPlaceholder();
      const environment = this.kitEnvironment();
      const loaded = this.libraryLabels();
      const kit =
        environment.labels ??
        (loaded !== undefined && loaded.locale === environment.locale
          ? loaded.labels
          : undefined);
      const own = this.labels();
      const merged =
        own === undefined && kit === undefined ? undefined : { ...kit, ...own };
      return placeholder === undefined
        ? merged
        : { ...merged, searchPlaceholder: placeholder };
    });
    const liveFeatures = resources.use("features", [], () =>
      computed(() => tableFeaturesOf(this.injector, this.features()))
    );
    const liveOptions = resources.use("options", [], () =>
      computed(() => featureOptionsOf(liveFeatures()))
    );
    const featureOptions = liveOptions();
    // A feature's code arrives with the feature: a table that composes none
    // of these never reaches their implementations.
    const editHistoryCode = featureImplementation(
      features,
      FEATURE_IMPLEMENTATIONS.editHistory
    );
    const findCode = featureImplementation(
      features,
      FEATURE_IMPLEMENTATIONS.findInTable
    );
    const editableCell = featureImplementation(
      features,
      FEATURE_IMPLEMENTATIONS.editableCell
    );
    const exportCsv = featureImplementation(
      features,
      FEATURE_IMPLEMENTATIONS.exportCsv
    );
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
        onViewChange: this.onViewChange,
        loading: this.loading,
        error: this.error,
        columns: computed(() => flattenColumns(this.columns()).leaves),
        // Read live: the data tier outlives a change of features.
        get engine() {
          const current = liveOptions();
          return Array.isArray(current.filters) ||
            current.headerFilters === true
            ? featureImplementation(liveFeatures(), FILTER_ENGINE)
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
    const selectable = featureOptions.selectable === true || bulk !== undefined;
    const selectionController =
      selectable || selectionState.controller !== undefined
        ? resources.use("selection", [], (injector) =>
            injectRowSelection<TRow>({
              rows: computed(() => source().rows),
              rowKey: (row) => {
                const getId = liveOptions().selectionGetId as
                  ((row: TRow) => string) | undefined;
                return (getId ?? this.rowKey())(row);
              },
              selectedIds: computed(() => {
                const ids = liveOptions().selectedIds as
                  MaybeSignalOptional<readonly string[]> | undefined;
                return ids === undefined ? undefined : readMaybe(ids);
              }),
              defaultSelectedIds: featureOptions.defaultSelectedIds as
                readonly string[] | undefined,
              onSelectionChange: (ids) => {
                const change = liveOptions().onSelectionChange as
                  ((ids: string[]) => void) | undefined;
                change?.(ids);
              },
              labels,
              acrossPages: computed(
                () => sourceCapabilities(source()).selectAcrossPages
              ),
              resetKey: computed(() => selectionResetKey(source())),
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
    const table = resources.use("table", [], (injector) =>
      injectDataTable<TRow>({
        source: viewSource,
        columns: this.columns,
        rowKey: (row) => this.rowKey()(row),
        tableLabel: this.tableLabel,
        labels,
        dir: computed(() => this.dir() ?? this.kitEnvironment().dir ?? "ltr"),
        locale: computed(() => this.locale() ?? this.kitEnvironment().locale),
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
          const rename = liveOptions().onColumnRename;
          return typeof rename === "function"
            ? (rename as (key: string, name: string) => void)
            : undefined;
        },
        injector,
      })
    );
    const filterMode =
      (featureOptions.filtersMode as FiltersMode | undefined) ?? "popover";
    const filterFields = featureOptions.filterFields !== false;
    const closeHeaderFilter = featureOptions.closeHeaderFilterOnSelect === true;
    const filters =
      filtersOn || headerOn
        ? resources.use(
            "filters",
            [filtersOn, headerOn, filterMode, filterFields, closeHeaderFilter],
            () =>
              filtersViewFor({
                table,
                source,
                runtime: data.runtime,
                mode: filterMode,
                button: filtersOn,
                header: headerOn,
                fields: filterFields,
                closeHeaderFilterOnSelect: closeHeaderFilter,
                dir: table.dir,
                extraChips: computed(() => {
                  const chips = featureOptionsOf(
                    tableFeaturesOf(this.injector, this.features())
                  ).extraChips;
                  return (
                    (chips as readonly ActiveFilterChip[] | undefined) ?? []
                  );
                }),
                form: this.filtersForm,
                trigger: this.filtersTrigger,
              })
          )
        : undefined;
    filtersRef.set(filters);
    const confirm: ConfirmHandler = (request) => {
      (this.confirm() ?? defaultConfirm)(request);
    };
    const rowMutations = rowMutationsFor<TRow>(
      resources,
      featureOptions,
      table.labels
    );
    const rowActions = computed(() =>
      withRowMutationActions({
        host: featureOptions.rowActions as RowAction<TRow>[] | undefined,
        mutations: rowMutations?.().actions ?? [],
        actionsHidden: table.layout().isHidden(ACTIONS_COLUMN_KEY),
      })
    );
    const history = resources.use(
      "history",
      [editHistoryCode, featureOptions.editHistory, featureOptions.onCellEdit],
      (injector) =>
        historyFor(
          editHistoryCode,
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
      [findCode, featureOptions.findInTable, urlAdapter, this.urlKey()],
      (injector) =>
        findStateFor({
          implementation: findCode,
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
        featureOptions.cellNavigation,
        editableCell,
        find,
        history,
        featureOptions.onCellEdit,
        featureOptions.onCellPaste,
        featureOptions.onCellFill,
        featureOptions.getCellSpan,
      ],
      (injector) => {
        const createGrid = featureImplementation(
          features,
          FEATURE_IMPLEMENTATIONS.gridFocus
        );
        if (
          createGrid === undefined ||
          featureOptions.cellNavigation !== true
        ) {
          table.featureState.set(SURFACE_GRID, undefined);
          return undefined;
        }
        const created = createGrid({
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
            editableCell?.({
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
        });
        table.featureState.set(SURFACE_GRID, created);
        return created;
      }
    );
    const root = (): HTMLElement | null => this.root()?.nativeElement ?? null;
    resources.use("find-chrome", [find, grid], (injector) =>
      wireFindChrome({ implementation: findCode, find, grid, root, injector })
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
      resolveDensity(
        this.density() ?? this.kitEnvironment().density,
        densityState?.density()
      )
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
    const columnMenuProps = computed((): ColumnMenuSlotProps<unknown> => ({
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
      onRenameColumn: featureOptions.onColumnRename
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
    const pinningCode = featureImplementation(
      features,
      FEATURE_IMPLEMENTATIONS.rowPinning
    );
    const pinnedRows = computed(() => {
      const pins = pinning?.();
      return pins && pinningCode
        ? pinningCode.partition(table.source().rows, pins.state, (row) =>
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
        exportCsv,
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
          : exportCsv?.<TRow>({
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
    const densityToolbar = computed((): DensityToolbar => ({
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
      labels: table.labels(),
    }));
    const fullscreenToolbar = fullscreen
      ? computed((): FullscreenToolbar => ({
          onToggleFullscreen: fullscreen().supported
            ? fullscreen().toggle
            : undefined,
          isFullscreen: fullscreen().active,
          labels: table.labels(),
        }))
      : undefined;
    const exportToolbar = exporter
      ? computed((): ExportToolbar => ({
          ...exporter(),
          labels: table.labels(),
        }))
      : undefined;
    const printToolbar = computed((): PrintToolbar =>
      printToolbarProps(
        featureOptions.printButton === true,
        featureOptions.onPrint as (() => void) | undefined,
        table.labels()
      )
    );
    const undoRedoToolbar = history
      ? computed((): UndoRedoToolbar => ({
          ...undoRedoToolbarProps(
            featureOptions.undoRedoButtons === true,
            history().history,
            table.labels()
          ),
          labels: table.labels(),
        }))
      : undefined;
    const columnMenuToolbar =
      table.featureOptions.enableColumnMenu === true
        ? computed(() => (table.isMobile() ? undefined : columnMenuProps()))
        : undefined;
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
    // Editing code comes with the editing features; a table without one
    // never reaches it.
    const createEditing = featureImplementation(
      features,
      FEATURE_IMPLEMENTATIONS.editing
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
        featureOptions.editActivation,
        history,
        grouping,
      ],
      (injector) =>
        createEditing?.<TRow>({
          live: computed(() => {
            const options = liveOptions();
            return {
              rows: renderedRowsOf({
                source: viewSource(),
                grouping: grouping?.(),
              }),
              columns: table.allColumns(),
              rowKey: this.rowKey(),
              rowVersion:
                options.rowVersion as LiveEditConflictInput<TRow>["rowVersion"],
              editConflictPolicy: options.editConflictPolicy as
                EditConflictPolicy | undefined,
              onEditConflict: options.onEditConflict as
                EditConflictHandler<TRow> | undefined,
            };
          }),
          featureOptions: editingOptionsFor(
            featureOptions,
            history,
            editHistoryCode
          ),
          activation: computed(
            () =>
              featureOptionsOf(tableFeaturesOf(this.injector, this.features()))
                .editActivation as "doubleClick" | "click" | undefined
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
    const virtualizer = featureImplementation(
      liveFeatures(),
      FEATURE_IMPLEMENTATIONS.virtualize
    );
    const bodyWindow = resources.use(
      "body-window",
      [
        grouping,
        tree,
        rowDetail,
        pinning,
        featureOptions.virtualize,
        virtualizer,
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
          virtualizer,
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
        implementation: findCode,
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
    // The palette and the menu bring their props' builders with them.
    const commandPalette = featureImplementation(
      features,
      COMMAND_PALETTE_VIEW
    )?.({
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
    const contextMenu = featureImplementation(
      features,
      CONTEXT_MENU_VIEW
    )?.({
      contextMenu:
        featureOptions.contextMenu as TableContextMenuOptions<TRow>["contextMenu"],
      table,
      pinning,
      grid,
      filters,
      rowKey: (row) => this.rowKey()(row),
      onCellCut: computed(() => {
        const cut = featureOptionsOf(
          tableFeaturesOf(this.injector, this.features())
        ).onCellCut;
        return cut as ((range: CellRange) => void) | undefined;
      }),
    });
    const cellAttrs = cellAttrsWithFind(table, grid, find, findCode);
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
      selectionRowId: (row) => {
        const getId = liveOptions().selectionGetId as
          ((row: TRow) => string) | undefined;
        return (getId ?? this.rowKey())(row);
      },
      grid,
      findBar,
      commandPalette,
      contextMenu,
      markedCellAttrs,
      filters,
      bulkBar,
      rowActions: rowActionList,
      density,
      stickyHead,
      reportHeaderHeight,
      toolbarEntry: computed(() => ({ labels: table.labels() })),
      rowMutations,
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
    table.featureState.set(DENSITY_TOOLBAR_STATE, densityToolbar);
    table.featureState.set(FULLSCREEN_TOOLBAR_STATE, fullscreenToolbar);
    table.featureState.set(EXPORT_TOOLBAR_STATE, exportToolbar);
    table.featureState.set(PRINT_TOOLBAR_STATE, printToolbar);
    table.featureState.set(UNDO_REDO_TOOLBAR_STATE, undoRedoToolbar);
    table.featureState.set(SAVED_VIEWS_TOOLBAR_STATE, savedViews);
    table.featureState.set(COLUMN_MENU_TOOLBAR_STATE, columnMenuToolbar);
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
            find: find?.(),
            density: densityState
              ? {
                  density: densityState.density(),
                  onDensityChange: densityState.setDensity,
                }
              : undefined,
            fullscreen: fullscreen?.(),
            contextMenu: liveFeatures().some(
              (feature) => feature.id === "context-menu"
            )
              ? { items: table.featureHost.contextMenuItems }
              : undefined,
            commandPalette: paletteContribution(
              featureOptions.commandPalette,
              table.featureHost.commands
            ),
            print: printContribution(featureOptions),
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

/** The host's commands, when the palette is armed. The array is the host's. */
function paletteContribution<TCommand extends { readonly key: string }>(
  commandPalette: unknown,
  commands: readonly TCommand[]
): { readonly commands: readonly TCommand[] } | undefined {
  if (commandPalette === false) return undefined;
  if (commandPalette === undefined && commands.length === 0) return undefined;
  return { commands };
}

/** The host's print handler, when the toolbar button was asked for. */
function printContribution(
  options: Readonly<Record<string, unknown>>
): { onPrint: () => void } | undefined {
  const onPrint = options.onPrint;
  if (options.printButton !== true || typeof onPrint !== "function") {
    return undefined;
  }
  return { onPrint: onPrint as () => void };
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
