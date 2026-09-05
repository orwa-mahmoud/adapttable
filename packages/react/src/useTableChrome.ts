import type { GroupingPanelState } from "@adapttable/core";
import type { GroupByInput } from "@adapttable/core";
import type { GroupAggregatesFn, GroupedFlatEntry } from "@adapttable/core";
import type { PinnedRows } from "@adapttable/core";
import type { TableSource } from "@adapttable/core";
import { type ConfirmHandler, defaultConfirm } from "@adapttable/core";
import { REORDER_COLUMN_KEY } from "@adapttable/core";
import { type ColumnGroupRecord } from "@adapttable/core";
import { responsiveColumns } from "@adapttable/core";
import { parseGroupBy } from "@adapttable/core";
import { resolvePinnedRows } from "@adapttable/core";
import { type TableErrorState, tableErrorState } from "@adapttable/core";
import { collectFeatureNotices, type FeatureNotice } from "@adapttable/core";
import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { ColumnDef } from "./columnDef";
import { flattenReactColumnTree } from "./columns/flattenColumnTree";
import {
  applyReactColumnNames,
  declaredReactColumnLayout,
} from "./columns/reactColumns";
import { resolveColumns } from "./columns/resolveColumns";
import type { ReactUseColumnLayoutResult } from "./columns/useColumnLayout";
import type { EditableCellEditing } from "./editing/editableCellController";
import type { EditHistoryState } from "./editing/editHistory";
import type {
  ExportProgressState,
  ExportStatus,
} from "./export/useExportHandler";
import { GROUPING_PANEL_STATE } from "./features/groupingPanelKey";
import { useFeatureState } from "./features/providers";
import { ROW_REORDER } from "./features/rowReorderKey";
import type { ActiveFilterChip } from "./filters/useActiveFilterChips";
import type { GroupCollapseState } from "./grouping/useGroupCollapse";
import { useEventCallback } from "./hooks/useEventCallback";
import { useIsMobile } from "./hooks/useIsMobile";
import { useScrollToTableTop } from "./hooks/useScrollToTableTop";
import { useElementWidth } from "./layout/useElementWidth";
import type { ComposedTableProps, ToolbarSlots } from "./props";
import type { RowMutationsState } from "./rows/rowMutations";
import type { RowPinningState } from "./rows/rowPinning";
import type { RowReorderState } from "./rows/rowReorder";
import type { RowExpansionState } from "./rows/useRowExpansion";
import type { SelectionState } from "./selection/useSelection";

export type { FeatureNotice, FeatureNoticeKind } from "@adapttable/core";
import type { TreeEntry } from "@adapttable/core";
import type {
  BulkAction,
  RowAction,
  SortByOption,
  TableLabels,
} from "@adapttable/core";

import type { TreeExpansionState } from "./tree/useTreeExpansion";
import {
  useDataTable,
  type UseDataTableResult,
} from "./useDataTable/useDataTable";

