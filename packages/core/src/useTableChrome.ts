import type { ReactNode, RefCallback, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { type ConfirmHandler, defaultConfirm } from "./actions/confirm";
import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
} from "./columns/columnMenuModel";
import {
  type ColumnGroupRecord,
  flattenColumnTree,
} from "./columns/columnTree";
import { resolveColumns } from "./columns/resolveColumns";
import { responsiveColumns } from "./columns/responsiveColumns";
import {
  useColumnLayout,
  type UseColumnLayoutResult,
} from "./columns/useColumnLayout";
import { DEFAULT_CARD_SIZE_PX, DEFAULT_ROW_SIZE_PX } from "./constants";
import { useBatchEditing } from "./editing/batchEditing";
import { useDirtyCells } from "./editing/dirtyCells";
import type { EditableCellEditing } from "./editing/editableCellController";
import { useEditConflict } from "./editing/editConflict";
import type { EditHistoryState } from "./editing/editHistory";
import { useEditLifecycle } from "./editing/editingEvents";
import { useRowEditing } from "./editing/rowEditing";
import { useCellSaveState } from "./editing/saveState";
import { useCellEditing } from "./editing/useCellEditing";
import { useEditValidation } from "./editing/validation";
import type { ExportStatus } from "./export/useExportHandler";
import { featureHostOf } from "./features/featureHost";
import {
  type ActiveFilterChip,
  mergeFilterChips,
  resolveActiveFilterCount,
} from "./filters/useActiveFilterChips";
import { useFilterTreeChips } from "./filters/useFilterTreeChips";
import {
  formatGroupBy,
  type GroupByInput,
  parseGroupBy,
} from "./grouping/groupKeys";
import {
  buildGroupedFlatModel,
  type GroupAggregatesFn,
  type GroupedFlatEntry,
} from "./grouping/groupRows";
import {
  type GroupCollapseState,
  useGroupCollapse,
} from "./grouping/useGroupCollapse";
import { useGroupPaging } from "./grouping/useGroupPaging";
import { useEventCallback } from "./hooks/useEventCallback";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useIsMobile } from "./hooks/useIsMobile";
import { useScrollToTableTop } from "./hooks/useScrollToTableTop";
import { useElementWidth } from "./layout/useElementWidth";
import type { BaseDataTableProps, ToolbarSlots } from "./props";
import { insertExtraRows } from "./rows/extraRows";
import {
  configureIncrementalView,
  incrementalViewOf,
} from "./rows/incremental";
import { type RowMutationsState, useRowMutations } from "./rows/rowMutations";
import {
  partitionPinnedRows,
  type RowPinLabels,
  type RowPinningState,
  type RowPinState,
  useRowPinning,
} from "./rows/rowPinning";
import { type RowReorderState, useRowReorder } from "./rows/rowReorder";
import { estimateFromRowHeight } from "./rows/rowStyle";
import {
  type RowExpansionState,
  useRowExpansion,
} from "./rows/useRowExpansion";
import type { SelectionState } from "./selection/useSelection";
import { serverGroupEntries } from "./source/queryGroups";
import type { TableSource } from "./source/TableSource";
import { type TableErrorState, tableErrorState } from "./state/errorState";
import {
  collectFeatureNotices,
  type FeatureNotice,
} from "./state/featureNotices";

export type { FeatureNotice, FeatureNoticeKind } from "./state/featureNotices";
import { nestedTableDetail } from "./tree/nestedTable";
import {
  buildTreeEntries,
  treeColumnKey,
  type TreeEntry,
} from "./tree/treeRows";
import { useLazyChildren } from "./tree/useLazyChildren";
import {
  type TreeExpansionState,
  useTreeExpansion,
} from "./tree/useTreeExpansion";
import type {
  BulkAction,
  ColumnDef,
  RowAction,
  SortByOption,
  TableLabels,
} from "./types";
import {
  useDataTable,
  type UseDataTableResult,
} from "./useDataTable/useDataTable";
import { devWarn } from "./utils/devWarn";
import {
  type TableVirtualization,
  useKeyedVirtualization,
  useTableVirtualization,
  windowGroupedEntries,
} from "./virtual/useTableVirtualization";
import { useMeasuredWindowScrollMargin } from "./virtual/windowScrollMargin";

/**
 * The shared prop surface every adapter's toolbar sub-component needs.
 * Adapters render kit-specific markup from this; extracting it keeps the
 * identical shape from being re-declared (and flagged as duplication) in
 * each adapter.
 *
 * @typeParam TRow - The row type.
 *
 * @internal
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
  /** The density the table is rendering, when the chooser is shown. */
  density?: "comfortable" | "compact";
  /** Change it. Present iff the host asked for the chooser. */
  onDensityChange?: (next: "comfortable" | "compact") => void;
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
   * Built saved-views menu node, when the `savedViews` prop opts in. Renders
   * ahead of `columnMenu` so every adapter's toolbar reads
   * Filters · Saved views · Columns · Export CSV.
   */
  savedViewsMenu?: ReactNode;
  /** Built column-menu node, when `enableColumnMenu` is set. */
  columnMenu?: ReactNode;
  /**
   * When set, render the Export CSV toolbar button and call this on click.
   * Built by `makeExportCsvHandler` from the `exportCsv` prop.
   */
  onExportCsv?: () => void;
  /**
   * True while a host-handled export (`exportCsv.request`) is still running.
   *
   * Adapters disable the Export button and mark it busy, so the same export
   * cannot be started twice and the user can see that something is happening.
   * Always false for the built-in browser export, which is synchronous.
   */
  exportBusy?: boolean;
  /**
   * What the last export did — `"idle"`, `"busy"`, `"done"` or `"failed"` —
   * for a kit whose button shows more than a spinner.
   */
  exportStatus?: ExportStatus;
  /**
   * Live-region text for the last export's outcome, empty until there is one.
   * Adapters render it through `ExportAnnouncer` beside the button: a download
   * is silent, so without it a screen-reader user cannot tell a finished export
   * from a failed one.
   */
  exportAnnouncement?: string;
  /**
   * The export button's caption, naming the format it produces — CSV by
   * default, the writer's format otherwise, localized either way. Adapters
   * render this rather than `labels.exportCsv`, so a button never names a file
   * the user is not getting.
   */
  exportLabel?: string;
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
 * @internal
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
 * @internal
 */