export type {
  BulkAction,
  ConfirmHandler,
  EditHistoryState,
  SelectionState,
  ToolbarSlots,
};
/**
 * The shared prop surface every adapter's toolbar sub-component needs.
 * Adapters render kit-specific markup from this; extracting it keeps the
 * identical shape from being re-declared (and flagged as duplication) in
 * each adapter.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface ToolbarChromeProps<TRow> {
  /** The headless table state + prop-getters. */
  table: UseDataTableResult<TRow>;
  /** Render the search input (default `true`). */
  searchable?: boolean;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Options for an explicit sort-by control. */
  sortByOptions?: SortByOption[];
  /** Extra caller-supplied toolbar content, in the middle region. */
  toolbar?: ReactNode;
  /** Caller-supplied content for the two ends of the toolbar. */
  toolbarSlots?: ToolbarSlots;
  /**
   * Put the last edit back. Set only when the host asked for the buttons
   * (`undoRedoButtons`) AND `editHistory` is armed, so an adapter renders
   * the pair on presence and never has to check two things.
   */
  onUndo?: () => void;
  /** Do the last undone edit again. Present with `onUndo`. */
  onRedo?: () => void;
  /**
   * Whether there is anything to undo. The button is disabled, not
   * hidden — a control that vanishes moves the ones beside it, and a
   * toolbar that reflows while someone is working is worse than a button
   * that is briefly unavailable.
   */
  canUndo?: boolean;
  /** Whether there is anything to redo. */
  canRedo?: boolean;
  /** `labels.undoEdit` — the undo button's caption. */
  undoLabel?: string;
  /** `labels.redoEdit` — the redo button's caption. */
  redoLabel?: string;
  /**
   * Open the print dialog. Set only when the host asked for the button
   * (`printButton`) AND wired `onPrint`, so an adapter renders on presence
   * and never has to check two things.
   */
  onPrint?: () => void;
  /** `labels.print` — the print button's caption. */
  printLabel?: string;
  /** The density the table is rendering. */
  density: "comfortable" | "compact";
  /** Request a density change. */
  onDensityChange: (next: "comfortable" | "compact") => void;
  /** Toggle fullscreen. Present iff asked for AND the browser allows it. */
  onToggleFullscreen?: () => void;
  /** Whether the table is fullscreen right now, for the button's state. */
  isFullscreen?: boolean;
  /** Whether a filters affordance should render. */
  hasFilters: boolean;
  /** Number shown on the filters badge. */
  activeFilterCount: number;
  /** Whether the filter container is open (drives `aria-expanded`). */
  filtersOpen: boolean;
  /** Toggle the filter container (popover and drawer alike). */
  onToggleFilters: () => void;
  /**
   * Bind to the trigger's `onPointerDown` (see
   * `useFilterTriggerToggle`) so a click on the open trigger CLOSES
   * the popover instead of racing the kit's outside-close and reopening.
   */
  onFiltersTriggerPointerDown?: () => void;
  /** Whether to show the rows-per-page control (infinite mode). */
  showRowsPerPage: boolean;
  /**
   * Built saved-views menu node, when the feature is composed. Renders
   * ahead of `columnMenu` so every adapter's toolbar reads
   * Filters · Saved views · Columns · Export CSV.
   */
  savedViewsMenu?: ReactNode;
  /** Built column-menu node, when `enableColumnMenu` is set. */
  columnMenu?: ReactNode;
  /**
   * When set, render the Export CSV toolbar button and call this on click.
   * Built by `makeExportCsvHandler` from the export feature's configuration.
   */
  onExportCsv?: () => void;
  /**
   * True while a host-handled export is still running.
   *
   * Adapters disable the Export button and mark it busy, so the same export
   * cannot be started twice and the user can see that something is happening.
   * Always false for the built-in browser export, which is synchronous.
   */
  exportBusy?: boolean;
  /**
   * What the last export did, including a reader-cancelled host job.
   */
  exportStatus?: ExportStatus;
  /**
   * Live-region text for the last export's outcome, empty until there is one.
   * Adapters render it through `ExportAnnouncer` beside the button: a download
   * is silent, so without it a screen-reader user cannot tell a finished export
   * from a failed one.
   */
  exportAnnouncement?: string;
  /** Server-built progress surface state; absent for browser-built exports. */
  exportProgressState?: ExportProgressState | null;
  /**
   * The export button's caption, naming the format it produces — CSV by
   * default, the writer's format otherwise, localized either way. Adapters
   * render this rather than `labels.exportCsv`, so a button never names a file
   * the user is not getting.
   */
  exportLabel?: string;
  /**
   * The host asked for an export the source cannot cover. Adapters render the
   * Export button disabled rather than writing a narrower file than the button
   * offered.
   */
  exportDisabled?: boolean;
  /** Why the Export button is disabled, localized; empty while it is not. */
  exportDisabledReason?: string;
  /**
   * When set, render an Add-row control and call this on click. Present iff
   * the host wired `onAddRow`, so the toolbar needs no second guard.
   */
  onAddRow?: () => void;
  /** The Add control's caption, already localized. */
  addRowLabel?: string;
  /** Text direction, for adapters whose toolbar needs explicit RTL hints. */
  dir?: "ltr" | "rtl";
}

/**
 * The shared prop surface every adapter's bulk-action bar needs. Extracted
 * so the identical shape isn't re-declared (and flagged as duplication) in
 * each adapter's chrome.
 *
 * @public
 */
export interface BulkBarChromeProps {
  /** Current selection state. */
  selection: SelectionState;
  /**
   * Total rows in the filtered set — drives the "select all N matching"
   * banner when a full page is selected and more rows match elsewhere.
   */
  total: number;
  /** Caller-supplied bulk actions. */
  bulkActions: BulkAction[];
  /** Confirmation handler for actions that declare a `confirm` block. */
  confirm: ConfirmHandler;
  /** Resolved labels. */
  labels: Required<TableLabels>;
}

/**
 * Which body region a `DataTable` should render. Named `TableBodyRegion`
 * (not `TableBody`) so it never collides with MUI's `TableBody` component
 * in consumer imports.
 *
 * @public
 */
export type TableBodyRegion = "skeleton" | "empty" | "mobile" | "desktop";

/**
 * The shared, UI-agnostic orchestration result for an adapter table.
 *
 * @public
 */
export interface TableChrome<TRow> {
  /**
   * The source as the VIEW sees it. Identical to the caller's source —
   * except with grouping armed, where the table renders the full filtered
   * set and this facade presents that set (full rows, one page, matching
   * total) so footer numbers, select-all scope and page-scope CSV export
   * agree with the screen. Adapters read THIS, never the raw source.
   */
  source: TableSource<TRow>;
  /** The headless table state + prop-getters. */
  table: UseDataTableResult<TRow>;
  /** Resolved mobile layout flag. */
  isMobile: boolean;
  /** Resolved confirmation handler. */
  confirm: ConfirmHandler;
  /** Row id extractor (selection id, falling back to rowKey). */
  getRowId: (row: TRow) => string;
  /** Derived chips: label-driven merged with caller `extraChips`. */
  mergedChips: readonly ActiveFilterChip[];
  /** Active filter count (override, or merged chip count). */
  activeFilterCount: number;
  /** Whether the resolved pagination mode is `"paged"`. */
  isPaged: boolean;
  /**
   * The table root. Owned here so the width that drives progressive column
   * hiding is measured on the table itself, in both wiring paths.
   */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Column keys progressive hiding gave up at the current width. */
  droppedColumns: readonly string[];
  /** Which body region to render. */
  body: TableBodyRegion;
  /**
   * The load failure to show in place of the body, or `undefined` when the
   * source is fine. Derived here so every adapter offers a retry on exactly
   * the same terms — one the source can actually perform.
   */
  errorState?: TableErrorState;
  /**
   * Why the body is empty: `"noResults"` when an active search/filter
   * produced zero rows (offer a clear-filters CTA), `"noData"` when the
   * source itself is empty. Only meaningful while `body === "empty"`.
   */
  emptyVariant: "noData" | "noResults";
  /**
   * A background refresh is in flight (`isFetching` without `isLoading`):
   * rows on screen are potentially stale. Adapters show a subtle,
   * non-blocking indicator (thin progress bar / `aria-busy`).
   */
  isRefreshing: boolean;
  /**
   * Clear-filters handler: the caller's `onClearFilters`, falling back to
   * `source.clearExtras` — so chips, the drawer and the no-results CTA can
   * always offer a working "clear".
   */
  clearFilters: () => void;
  /**
   * Row-detail bundle — present iff `renderRowDetail` is set, so ONE guard
   * narrows both the renderer and the expansion state (no correlated
   * optionals to re-check).
   */
  detail?: {
    /** The caller's detail-panel renderer. */
    render: (row: TRow) => ReactNode;
    /** Expansion state for the chevrons. */
    expansion: RowExpansionState;
  };
  /**
   * Inline editing bundle — present iff either channel is set (`onCellEdit`
   * for per-cell commits, `rowEditing` + `onRowEdit` for row-level ones), so
   * ONE guard narrows the host channel, the state machine, validation, save
   * state, dirty marks and row mode. Pass neither and editing stays fully
   * dormant: no UI, no keyboard.
   */
  editing?: EditableCellEditing<TRow>;
  /**
   * Adding, duplicating and deleting rows. Empty until `rowActions()` is
   * composed. `canAdd` says whether the toolbar's Add control renders.
   */
  rowMutations: RowMutationsState<TRow>;
  /** Size every visible column to its content. Present with column layout. */
  autoSizeColumns?: () => void;
  /** Size one column to its content. Present with column layout. */
  autoSizeColumn?: (key: string) => void;
  /**
   * The row actions to render — the host's, plus duplicate and delete when
   * those are wired, and `undefined` when the reader hid the actions column.
   * Adapters read THIS rather than internal feature configuration.
   */
  rowActions?: RowAction<TRow>[];
  /**
   * Whether an actions column exists at all, hidden or not — what the column
   * menu offers, and the one figure a hidden column must not change.
   */
  hasRowActions: boolean;
  /**
   * Whether a reorder column exists at all, hidden or not — what the column
   * menu offers. Grouped and tree models keep it armed and resolve sibling
   * reorder separately from cross-boundary moves.
   */
  hasRowReorder: boolean;
  /**
   * Headless row-reorder state. Present iff the row-reorder feature is composed,
   * grouping/tree are off, and the column is visible. Adapters read THIS.
   */
  rowReorder?: RowReorderState<TRow>;
  /**
   * Headless row-pin state. Present iff the pinning feature is composed
   * and grouping/tree are off.
   */
  rowPinning?: RowPinningState<TRow>;
  /**
   * Host-owned summary objects stuck above and below the scroll body.
   * Present iff `pinnedSummaryRows` was composed with at least one row.
   */
  pinnedRows?: PinnedRows<TRow>;
  /**
   * Whether grouping is armed — full-set overlay is on. Pinning and
   * reorder read this rather than re-parsing `groupBy`.
   */
  groupingArmed: boolean;
  /**
   * Whether the host declared a tree. Pinning and reorder refuse a
   * nested list.
   */
  treeShaped: boolean;
  /**
   * Tree bundle — present iff the host declared a hierarchy (`getChildren` or
   * `getParentId`). A tree and a grouping are different models and can both be
   * dormant; a table that arms both renders the tree, since the rows' own
   * shape outranks a derived one.
   */
  tree?: {
    /** The flattened hierarchy, in render order. */
    entries: readonly TreeEntry<TRow>[];
    /** Every loaded node, including descendants of collapsed parents. */
    allEntries?: readonly TreeEntry<TRow>[];
    /** Which nodes are open. */
    expansion: TreeExpansionState;
    /** Which column carries the chevron and the indent. */
    columnKey?: string;
  };
  /**
   * Row-grouping bundle — present iff an effective `groupBy` is set AND the
   * source can supply a full filtered set (`allFilteredRows`). Omit
   * `groupBy` and grouping stays fully dormant (package DNA: opt-in).
   */
  grouping?: {
    /** The grouping keys in order — one entry for a flat group, more for nested. */
    groupBy: readonly string[];
    collapsed: GroupCollapseState;
    aggregates?: GroupAggregatesFn<TRow>;
    /** Flat group-header + leaf entries for adapters to render. */
    entries: readonly GroupedFlatEntry<TRow>[];
    setGroupBy: (key: GroupByInput) => void;
    /** Open every group. */
    expandAll: () => void;
    /** Close every group, at every level. */
    collapseAll: () => void;
    /**
     * Show the tree down to `depth` and no further — `0` leaves only the
     * outermost headers, `1` opens the first level inside them.
     */
    collapseToDepth: (depth: number) => void;
    /** Reveal the next page of groups, or of one group's rows. */
    showMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  };
  /** Interactive grouping strip state, present only with `groupingPanel()`. */
  groupingPanel?: GroupingPanelState;
  /**
   * The rows the editing layer must treat as present: the grouped leaf set
   * (in render order) while grouping renders the full filtered set, the
   * page slice otherwise. Adapters pass THIS — never `source.rows` — as the
   * `rows` context for editable cells, so an edit on a row outside the
   * current page slice survives and Tab-advance follows the rendered order.
   */
  editingRows: readonly TRow[];
  /** Whether the paged footer should render. */
  showFooter: boolean;
  /** User column-layout state + mutators (visibility, order, …). */
  columnLayout: ReactUseColumnLayoutResult<TRow>;
  /** Tree groups for the declared columns — collapse options, header align. */
  columnGroups: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
  /** All declared columns (pre layout/device filtering) for the column menu. */
  allColumns: ColumnDef<TRow>[];
  /**
   * Opted-in features that cannot run. Empty when everything the host
   * asked for can. Adapters show these on the status bar (when it is
   * on) and as `data-adapttable-notices` on the root; the matching
   * control already looks off, disabled, or one-page.
   */
  featureNotices: readonly FeatureNotice[];
}