export type TableBodyRegion = "skeleton" | "empty" | "mobile" | "desktop";

/**
 * The shared, UI-agnostic orchestration result for an adapter table.
 *
 * @internal
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
   * Adding, duplicating and deleting rows. Always present: `canAdd` says
   * whether the toolbar's Add control renders, and the duplicate and delete
   * actions are already folded into {@link TableChrome.rowActions}, so an
   * adapter that renders row actions gets both for free.
   */
  rowMutations: RowMutationsState<TRow>;
  /**
   * The row actions to render — the host's, plus duplicate and delete when
   * those are wired, and `undefined` when the reader hid the actions column.
   * Adapters read THIS rather than the `rowActions` prop.
   */
  rowActions?: RowAction<TRow>[];
  /**
   * Whether an actions column exists at all, hidden or not — what the column
   * menu offers, and the one figure a hidden column must not change.
   */
  hasRowActions: boolean;
  /**
   * Whether a reorder column exists at all, hidden or not — what the column
   * menu offers. False when grouping or a tree is armed (reorder is refused).
   */
  hasRowReorder: boolean;
  /**
   * Headless row-reorder state. Present iff the host passed `onRowReorder`,
   * grouping/tree are off, and the column is visible. Adapters read THIS.
   */
  rowReorder?: RowReorderState<TRow>;
  /**
   * Headless row-pin state. Present iff the host passed `pinnedRowIds` or
   * `onPinnedRowIdsChange`, and grouping/tree are off.
   */
  rowPinning?: RowPinningState<TRow>;
  /**
   * Tree bundle — present iff the host declared a hierarchy (`getChildren` or
   * `getParentId`). A tree and a grouping are different models and can both be
   * dormant; a table that arms both renders the tree, since the rows' own
   * shape outranks a derived one.
   */
  tree?: {
    /** The flattened hierarchy, in render order. */
    entries: readonly TreeEntry<TRow>[];
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
  columnLayout: UseColumnLayoutResult<TRow>;
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
 * @param props - The adapter's `BaseDataTableProps`.
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
 * The density chooser and the fullscreen toggle, or nothing.
 *
 * Both resolve to present-or-absent rather than present-and-disabled, so an
 * adapter renders on presence. The fullscreen half folds in whether the
 * browser will allow it at all: a toggle that cannot work is worse than no
 * toggle, and an embedded webview is a real place where it cannot.
 *
 * @internal
 */
export interface ViewControlsToolbar {
  /** Current row density. */
  density?: "comfortable" | "compact";
  /** Switches density, absent when the chooser is off. */
  onDensityChange?: (next: "comfortable" | "compact") => void;
  /** Enters or leaves fullscreen, absent when it is unavailable. */
  onToggleFullscreen?: () => void;
  /** Whether the table is currently fullscreen. */
  isFullscreen?: boolean;
}

/**
 * The density and fullscreen half of a toolbar's props.
 *
 * @internal
 */
export function viewControlsToolbar(
  props: {
    densityChooser?: boolean;
    density?: "comfortable" | "compact";
    onDensityChange?: (next: "comfortable" | "compact") => void;
    fullscreen?: boolean;
  },
  fullscreen: { supported: boolean; active: boolean; toggle: () => void }
): ViewControlsToolbar {
  return {
    ...(props.densityChooser === true
      ? {
          density: props.density ?? "comfortable",
          onDensityChange: props.onDensityChange,
        }
      : {}),
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
 * @internal
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

/** The print button's half of a toolbar's props. */
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
 * @internal
 */
export function printToolbar(
  wanted: boolean | undefined,
  onPrint: (() => void) | undefined,
  labels: TableLabels
): PrintToolbar {
  if (wanted !== true || onPrint === undefined) return {};
  return { onPrint, printLabel: labels.print };
}

/**
 * Assemble every piece of chrome a kit's toolbar and footer need.
 *
 * @internal
 */
export function useTableChrome<TRow>(
  props: BaseDataTableProps<TRow>
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
    columnLayout: columnLayoutProp,
    onColumnLayoutChange,
    defaultColumnLayout,
    groupAggregates,
    groupFooters,
    groupSort,
    groupFilter,
    groupPageSize,
    groupRowPageSize,
    onGroupLoadMore,
    extraRows,
  } = props;

  const autoMobile = useIsMobile(mobileBreakpoint);
  const isMobile = forceMobile ?? autoMobile;
  const confirm = confirmProp ?? defaultConfirm;

  // Declarative defaults (auto headers, dot-path accessors) resolve once
  // here, so the layout, the column menu and the table all see them.
  const flattened = useMemo(() => flattenColumnTree(columns), [columns]);
  const resolvedColumns = useMemo(
    () => resolveColumns(flattened.leaves, props.locale),
    [flattened.leaves, props.locale]
  );

  // User column layout (hide/order/…) applied on top of the declared columns,
  // before device filtering inside useDataTable. The menu uses `allColumns`.
  // The chrome owns the root ref so both wiring paths measure the same
  // element: the width that decides progressive hiding has to be the table's
  // own, not the window's.
  const rootRef = useRef<HTMLDivElement>(null);
  const rootWidth = useElementWidth(rootRef);

  const columnLayout = useColumnLayout<TRow>({
    columns: resolvedColumns,
    layout: columnLayoutProp,
    onLayoutChange: onColumnLayoutChange,
    defaultColumnLayout,
    collapsibleColumnGroups: props.collapsibleColumnGroups === true,
    columnGroups: flattened.groups,
  });

  // Effective groupBy: prop wins when provided (including `null` to force
  // off); otherwise the URL/source value. Empty string is treated as unset.
  //
  // With grouping armed the table is a FULL-SET view: grouped mode renders
  // every filtered row, so the source the chrome reasons about presents
  // that same set — footer numbers, select-all scope and page-scope CSV
  // export all describe exactly what is on screen instead of the page
  // slice. Mutators pass through untouched; the overlay disappears (and
  // real pagination resumes) the moment grouping is cleared.
  const requestedGroupBy =
    props.groupBy === undefined ? source.groupBy : props.groupBy;
  const groupByKeys = useMemo(
    () => parseGroupBy(requestedGroupBy),
    [requestedGroupBy]
  );
  // A server tier that answered `query.groupBy` sends its own groups; a
  // frontend tier hands over the whole filtered set to group locally. Either
  // way the adapters see the same entries.
  const serverGroups = source.groups;
  const groupingArmed = Boolean(
    groupByKeys.length > 0 && (source.allFilteredRows ?? serverGroups)
  );
  const viewSource = useMemo<TableSource<TRow>>(() => {
    if (!groupingArmed || !source.allFilteredRows) return source;
    const all = source.allFilteredRows;
    return {
      ...source,
      rows: all,
      page: 1,
      limit: Math.max(all.length, 1),
      total: all.length,
      hasNextPage: false,
      isFetchingNextPage: false,
    };
  }, [groupingArmed, source]);

  // Progressive hiding sits between the user's own hidden set and what is
  // rendered: it is a fact about the viewport, not a choice the user made,
  // so it never reaches the layout state, the URL or a saved view.
  const responsive = useMemo(
    () =>
      responsiveColumns({
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

  const treeChips = useFilterTreeChips({
    tree: source.filterTree,
    defs: props.filterDefs ?? [],
    labels: table.labels,
    setFilterTree: source.setFilterTree,
  });
  const mergedChips = useMemo<readonly ActiveFilterChip[]>(
    () =>
      mergeFilterChips(
        mergeFilterChips(table.filterChips, extraChips),
        treeChips
      ),
    [table.filterChips, extraChips, treeChips]
  );

  const activeFilterCount = resolveActiveFilterCount(
    activeFilterCountProp,
    mergedChips.length
  );

  const isPaged = source.paginationMode === "paged";

  const errorState = tableErrorState(viewSource);
  let body: TableBodyRegion;
  if (viewSource.isLoading && viewSource.rows.length === 0) body = "skeleton";
  else if (table.isEmpty) body = "empty";
  else if (isMobile) body = "mobile";
  else body = "desktop";

  // Zero rows under an active search/filter is "nothing MATCHED", not
  // "nothing exists" — the empty state should say so and offer a clear.
  const emptyVariant =
    activeFilterCount > 0 || source.search !== "" ? "noResults" : "noData";

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

  // Hooks run unconditionally; the state is simply unused (and unexposed)
  // when the caller renders no row details.
  const expansionState = useRowExpansion(props.defaultExpandedRowIds);
  // A declared nested table IS the detail panel; a row without one falls back
  // to whatever the host builds itself.
  const { nestedTable, density, labels: hostLabels } = props;
  const hostRenderRowDetail = props.renderRowDetail;
  const renderRowDetail = useMemo(
    () =>
      nestedTableDetail({
        nestedTable,
        renderRowDetail: hostRenderRowDetail,
        parent: { density, labels: hostLabels },
      }),
    [nestedTable, hostRenderRowDetail, density, hostLabels]
  );
  const detail = useMemo(
    () =>
      renderRowDetail
        ? { render: renderRowDetail, expansion: expansionState }
        : undefined,
    [renderRowDetail, expansionState]
  );

  // Same opt-in pattern as `detail`: the hook always runs (Rules of Hooks),
  // but `editing` is only exposed when the host passes `onCellEdit`.
  const lifecycle = useEditLifecycle<TRow>({
    onEditStart: props.onEditStart,
    onEditCancel: props.onEditCancel,
    onEditCommit: props.onEditCommit,
    onValidationFail: props.onValidationFail,
    onEditError: props.onEditError,
  });
  const cellEditingState = useCellEditing<TRow>({
    onEditStart: lifecycle.onEditStart,
    onEditCancel: lifecycle.onEditCancel,
  });
  const conflict = useEditConflict<TRow>();
  const onCellEdit = props.onCellEdit;
  // Validation gates the commit and nothing else; it runs whether or not any
  // validator exists, and stays inert until one rejects something.
  const validation = useEditValidation<TRow>({
    validateRow: props.validateRow,
    applyEdit: props.applyEdit,
  });
  // A host whose `onCellEdit` returns a promise gets a saving cell for free;
  // one that saves synchronously never pays a render for it.
  const saving = useCellSaveState<TRow>({
    onRollback: props.onEditRollback,
    formatError: props.formatEditError,
    onEditError: lifecycle.onEditError,
  });
  // A mark is a claim about what the server has agreed to, so it is the host's
  // to ask for: `dirtyIndicators` on, and `confirmEdits` to say when a value has
  // settled (a refetch agreed, a websocket echoed it back).
  const dirty = useDirtyCells({ enabled: props.dirtyIndicators === true });
  // Row mode changes the commit unit from a cell to a row, so it takes both the
  // flag and a channel: an Edit control with nowhere to send the patch would be
  // a mode the reader can enter and never leave usefully.
  const rowModeArmed =
    props.rowEditing === true && props.onRowEdit !== undefined;
  const rowEditing = useRowEditing<TRow>({
    enabled: rowModeArmed,
    columns: resolvedColumns,
    onRowEdit: props.onRowEdit,
    onEditStart: lifecycle.onEditStart,
    onEditCancel: lifecycle.onEditCancel,
    onEditCommit: lifecycle.onEditCommit,
    featureHost: featureHostOf(props),
  });
  // Either channel arms the bundle: a host that wants row-level commits only
  // never passes `onCellEdit`, and its cells stay display-only until a reader
  // opens the row.
  // Batch mode is the third commit unit: many rows held, one write at the end.
  const batchArmed =
    props.batchEditing === true && props.onBatchEdit !== undefined;
  const batch = useBatchEditing<TRow>({
    enabled: batchArmed,
    columns: resolvedColumns,
    onBatchEdit: props.onBatchEdit,
    onEditStart: lifecycle.onEditStart,
    onEditCancel: lifecycle.onEditCancel,
    onEditCommit: lifecycle.onEditCommit,
    featureHost: featureHostOf(props),
  });
  const editingArmed = onCellEdit !== undefined || rowModeArmed || batchArmed;
  const editing = useMemo(
    () =>
      editingArmed
        ? {
            onCellEdit,
            state: cellEditingState,
            validation,
            saving,
            dirty,
            // Only when the host armed row mode: carried unconditionally, every
            // table with cell editing would grow an "Edit row" control.
            rowEditing: rowModeArmed ? rowEditing : undefined,
            batch: batchArmed ? batch : undefined,
            lifecycle,
            conflict,
            conflictLabels: {
              message: table.labels.editConflict,
              keepMine: table.labels.keepMine,
              takeTheirs: table.labels.takeTheirs,
              theirsValue: table.labels.theirsValue,
            },
            featureHost: featureHostOf(props),
          }
        : undefined,
    [
      editingArmed,
      onCellEdit,
      cellEditingState,
      validation,
      saving,
      dirty,
      rowModeArmed,
      rowEditing,
      batchArmed,
      batch,
      lifecycle,
      conflict,
      table.labels.editConflict,
      table.labels.keepMine,
      table.labels.takeTheirs,
      table.labels.theirsValue,
      props,
    ]
  );
  // Half-configured editing is a silent trap: `editable: true` on a column
  // does NOTHING without the table-level change channel. Say so in dev.
  const hasEditableColumn = resolvedColumns.some((column) => column.editable);
  useEffect(() => {
    if (!hasEditableColumn || onCellEdit) return;
    devWarn(
      "columns declare `editable` but no `onCellEdit` handler is set — cell editing stays inert. Pass `onCellEdit` on the table to enable it."
    );
  }, [hasEditableColumn, onCellEdit]);

  // If the active row leaves the rendered set, drop the draft without
  // committing — the host never receives a stale edit. The check runs
  // against `editingRows` (defined after grouping below): the grouped body
  // renders the FULL filtered leaf set, so validating against the page
  // slice would silently kill edits on every off-page row (each group's
  // rows beyond page 1 froze as display-only).

  const groupCollapse = useGroupCollapse({
    collapsedGroupIds: props.collapsedGroupIds,
    onCollapsedGroupIdsChange: props.onCollapsedGroupIdsChange,
  });

  useEffect(() => {
    if (groupByKeys.length === 0) return;
    if (source.allFilteredRows || serverGroups) return;
    devWarn(
      "groupBy is only supported on the frontend data tier (in-memory rows with allFilteredRows). Server-paginated sources cannot regroup a full result set; grouping is ignored."
    );
  }, [groupByKeys, source.allFilteredRows, serverGroups]);

  // Depend on the two stable members, never the whole props/source objects
  // (both fresh every render) — keying on them rebuilt the grouping bundle,
  // and the O(filtered rows) grouped flat model behind it, on every
  // keystroke.
  const { onGroupByChange } = props;
  const { setGroupBy: sourceSetGroupBy } = source;
  // `onGroupByChange` is a pure NOTIFICATION: the chrome always applies
  // the grouping change itself, then tells the host. (It used to REPLACE
  // the mutator, so a logging handler silently broke grouping — take full
  // control via `source.setGroupBy` instead.)
  const setGroupBy = useCallback(
    (key: GroupByInput) => {
      sourceSetGroupBy(formatGroupBy(key));
      onGroupByChange?.(parseGroupBy(key));
    },
    [onGroupByChange, sourceSetGroupBy]
  );

  const getRowId = selectionGetId ?? rowKey;
  const groupPaging = useGroupPaging();
  // Adding, duplicating and deleting: the table asks, the host does. Nothing
  // renders until the handler that performs it is wired.
  const rowMutations = useRowMutations<TRow>({
    labels: table.labels,
    onAddRow: props.onAddRow,
    onDuplicateRow: props.onDuplicateRow,
    onDeleteRow: props.onDeleteRow,
    confirmDeleteRow: props.confirmDeleteRow,
  });
  // The one row-action list every renderer reads. Duplicate and delete come
  // after the host's own, so a delete stays last where a destructive action
  // belongs — and the whole column hides and end-pins as one, because the
  // layout state cannot tell a synthesized action from a declared one.
  const mutationActions = rowMutations.actions;
  const hasRowActions =
    (props.rowActions?.length ?? 0) + mutationActions.length > 0;
  const actionsHidden = columnLayout.isHidden(ACTIONS_COLUMN_KEY);
  const hostRowActions = props.rowActions;
  const rowActions = useMemo<RowAction<TRow>[] | undefined>(() => {
    if (actionsHidden || !hasRowActions) return undefined;
    if (mutationActions.length === 0) return hostRowActions;
    return [...(hostRowActions ?? []), ...mutationActions];
  }, [actionsHidden, hasRowActions, hostRowActions, mutationActions]);

  // A declared hierarchy is a fact about the rows, so it is armed by the shape
  // the host gave rather than by a mode flag.
  const treeExpansion = useTreeExpansion({
    expandedIds: props.expandedIds,
    onExpandedIdsChange: props.onExpandedIdsChange,
  });
  const treeShaped =
    props.getChildren !== undefined || props.getParentId !== undefined;
  // A branch the browser has not fetched yet: the host says there is more, the
  // rows are not there, so opening it is a request rather than a reveal.
  const lazyChildren = useLazyChildren<TRow>({
    onLoadChildren: props.onLoadChildren,
    hasLoadedChildren: (row) => hasLoadedChildren(row, source.rows, props),
    getRowId,
  });
  // The walked hierarchy, before any lazy-loading chrome is layered on it: the
  // entries are what a toggle looks a row up in, since a nested child never
  // appears in `source.rows` at all.
  const treeEntries = useMemo(
    () =>
      treeShaped
        ? buildTreeEntries<TRow>({
            rows: source.rows,
            getRowId,
            expandedIds: treeExpansion.expandedIds,
            loadingIds: lazyChildren.loadingIds,
            getChildren: props.getChildren,
            getParentId: props.getParentId,
            hasChildren: props.hasChildren,
          })
        : undefined,
    [
      treeShaped,
      source.rows,
      getRowId,
      treeExpansion.expandedIds,
      lazyChildren.loadingIds,
      props.getChildren,
      props.getParentId,
      props.hasChildren,
    ]
  );
  /**
   * The same hierarchy with every node open.
   *
   * An export scoped to "all" means all the data, and a folded folder is a
   * display state — the rows inside it matched the filters just the same. The
   * rendered entries stop at every collapsed node, so exporting from them
   * silently drops whole subtrees. This is what the export reads instead.
   */
  const treeExportEntries = useMemo(
    () =>
      treeEntries
        ? buildTreeEntries<TRow>({
            rows: source.rows,
            getRowId,
            // Every node id: a rendered entry carries its whole subtree in
            // `descendantIds` whether or not it is open, and roots are always
            // rendered — so the walked entries name every node in the tree.
            expandedIds: new Set(
              treeEntries.flatMap((entry) => [
                entry.key,
                ...entry.descendantIds,
              ])
            ),
            getChildren: props.getChildren,
            getParentId: props.getParentId,
            hasChildren: props.hasChildren,
          })
        : undefined,
    [
      treeEntries,
      source.rows,
      getRowId,
      props.getChildren,
      props.getParentId,
      props.hasChildren,
    ]
  );
  const tree = useMemo(() => {
    if (!treeEntries) return undefined;
    return {
      entries: treeEntries,
      /** Every node, folded ones included — what an "all" export writes. */
      allEntries: treeExportEntries,
      // Opening a node fetches its children on the way: the row opens at once
      // and fills when they land, so the chevron never feels stuck behind a
      // request.
      expansion: {
        ...treeExpansion,
        toggle: (id: string) => {
          const entry = treeEntries.find((candidate) => candidate.key === id);
          if (entry && !entry.expanded) lazyChildren.loadIfNeeded(entry.row);
          treeExpansion.toggle(id);
        },
      },
      loadingIds: lazyChildren.loadingIds,
      /** Nodes whose last fetch failed — closed, and clickable again. */
      failedIds: lazyChildren.failedIds,
      columnKey: treeColumnKey(columnLayout.visibleColumns, props.treeColumn),
    };
  }, [
    treeEntries,
    treeExportEntries,
    treeExpansion,
    lazyChildren,
    props.treeColumn,
    columnLayout.visibleColumns,
  ]);
  const grouping = useMemo(() => {
    if (groupByKeys.length === 0) return undefined;
    if (!source.allFilteredRows && !serverGroups) return undefined;
    const incremental = incrementalViewOf(source.allFilteredRows ?? []);
    const view = incremental
      ? configureIncrementalView(incremental, {
          groupBy: groupByKeys,
          columns: columnLayout.visibleColumns,
          getRowId,
          groupAggregates,
          groupSort,
          groupFilter,
          groupFooters: groupFooters === true,
          collapsedGroupIds: groupCollapse.collapsedGroupIds,
          groupPageSize,
          rowPageSize: groupRowPageSize,
          paging: groupPaging.paging,
        })
      : undefined;
    const entries = serverGroups
      ? serverGroupEntries({
          groups: serverGroups,
          groupBy: groupByKeys,
          collapsedGroupIds: groupCollapse.collapsedGroupIds,
          getRowId,
          footers: groupFooters === true,
        })
      : (view?.groups ??
        buildGroupedFlatModel({
          rows: source.allFilteredRows ?? [],
          groupBy: groupByKeys,
          columns: columnLayout.visibleColumns,
          getRowId,
          collapsedGroupIds: groupCollapse.collapsedGroupIds,
          aggregates: groupAggregates,
          footers: groupFooters === true,
          sort: groupSort,
          filter: groupFilter,
          groupPageSize,
          rowPageSize: groupRowPageSize,
          paging: groupPaging.paging,
        }));
    // The whole-tree actions need the keys, and the entries are where they
    // are: a collapsed group hides its children, so its own key is still
    // listed while theirs are not — which is exactly what closing everything
    // one level at a time produces.
    const openGroups = entries.flatMap((entry) =>
      entry.kind === "group" ? [{ key: entry.key, level: entry.level }] : []
    );
    const withExtras = insertExtraRows(entries, extraRows, (entry) =>
      entry.kind === "row" ? entry.key : undefined
    );
    return {
      groupBy: groupByKeys,
      collapsed: groupCollapse,
      aggregates: groupAggregates,
      entries: withExtras,
      setGroupBy,
      /**
       * Reveal the next page of groups, or of one group's rows. The table
       * shows what it already holds; `onGroupLoadMore` is where a server tier
       * fetches the rest.
       */
      showMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => {
        const size =
          entry.scope === "groups"
            ? (groupPageSize ?? 0)
            : (groupRowPageSize ?? 0);
        groupPaging.showMore(size, entry.groupKey);
        if (entry.scope === "rows" && entry.groupKey) {
          onGroupLoadMore?.(entry.groupKey);
        }
      },
      expandAll: groupCollapse.expandAll,
      collapseAll: () => {
        groupCollapse.collapseToDepth(0, openGroups);
      },
      collapseToDepth: (depth: number) => {
        groupCollapse.collapseToDepth(depth, openGroups);
      },
    };
  }, [
    groupByKeys,
    serverGroups,
    source.allFilteredRows,
    columnLayout.visibleColumns,
    getRowId,
    groupCollapse,
    groupAggregates,
    groupFooters,
    groupSort,
    groupFilter,
    groupPageSize,
    groupRowPageSize,
    onGroupLoadMore,
    extraRows,
    groupPaging,
    setGroupBy,
  ]);

  // See TableChrome.editingRows — the row universe the editing layer
  // validates against must match what the body renders.
  const editingRows = useMemo<readonly TRow[]>(() => {
    if (!grouping) return viewSource.rows;
    const leaves: TRow[] = [];
    for (const entry of grouping.entries) {
      if (entry.kind === "row") leaves.push(entry.row);
    }
    return leaves;
  }, [grouping, viewSource.rows]);

  // Reorder a flat list, never a nested one: grouping and trees have their
  // own order, and a splice through them would silently lie.
  const requestedReorder = props.onRowReorder !== undefined;
  const reorderBlocked = grouping !== undefined || treeShaped;
  useEffect(() => {
    if (!requestedReorder || !reorderBlocked) return;
    devWarn(
      "onRowReorder is ignored while grouping or a tree is armed — reorder a flat list, not a nested one."
    );
  }, [requestedReorder, reorderBlocked]);
  const hasRowReorder = requestedReorder && !reorderBlocked;
  const reorderHidden = columnLayout.isHidden(REORDER_COLUMN_KEY);
  const rowReorderEnabled = hasRowReorder && !reorderHidden;
  const hostRowReorder = props.onRowReorder;
  const rowReorderState = useRowReorder<TRow>({
    enabled: rowReorderEnabled,
    onRowReorder: hostRowReorder,
    labels: {
      reorderRow: table.labels.reorderRow,
      moveRowUp: table.labels.moveRowUp,
      moveRowDown: table.labels.moveRowDown,
      rowLifted: table.labels.rowLifted,
      rowMoved: table.labels.rowMoved,
      rowReorderCancelled: table.labels.rowReorderCancelled,
    },
    rowAt: (index) => editingRows[index],
  });
  const rowReorder = rowReorderEnabled ? rowReorderState : undefined;

  const rowPinning = useChromeRowPinning<TRow>({
    requested:
      props.pinnedRowIds !== undefined ||
      props.onPinnedRowIdsChange !== undefined,
    blocked: grouping !== undefined || treeShaped,
    pinnedRowIds: props.pinnedRowIds,
    onPinnedRowIdsChange: props.onPinnedRowIdsChange,
    getRowId: (row) => rowKey(row),
    labels: {
      pinToTop: table.labels.pinToTop,
      pinToBottom: table.labels.pinToBottom,
      unpinRow: table.labels.unpinRow,
    },
  });

  useEffect(() => {
    if (!editing) return;
    editing.state.discardIfRowMissing(editingRows, (row) =>
      rowKey(row as TRow)
    );
    conflict.reconcile({
      active: editing.state.active,
      openedRow: editing.state.openedRow() as TRow | undefined,
      draft: editing.state.draft,
      rows: editingRows,
      columns: resolvedColumns,
      rowKey,
      rowVersion: props.rowVersion,
      policy: props.editConflictPolicy ?? "ask",
      onEditConflict: props.onEditConflict,
      keep: (row) => {
        editing.state.keepLive(row);
      },
      take: (row, value) => {
        editing.state.takeLive(row, value);
      },
    });
  }, [
    editing,
    editingRows,
    rowKey,
    conflict,
    resolvedColumns,
    props.rowVersion,
    props.editConflictPolicy,
    props.onEditConflict,
  ]);

  const showFooter =
    isPaged &&
    !viewSource.error &&
    (viewSource.total > 0 || viewSource.isLoading || viewSource.isFetching);

  const featureNotices = useMemo(
    () =>
      collectFeatureNotices({
        virtualize: props.virtualize,
        paginationMode: source.paginationMode,
        groupByKeys,
        allFilteredRows: source.allFilteredRows,
        serverGroups,
        rowPinningRequested:
          props.pinnedRowIds !== undefined ||
          props.onPinnedRowIdsChange !== undefined,
        rowReorderRequested: props.onRowReorder !== undefined,
        nestedArmed: grouping !== undefined || treeShaped,
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
      serverGroups,
      props.pinnedRowIds,
      props.onPinnedRowIdsChange,
      props.onRowReorder,
      grouping,
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

  const hasAnyActions = hasRowActions || rowPinning !== undefined;
  const visibleRowActions = useMemo(() => {
    if (actionsHidden || !hasAnyActions) return undefined;
    const pins = rowPinning?.actions ?? [];
    if (pins.length === 0) return rowActions;
    return [...(rowActions ?? []), ...pins];
  }, [actionsHidden, hasAnyActions, rowActions, rowPinning]);

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
    rowActions: visibleRowActions,
    hasRowActions: hasAnyActions,
    hasRowReorder,
    rowReorder,
    rowPinning,
    editing,
    grouping,
    tree,
    editingRows,
    showFooter,
    columnLayout,
    columnGroups: flattened.groups,
    allColumns: resolvedColumns,
    featureNotices,
  };
}

/**
 * Result of {@link useChromeBodyData}.
 *
 * @internal
 */
export interface ChromeBodyData<TRow> {
  /** Row/card window virtualization state (disabled unless eligible). */
  virtualization: TableVirtualization<TRow>;
  /**
   * When grouping is armed, the (possibly virtual-windowed) flat entries
   * adapters should render. `undefined` when grouping is dormant.
   */
  groupingEntries?: readonly GroupedFlatEntry<TRow>[];
  /**
   * When a tree is armed, the (possibly virtual-windowed) entries adapters
   * should render. `undefined` when the table is flat.
   */
  treeEntries?: readonly TreeEntry<TRow>[];
  /** Sentinel ref that auto-loads the next page in infinite mode. */
  loadMoreRef: RefObject<HTMLDivElement | null>;
  /** Whether the load-more affordance applies (infinite mode, no error). */
  canLoadMore: boolean;
  /**
   * Attach to the `maxHeight` scroll box (when one renders) so the virtual
   * window tracks the box's scrolling instead of the page's. Harmless to
   * attach when virtualization is off.
   */
  virtualScrollRef: RefCallback<HTMLElement>;
  /** Top-pinned rows, removed from the virtual window. */
  pinnedTopRows: readonly TRow[];
  /** Bottom-pinned rows, removed from the virtual window. */
  pinnedBottomRows: readonly TRow[];
}

/**
 * The shared data-flow wiring between {@link useTableChrome} and an
 * adapter's body: window virtualization (eligible only for real rows in
 * infinite mode) and the infinite-scroll sentinel. Extracted because four
 * adapters repeated this block verbatim; antd opts out (it scrolls inside
 * its own `<Table>` container).
 *
 * @typeParam TRow - The row type.
 * @param chrome - The {@link useTableChrome} result.
 * @param props - The adapter's `BaseDataTableProps`.
 * @returns Virtualization state + the load-more sentinel.
 *
 * @internal
 */
export function useChromeBodyData<TRow>(
  chrome: TableChrome<TRow>,
  props: BaseDataTableProps<TRow>
): ChromeBodyData<TRow> {
  const { rowKey, virtualize = false } = props;
  // The chrome's view facade, so grouped full-set state (no next page, all
  // rows present) drives the sentinel and virtualization too.
  const { source } = chrome;
  if (virtualize && source.paginationMode === "paged") {
    devWarn(
      'virtualize only applies in infinite mode — this paged table renders unvirtualized. Pass paginationMode="infinite" to enable it.'
    );
  }
  const fetchNext = useCallback(() => {
    if (source.hasNextPage && !source.isFetchingNextPage) {
      source.fetchNextPage();
    }
  }, [source]);
  const scrollBoxRef = useRef<HTMLElement | null>(null);
  const inScrollBox = props.maxHeight != null;
  // Window mode needs the list's document Y as TanStack `scrollMargin`.
  // Without it, page chrome above the table is treated as already-scrolled
  // rows and the body opens with a blank gap. An explicit prop wins.
  const measureWindowOffset =
    virtualize && !inScrollBox && props.virtualScrollMargin == null;
  const { scrollMargin: measuredScrollMargin, observe: observeWindowList } =
    useMeasuredWindowScrollMargin(measureWindowOffset, chrome.rootRef);
  const virtualScrollRef = useCallback(
    (node: HTMLElement | null) => {
      scrollBoxRef.current = node;
      observeWindowList(node);
    },
    [observeWindowList]
  );
  const bodyEligible = isBodyEligible(chrome);
  const groupingArmed = Boolean(chrome.grouping);
  const groupKeys = entryKeys(chrome.grouping?.entries);
  // A tree is a keyed flat list once it has been walked, exactly like a
  // grouped model — so it windows through the same hook rather than a second
  // one. Without this a 50,000-row hierarchy renders 50,000 rows: the row
  // virtualizer counts source rows, and a tree's visible list is its own.
  const treeArmed = Boolean(chrome.tree);
  const treeKeys = entryKeys(chrome.tree?.entries);
  const pinState = chrome.rowPinning?.state;
  const partitioned = useMemo(() => {
    if (!pinState) {
      return { top: [] as TRow[], scroll: source.rows, bottom: [] as TRow[] };
    }
    return partitionPinnedRows(source.rows, pinState, rowKey);
  }, [pinState, rowKey, source.rows]);
  const estimateSize = estimateBodyItemSize(chrome, props, partitioned.scroll);
  const scrollOpts = {
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin ?? measuredScrollMargin,
    getScrollElement: inScrollBox ? () => scrollBoxRef.current : undefined,
    onEndReached: fetchNext,
    estimateSize,
  } as const;

  // Both hooks run unconditionally (Rules of Hooks); exactly one is enabled.
  const groupVirtualization = useKeyedVirtualization({
    keys: groupKeys,
    enabled: virtualize && groupingArmed && bodyEligible,
    ...scrollOpts,
  });
  const treeVirtualization = useKeyedVirtualization({
    keys: treeKeys,
    enabled: virtualize && treeArmed && !groupingArmed && bodyEligible,
    ...scrollOpts,
  });

  const virtualization = useTableVirtualization({
    rows: partitioned.scroll,
    rowKey,
    enabled: virtualize && !groupingArmed && !treeArmed && bodyEligible,
    // Detail panels are separate elements from their rows on desktop, so the
    // window measures the two together. A mobile card nests the detail inside
    // the card, so the card element is the whole item — keep measureElement.
    expandable: measureRowDetailAsPair(chrome.isMobile, props.renderRowDetail),
    ...scrollOpts,
  });

  const groupingEntries = chrome.grouping
    ? windowGroupedEntries(chrome.grouping.entries, groupVirtualization.indices)
    : undefined;
  const treeEntries = chrome.tree
    ? windowGroupedEntries(chrome.tree.entries, treeVirtualization.indices)
    : undefined;

  const resolvedVirtualization = resolveBodyVirtualization(
    groupingArmed ? groupVirtualization : treeVirtualization,
    virtualization
  );

  const boxVirtual = resolvedVirtualization.enabled && inScrollBox;
  const canLoadMore = !chrome.isPaged && !source.error && !boxVirtual;
  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    hasNextPage: Boolean(source.hasNextPage),
    isFetchingNextPage: Boolean(source.isFetchingNextPage),
    fetchNextPage: fetchNext,
    itemCount: bodySentinelCount(chrome, groupingArmed),
    enabled: canLoadMore,
  });
  const sourceIndexById = useMemo(() => {
    const map = new Map<string, number>();
    source.rows.forEach((row, index) => map.set(rowKey(row), index));
    return map;
  }, [rowKey, source.rows]);

  const pinnedVirtualization = useMemo(() => {
    if (!pinState) return resolvedVirtualization;
    return {
      ...resolvedVirtualization,
      rows: resolvedVirtualization.rows.map((entry) => ({
        ...entry,
        sourceIndex: sourceIndexById.get(entry.key) ?? entry.index,
      })),
    };
  }, [pinState, resolvedVirtualization, sourceIndexById]);

  return {
    virtualization: pinnedVirtualization,
    groupingEntries,
    treeEntries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef,
    pinnedTopRows: partitioned.top,
    pinnedBottomRows: partitioned.bottom,
  };
}

/**
 * Whether a row's children are already in the data.
 *
 * Both declarations answer it: nested data has them under the row, a flat table
 * has them among the rows keyed by their parent. A node with none is one the
 * host said has children (`hasChildren`) and the browser has not fetched.
 */
function hasLoadedChildren<TRow>(
  row: TRow,
  rows: readonly TRow[],
  props: BaseDataTableProps<TRow>
): boolean {
  const nested = props.getChildren?.(row);
  if (nested !== undefined) return nested.length > 0;
  const { getParentId, rowKey } = props;
  if (!getParentId) return false;
  const id = rowKey(row);
  return rows.some((candidate) => getParentId(candidate) === id);
}

/** The keys of a walked model's entries — one shape for groups and trees. */
function entryKeys(entries?: readonly { key: string }[]): string[] {
  return entries?.map((entry) => entry.key) ?? [];
}

/** Whether the body is a real row/card list the window can apply to. */
function isBodyEligible<TRow>(chrome: TableChrome<TRow>): boolean {
  return (
    !chrome.isPaged &&
    !chrome.source.error &&
    (chrome.body === "desktop" || chrome.body === "mobile")
  );
}

/**
 * Desktop detail is a sibling of the row, so the window measures the pair.
 * A mobile card nests the detail inside the card — one element, not a pair.
 */
function measureRowDetailAsPair(
  isMobile: boolean,
  renderRowDetail: unknown
): boolean {
  return !isMobile && renderRowDetail !== undefined;
}

/** A card's height on a phone, a row's on a desktop — or `rowHeight`. */
function estimateBodyItemSize<TRow>(
  chrome: TableChrome<TRow>,
  props: BaseDataTableProps<TRow>,
  scrollRows: readonly TRow[]
): (index: number) => number {
  const fallback = chrome.isMobile
    ? (props.estimateCardSize ?? DEFAULT_CARD_SIZE_PX)
    : (props.estimateRowSize ?? DEFAULT_ROW_SIZE_PX);
  return estimateFromRowHeight(props.rowHeight, fallback, (index) => {
    if (chrome.grouping) {
      const entry = chrome.grouping.entries[index];
      if (entry?.kind === "row") return { row: entry.row, index: entry.index };
      return undefined;
    }
    if (chrome.tree) {
      const entry = chrome.tree.entries[index];
      if (entry) return { row: entry.row, index };
      return undefined;
    }
    const row = scrollRows[index];
    return row === undefined ? undefined : { row, index };
  });
}

/** How many items the infinite-scroll sentinel counts as already rendered. */
function bodySentinelCount<TRow>(
  chrome: TableChrome<TRow>,
  groupingArmed: boolean
): number {
  if (groupingArmed) return chrome.grouping?.entries.length ?? 0;
  return chrome.source.rows.length;
}

function resolveBodyVirtualization<TRow>(
  keyed: ReturnType<typeof useKeyedVirtualization>,
  virtualization: TableVirtualization<TRow>
): TableVirtualization<TRow> {
  if (!keyed.enabled) return virtualization;
  return {
    enabled: true,
    rows: [],
    paddingTop: keyed.paddingTop,
    paddingBottom: keyed.paddingBottom,
    measureElement: keyed.measureElement,
  };
}

/**
 * The shared scroll-restoration wiring every adapter `<DataTable>` needs:
 * when search / sort / page / filters change, scroll the table back below
 * the sticky chrome. Extracted so the identical block isn't repeated (and
 * flagged as duplication) in each adapter.
 *
 * @typeParam TRow - The row type.
 * @param ref - The adapter's root element.
 * @param chrome - The {@link useTableChrome} result.
 * @param props - The adapter's `BaseDataTableProps`.
 *
 * @internal
 */
export function useChromeScrollReset<TRow>(
  ref: RefObject<HTMLElement | null>,
  chrome: TableChrome<TRow>,
  props: BaseDataTableProps<TRow>
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
 * @internal
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
function useChromeRowPinning<TRow>(options: {
  requested: boolean;
  blocked: boolean;
  pinnedRowIds?: RowPinState;
  onPinnedRowIdsChange?: (next: RowPinState) => void;
  getRowId: (row: TRow) => string;
  labels: RowPinLabels;
}): RowPinningState<TRow> | undefined {
  const { requested, blocked, labels } = options;
  useEffect(() => {
    if (!requested || !blocked) return;
    devWarn(
      "row pinning is ignored while grouping or a tree is armed — pin a flat list, not a nested one."
    );
  }, [blocked, requested]);
  const enabled = requested && !blocked;
  const state = useRowPinning<TRow>({
    enabled,
    pinnedRowIds: options.pinnedRowIds,
    onPinnedRowIdsChange: options.onPinnedRowIdsChange,
    getRowId: options.getRowId,
    labels,
  });
  return enabled ? state : undefined;
}

/**
 * Pointer and click handlers that open the filters overlay without double-firing.
 *
 * @internal
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