/**
 * Run the shared orchestration every adapter `<DataTable>` needs: resolve
 * the layout + confirm handler, build the headless table, merge filter
 * chips, compute the active-filter count, and decide which body region and
 * footer to show. Adapters then render their kit-specific markup from this.
 *
 * @typeParam TRow - The row type.
 * @param props - The adapter's `ComposedTableProps`.
 * @returns The {@link TableChrome} orchestration result.
 */
/**
 * The undo/redo half of a toolbar's props, or nothing at all.
 *
 * Two conditions have to hold — the host asked for the buttons, and there
 * is a history for them to drive — and resolving both here means an
 * adapter renders the pair on `onUndo` being present and never has to
 * know that `editHistory` exists. Off, the object is empty and the props
 * are absent, which is what keeps an opted-out toolbar identical.
 */
/**
 * The resolved density contract and the optional fullscreen toggle.
 *
 * Density is always readable and writable; feature composition decides whether
 * a control renders for it. The fullscreen half folds in whether the browser
 * will allow it at all.
 *
 * @public
 */
export interface ViewControlsToolbar {
  /** Current row density. */
  density: "comfortable" | "compact";
  /** Request a density change. */
  onDensityChange: (next: "comfortable" | "compact") => void;
  /** Enters or leaves fullscreen, absent when it is unavailable. */
  onToggleFullscreen?: () => void;
  /** Whether the table is currently fullscreen. */
  isFullscreen?: boolean;
}

/**
 * The density and fullscreen half of a toolbar's props.
 *
 * @public
 */
export function viewControlsToolbar(
  props: {
    density: "comfortable" | "compact";
    onDensityChange: (next: "comfortable" | "compact") => void;
    fullscreen?: boolean;
  },
  fullscreen: { supported: boolean; active: boolean; toggle: () => void }
): ViewControlsToolbar {
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
 * The undo/redo half of a toolbar's props.
 *
 * @public
 */
export function undoRedoToolbar<TRow>(
  wanted: boolean | undefined,
  history: EditHistoryState<TRow>,
  labels: TableLabels
): Partial<ToolbarChromeProps<TRow>> {
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
 * The print button's half of a toolbar's props.
 *
 * @public
 */
export interface PrintToolbar {
  /** Runs the print layout, absent when printing is off. */
  onPrint?: () => void;
  /** Caption for the print control. */
  printLabel?: string;
}

/**
 * The print button's half of a toolbar's props, or nothing at all.
 *
 * Two conditions again — the host asked for the button, and there is a handler
 * for it to call — resolved here so an adapter renders on `onPrint` being
 * present. `onPrint` alone stays what it has always been: a palette command.
 *
 * Not generic, unlike {@link undoRedoToolbar}: neither prop mentions the row
 * type, and a `Partial<ToolbarChromeProps<TRow>>` return with no `TRow` in the
 * arguments infers `unknown` and widens the whole spread at every call site.
 *
 * @public
 */
export function printToolbar(
  wanted: boolean | undefined,
  onPrint: (() => void) | undefined,
  labels: TableLabels
): PrintToolbar {
  if (wanted !== true || onPrint === undefined) return {};
  return { onPrint, printLabel: labels.print };
}

const NO_ROW_MUTATIONS: RowMutationsState<never> = {
  canAdd: false,
  addRow: () => {
    // The row-actions feature owns add. The lean table has no handler.
  },
  actions: [],
};

/**
 * Assemble every piece of chrome a kit's toolbar and footer need.
 *
 * @public
 */
export function useTableChrome<TRow>(
  props: ComposedTableProps<TRow>
): TableChrome<TRow> {
  const {
    source,
    columns,
    rowKey,
    tableLabel,
    labels,
    dir,
    forceMobile,
    mobileBreakpoint,
    mobileIdentityColumns,
    onRowsChange,
    bulkActions,
    selectionGetId,
    selectedIds: selectedIdsProp,
    onSelectionChange,
    filterLabels,
    onClearFilters,
    extraChips,
    activeFilterCount: activeFilterCountProp,
    confirm: confirmProp,
  } = props;

  const autoMobile = useIsMobile(mobileBreakpoint);
  const isMobile = forceMobile ?? autoMobile;
  const confirm = confirmProp ?? defaultConfirm;

  // Declarative defaults (auto headers, dot-path accessors) resolve once
  // here, so the layout, the column menu and the table all see them.
  const flattened = useMemo(() => flattenReactColumnTree(columns), [columns]);
  const declaredColumns = useMemo(
    () => resolveColumns(flattened.leaves, props.locale),
    [flattened.leaves, props.locale]
  );
  const persistedColumnNames =
    props.columnLayout !== undefined
      ? props.columnLayout.names
      : props.defaultColumnLayout?.names;
  const resolvedColumns = useMemo(
    () => applyReactColumnNames(declaredColumns, persistedColumnNames),
    [declaredColumns, persistedColumnNames]
  );

  // User column layout (hide/order/…) applied on top of the declared columns,
  // before device filtering inside useDataTable. The menu uses `allColumns`.
  // The chrome owns the root ref so both wiring paths measure the same
  // element: the width that decides progressive hiding has to be the table's
  // own, not the window's.
  const rootRef = useRef<HTMLDivElement>(null);
  const rootWidth = useElementWidth(rootRef);

  const columnLayout = useMemo(
    () => declaredReactColumnLayout(resolvedColumns),
    [resolvedColumns]
  );
  const groupingArmed = false;
  const viewSource = source;

  // Progressive hiding sits between the user's own hidden set and what is
  // rendered: it is a fact about the viewport, not a choice the user made,
  // so it never reaches the layout state, the URL or a saved view.
  const responsive = useMemo(
    () =>
      responsiveColumns<ColumnDef<TRow>>({
        columns: columnLayout.visibleColumns,
        available: rootWidth,
        widths: columnLayout.state.widths,
      }),
    [columnLayout.visibleColumns, columnLayout.state.widths, rootWidth]
  );

  const table = useDataTable<TRow>({
    source: viewSource,
    columns: responsive.columns,
    rowKey,
    tableLabel,
    labels,
    dir,
    forceMobile: isMobile,
    mobileIdentityColumns,
    bulkActions,
    selectionGetId,
    selectedIds: selectedIdsProp,
    onSelectedIdsChange: onSelectionChange,
    filterLabels,
    multiSort: props.multiSort,
    searchDebounceMs: props.searchDebounceMs,
    locale: props.locale,
    fitColumns: props.fitColumns,
    // The user's dragged widths win over any share: they said what they wanted.
    columnWidths: columnLayout.state.widths,
  });

  useEffect(() => {
    onRowsChange?.(table.rows);
  }, [onRowsChange, table.rows]);

  // Selection observer (uncontrolled only): the Set identity only changes
  // when the selection does, so this fires exactly once per user-visible
  // change (including automatic resets and the documented mount fire with
  // the empty selection). The handler is read through a ref-latch — the
  // documented inline-arrow usage is a fresh identity every render, and
  // keying the effect on it loops forever when the handler stores the ids
  // in state. In the CONTROLLED mode the parent already receives change
  // requests synchronously through useSelection's onChange — echoing them
  // here would double-fire (and feed loops).
  const controlledSelection = selectedIdsProp !== undefined;
  const selectedIds = table.selection?.selectedIds;
  const notifySelectionChange = useEventCallback((ids: string[]) => {
    onSelectionChange?.(ids);
  });
  useEffect(() => {
    if (!controlledSelection && selectedIds) {
      notifySelectionChange([...selectedIds]);
    }
  }, [controlledSelection, selectedIds, notifySelectionChange]);

  const mergedChips = extraChips ?? [];
  const activeFilterCount = activeFilterCountProp ?? mergedChips.length;

  const isPaged = source.paginationMode === "paged";

  const errorState = tableErrorState(viewSource);
  let body: TableBodyRegion;
  if (viewSource.isLoading && viewSource.rows.length === 0) body = "skeleton";
  else if (table.isEmpty) body = "empty";
  else if (isMobile) body = "mobile";
  else body = "desktop";

  // Zero rows under an active search/filter is "nothing MATCHED", not
  // "nothing exists" — the empty state should say so and offer a clear.
  const hasSourceFilters = Object.keys(source.extra ?? {}).length > 0;
  const emptyVariant =
    activeFilterCount > 0 || hasSourceFilters || source.search !== ""
      ? "noResults"
      : "noData";

  // `isFetchingNextPage` is load-more, not a refresh of what's on screen.
  const isRefreshing = Boolean(
    source.isFetching && !source.isLoading && !source.isFetchingNextPage
  );

  // `onClearFilters` is a pure NOTIFICATION: the chrome always performs
  // the clear itself, then tells the host. (It used to REPLACE the clear,
  // so a logging handler silently broke the button — take full control
  // via `source.clearExtras` instead.)
  const clearFilters = useCallback(() => {
    source.clearExtras();
    source.setFilterTree?.(undefined);
    onClearFilters?.();
  }, [onClearFilters, source]);

  // Grouping, tree, expansion and editing hooks live on their feature
  // entries. Base chrome leaves those fields empty; ChromeExtrasGate overlays
  // them when the matching feature is composed.
  const detail = undefined;
  const editing = undefined;
  const onCellEdit = props.onCellEdit;
  const hasEditableColumn = resolvedColumns.some((column) => column.editable);

  const getRowId = selectionGetId ?? rowKey;
  const rowMutations = NO_ROW_MUTATIONS as RowMutationsState<TRow>;
  const hasRowActions = false;
  const rowActions = undefined;

  const treeShaped =
    props.getChildren !== undefined || props.getParentId !== undefined;
  const tree = undefined;
  const grouping = undefined;
  const editingRows = viewSource.rows;

  // See TableChrome.editingRows — extras overlay the grouped leaf set.

  // Reorder publishes one engine for flat, grouped and tree rows. Nested
  // models resolve visual targets into sibling reorders or explicit host move
  // callbacks; they never splice the flat render list.
  // The feature owns the hook; this reads what its provider published. A table
  // that never imported `@adapttable/<kit>/row-reorder` gets `undefined` here
  // and never carries the drag state machine at all.
  const publishedReorder = useFeatureState(ROW_REORDER) as
    RowReorderState<TRow> | undefined;
  const requestedReorder = publishedReorder !== undefined;
  const hasRowReorder = requestedReorder;
  const reorderHidden = columnLayout.isHidden(REORDER_COLUMN_KEY);
  const rowReorderEnabled = hasRowReorder && !reorderHidden;
  const rowReorder = rowReorderEnabled ? publishedReorder : undefined;

  const rowPinning = undefined;
  const resolvedPinnedRows = resolvePinnedRows(props.pinnedRows);
  const pinnedRows =
    resolvedPinnedRows.top.length > 0 || resolvedPinnedRows.bottom.length > 0
      ? resolvedPinnedRows
      : undefined;

  const showFooter =
    isPaged &&
    !viewSource.error &&
    (viewSource.total > 0 || viewSource.isLoading || viewSource.isFetching);

  // What the host asked to group by, whatever composes the grouping engine.
  // The notice is the chrome's to raise: a table told to group by a key its
  // source cannot group on has to say so even when the feature that would
  // have done the grouping was never imported.
  const requestedGroupBy =
    props.groupBy === undefined ? source.groupBy : props.groupBy;
  const groupByKeys = useMemo(
    () => parseGroupBy(requestedGroupBy),
    [requestedGroupBy]
  );
  const groupingPanelInteractions = useFeatureState(GROUPING_PANEL_STATE);
  const groupingPanel = useMemo<GroupingPanelState | undefined>(
    () =>
      groupingPanelInteractions
        ? {
            ...groupingPanelInteractions,
            groupBy: groupByKeys,
            aggregateOverrides: source.groupAggregateOverrides ?? {},
            canSetAggregates: source.setGroupAggregateOverrides !== undefined,
          }
        : undefined,
    [
      groupByKeys,
      groupingPanelInteractions,
      source.groupAggregateOverrides,
      source.setGroupAggregateOverrides,
    ]
  );

  const featureNotices = useMemo(
    () =>
      collectFeatureNotices({
        virtualize: props.virtualize,
        paginationMode: source.paginationMode,
        groupByKeys,
        allFilteredRows: source.allFilteredRows,
        serverGroups: source.groups,
        total: source.total,
        capabilities: source.capabilities,
        rowPinningRequested:
          props.pinnedRowIds !== undefined ||
          props.onPinnedRowIdsChange !== undefined,
        rowReorderRequested: requestedReorder,
        nestedArmed: groupingArmed || treeShaped,
        hasEditableColumn,
        onCellEdit,
        rowEditing: props.rowEditing,
        onRowEdit: props.onRowEdit,
        batchEditing: props.batchEditing,
        onBatchEdit: props.onBatchEdit,
        exportCsv: props.exportCsv,
        labels: table.labels,
      }),
    [
      props.virtualize,
      source.paginationMode,
      groupByKeys,
      source.allFilteredRows,
      source.groups,
      source.total,
      source.capabilities,
      props.pinnedRowIds,
      props.onPinnedRowIdsChange,
      requestedReorder,
      groupingArmed,
      treeShaped,
      hasEditableColumn,
      onCellEdit,
      props.rowEditing,
      props.onRowEdit,
      props.batchEditing,
      props.onBatchEdit,
      props.exportCsv,
      table.labels,
    ]
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const value = featureNotices.map((notice) => notice.kind).join(" ");
    if (value) el.dataset.adapttableNotices = value;
    else delete el.dataset.adapttableNotices;
  });

  return {
    source: viewSource,
    table,
    isMobile,
    confirm,
    getRowId,
    mergedChips,
    activeFilterCount,
    isPaged,
    rootRef,
    droppedColumns: responsive.dropped,
    body,
    errorState,
    emptyVariant,
    isRefreshing,
    clearFilters,
    detail,
    rowMutations,
    rowActions,
    hasRowActions,
    hasRowReorder,
    rowReorder,
    rowPinning,
    pinnedRows,
    groupingArmed,
    treeShaped,
    editing,
    grouping,
    groupingPanel,
    tree,
    editingRows,
    showFooter,
    columnLayout,
    columnGroups: flattened.groups,
    allColumns: resolvedColumns,
    featureNotices,
  };
}

export type { ChromeBodyData } from "./virtual/chromeBodyShared";

/**
 * The shared scroll-restoration wiring every adapter `<DataTable>` needs:
 * when search / sort / page / filters change, scroll the table back below
 * the sticky chrome. Extracted so the identical block isn't repeated (and
 * flagged as duplication) in each adapter.
 *
 * @typeParam TRow - The row type.
 * @param ref - The adapter's root element.
 * @param chrome - The {@link useTableChrome} result.
 * @param props - The adapter's `ComposedTableProps`.
 *
 * @public
 */
export function useChromeScrollReset<TRow>(
  ref: RefObject<HTMLElement | null>,
  chrome: TableChrome<TRow>,
  props: ComposedTableProps<TRow>
): void {
  const { source } = props;
  // In infinite mode a page increment means "the window grew at the
  // bottom" (the sentinel loaded more) — yanking the reader back to the
  // table top would fight the scroll they are mid-way through. Only paged
  // navigation is a real page change worth resetting for.
  const pageDep = source.paginationMode === "paged" ? source.page : 0;
  useScrollToTableTop({
    ref,
    deps: [
      source.search,
      source.sortBy ?? "",
      source.sortDir ?? "",
      pageDep,
      chrome.activeFilterCount,
    ],
    enabled: props.scrollToTopOnChange,
    offset: props.stickyTop,
    gap: props.scrollTopGap,
  });
}

/**
 * Pointer/click handlers returned by `useFilterTriggerToggle`.
 *
 * @public
 */
export interface FilterTriggerToggle {
  /** Records that the press began on the trigger. */
  onPointerDown: () => void;
  /** Opens or closes the overlay, ignoring a click that closed it already. */
  onClick: () => void;
}

/**
 * A toggle for the Filters trigger that survives every kit's outside-close
 * behavior. Some kits (Chakra `closeOnBlur`, outside `mousedown` handlers)
 * close the popover on the trigger's own pointer-down — a plain
 * `setOpen(o => !o)` on click then instantly REOPENS it, so the button can
 * never close the popover. This records whether the popover was open at
 * pointer-down: if the kit closed it in between, the click is swallowed;
 * otherwise the click toggles normally (kits that exclude the trigger from
 * outside-close keep working unchanged).
 */
/**
 * Pointer and click handlers that open the filters overlay without double-firing.
 *
 * @public
 */
export function useFilterTriggerToggle(
  open: boolean,
  setOpen: (next: boolean | ((current: boolean) => boolean)) => void
): FilterTriggerToggle {
  const wasOpenAtPointerDown = useRef(false);
  return {
    onPointerDown: useCallback(() => {
      wasOpenAtPointerDown.current = open;
    }, [open]),
    onClick: useCallback(() => {
      const closedByKit = wasOpenAtPointerDown.current && !open;
      wasOpenAtPointerDown.current = false;
      if (closedByKit) return;
      setOpen((current) => !current);
    }, [open, setOpen]),
  };
}
