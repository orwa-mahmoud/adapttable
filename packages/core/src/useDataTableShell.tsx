import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { autoSizeColumns as autoSizeAllColumns } from "./columns/autoSizeColumns";
import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
} from "./columns/columnMenuModel";
import { flattenColumnTree } from "./columns/columnTree";
import { asGesture, useTableEditHistory } from "./editing/editHistory";
import { makeExportCsvHandler, resolveExportCsv } from "./export/tableCsv";
import { useExportHandler } from "./export/useExportHandler";
import { bindFeatureHostFn } from "./features/currentHost";
import {
  featureHostOf,
  rememberFeatureHost,
  useTableFeatures,
} from "./features/featureHost";
import type { FacetMap } from "./filters/facets";
import { resolveFilterMode, toolbarShowsFilters } from "./filters/filterChrome";
import type { FilterDef } from "./filters/filterDefs";
import type { FilterTypeRegistry } from "./filters/filterRegistry";
import { useFindFocus, useFindInTable } from "./find/useFindInTable";
import { cellFillHandler, cellPasteHandler } from "./focus/pasteRange";
import { selectionStats } from "./focus/selectionStats";
import { useGridFocus } from "./focus/useGridFocus";
import { useFullscreen } from "./layout/useFullscreen";
import type { BaseDataTableProps } from "./props";
import { coveredAddressSet } from "./rows/cellSpan";
import type { RowPinState } from "./rows/rowPinning";
import type { QuerySupport } from "./source/queryContract";
import type { TableSource } from "./source/TableSource";
import {
  type DataModeProps,
  isDeclarativeFilters,
  useTableData,
} from "./source/useTableData";
import { type UrlStateAdapter, useResolvedAdapter } from "./url/adapter";
import { useRowPinningUrlState } from "./url/useRowPinningUrlState";
import {
  printToolbar,
  undoRedoToolbar,
  useChromeBodyData,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useTableChrome,
  viewControlsToolbar,
} from "./useTableChrome";
import { useColumnWindow } from "./virtual/useColumnWindow";

/**
 * The kit-agnostic prop surface every batteries-included `<DataTable>` shares:
 * the base display props plus the three data tiers (`source` / `data` +
 * `onQueryChange`) and the URL-sync controls. Adapters extend this with
 * kit-specific extras (slots, classNames, colour, table size) and pass the
 * whole thing straight through to {@link useDataTableShell}.
 *
 * @typeParam TRow - The row type.
 */
export type DataTableShellProps<TRow> = Omit<
  BaseDataTableProps<TRow>,
  "source"
> & {
  /** Full-control tier: a prebuilt source. */
  source?: TableSource<TRow>;
  /** Frontend tier: the raw rows. */
  data?: readonly TRow[];
  /** Server tier: total row count across all pages. */
  total?: number;
  /** Server tier: a request is in flight. */
  loading?: boolean;
  /** Forwarded error to display in the table's error state. */
  error?: Error | null;
  /** URL-state backend (defaults to the History API). */
  urlAdapter?: UrlStateAdapter;
  /** Sync table state to the URL (default `true`). */
  urlSync?: boolean;
  /** Namespace for this table's URL params. */
  urlKey?: string;
  /**
   * Server tier: what this endpoint can answer. `supports.facets`
   * unlocks `query.facets` for checklist counts.
   */
  supports?: QuerySupport;
  /**
   * Server tier: keys to send as `query.facets`. Defaults to every
   * `checklist` definition.
   */
  facetKeys?: readonly string[];
  /** Server tier: distinct-value counts from the last fetch. */
  facets?: FacetMap;
} & DataModeProps<TRow>;

/**
 * The whole shared orchestration behind a batteries-included `<DataTable>`:
 * resolve the data tier, build the declarative-filter runtime, wire the table
 * chrome (selection, columns, pagination, scroll reset, body virtualization),
 * and assemble the kit-agnostic prop bundles a table renderer and a toolbar
 * need. The Chakra and Radix adapters are byte-identical here, so this lives
 * once in core; each adapter supplies only its kit's filter form (via
 * `renderAutoForm`) and renders its own controls over the returned state.
 *
 * @typeParam TRow - The row type.
 * @param props - The adapter's data-table props.
 * @param renderAutoForm - Builds the kit's auto-filter form for declarative
 *   filters (called only when there are declarative defs).
 * @returns The resolved source, chrome, filter node, refs, and the
 *   `tableProps` / `toolbarProps` bundles (sans kit-specific extras).
 */

export function useDataTableShell<TRow>(
  incoming: DataTableShellProps<TRow>,
  renderAutoForm: (
    defs: readonly FilterDef<TRow>[],
    source: TableSource<TRow>,
    registry: FilterTypeRegistry
  ) => ReactNode
) {
  const props = useTableFeatures(incoming);
  const featureHost = featureHostOf(props);
  // ONE resolved URL backend for everything in this table: the tier hooks
  // AND chrome that reads URL state (saved views) share this instance, so
  // with `urlSync={false}` they share the same in-memory backend instead of
  // the views hook silently falling back to the real address bar.
  const urlAdapter = useResolvedAdapter(
    props.urlSync === false ? undefined : props.urlAdapter,
    props.urlSync !== false
  );
  const dataColumns = useMemo(
    () => flattenColumnTree(props.columns).leaves,
    [props.columns]
  );
  // Resolve the data tier (source > onQueryChange server > frontend) and the
  // declarative-filter runtime (defs, chip labels, URL keys, predicate).
  const { source, runtime } = useTableData<TRow>({
    locale: props.locale,
    source: props.source,
    data: props.data,
    total: props.total,
    loading: props.loading,
    error: props.error,
    mode: props.mode,
    onQueryChange: props.onQueryChange,
    urlAdapter,
    // No `urlSync` here on purpose: the decision is already baked into WHICH
    // adapter was resolved above (memory when off, the real one when on), and
    // the tier hooks would otherwise apply it a second time — routing the
    // active tier to a private store that saved views cannot see.
    urlKey: props.urlKey,
    columns: dataColumns,
    filters: props.filters,
    filterTypes: props.filterTypes,
    featureHost,
    defaults: props.defaults,
    paginationMode: props.paginationMode,
    supports: props.supports,
    facetKeys: props.facetKeys,
    facets: props.facets,
  });
  const { history, onCellEdit: recordingCellEdit } = useTableEditHistory<TRow>({
    ...props,
    columns: dataColumns,
  });

  // Declarative `filters` array → the auto-built form; JSX passes through.
  const autoForm =
    runtime.defs.length > 0
      ? renderAutoForm(runtime.defs, source, runtime.registry)
      : undefined;
  const filtersNode =
    isDeclarativeFilters(props.filters) || props.filters === undefined
      ? autoForm
      : props.filters;
  const pinProps = useShellRowPins(props, urlAdapter);
  const chromeProps = {
    ...props,
    onCellEdit: recordingCellEdit,
    source,
    filters: filtersNode,
    filterDefs: runtime.defs,
    filterLabels: { ...runtime.filterLabels, ...props.filterLabels },
    summaryRow: bindFeatureHostFn(featureHost, props.summaryRow),
    groupAggregates: bindFeatureHostFn(featureHost, props.groupAggregates),
    ...pinProps,
  };
  rememberFeatureHost(chromeProps, featureHost);
  const chrome = useTableChrome<TRow>(chromeProps);
  const { table, confirm, getRowId } = chrome;
  const { labels } = table;
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Cell navigation is wired HERE rather than in `useDataTable`, so a headless
  // consumer of the main entry never pays for a grid it did not ask for — the
  // bundle budget catches that regression, which is how this landed here.
  //
  // The row count is the DATASET total and `windowStart` is where the rendered
  // slice begins, so Ctrl+End reaches the real last row and the ARIA counts stay
  // truthful under virtualization. Derived here so no adapter has to know: an
  // off-by-a-page error is invisible on screen and only wrong to a screen reader.
  const windowStart =
    chrome.source.paginationMode === "paged"
      ? Math.max(0, (chrome.source.page - 1) * chrome.source.limit)
      : 0;
  // Find state first: the grid marks the cells it matched, and the effect
  // below walks focus to whichever match the user is on.
  const find = useFindInTable<TRow>({
    enabled: props.findInTable === true,
    rows: chrome.source.rows,
    columns: chrome.columnLayout.visibleColumns,
    firstRowIndex: windowStart,
  });
  const coveredCells = useMemo(
    () =>
      coveredAddressSet({
        rows: chrome.source.rows,
        columns: chrome.columnLayout.visibleColumns,
        getCellSpan: props.getCellSpan,
        firstRowIndex: windowStart,
        pinOffset: chrome.columnLayout.pinOffset,
      }),
    [
      chrome.source.rows,
      chrome.columnLayout.visibleColumns,
      chrome.columnLayout.pinOffset,
      props.getCellSpan,
      windowStart,
    ]
  );
  const isCoveredCell = useCallback(
    (cell: { row: number; col: number }) =>
      coveredCells.has(`${cell.row}:${cell.col}`),
    [coveredCells]
  );
  const gridFocus = useGridFocus<TRow>({
    enabled: props.cellNavigation === true,
    headerCheckbox: props.columnSelectionCheckbox === true,
    rowCount: Math.max(
      chrome.source.total,
      windowStart + chrome.source.rows.length
    ),
    columns: chrome.columnLayout.visibleColumns,
    rows: chrome.source.rows,
    firstRowIndex: windowStart,
    dir: props.dir,
    labels,
    onCut: props.onCellCut,
    // With no `onCellPaste`, the ordinary edit channel takes each cell: a table
    // that can be edited can be pasted into with nothing extra wired. A batch
    // is ONE undo entry, so it records itself rather than per cell.
    onPaste: asGesture(cellPasteHandler(props), history.record),
    onFill: asGesture(cellFillHandler(props), history.record),
    onUndo: history.undo,
    onRedo: history.redo,
    onFind: find.openBar,
    matchKeys: find.matchKeys,
    currentMatch: find.current,
    isCoveredCell,
  });
  useFindFocus(find.current, gridFocus.focusCell, gridFocus.selectRange);
  // Computed here rather than in eight adapters: the rectangle, the rows and
  // the window offset all live on this side, and an adapter that derived any
  // of them itself would be the one place the figures could go wrong.
  const stats = selectionStats({
    enabled: props.selectionStats === true,
    range: gridFocus.range,
    rows: chrome.source.rows,
    columns: chrome.columnLayout.visibleColumns,
    firstRowIndex: windowStart,
  });
  const filtersTrigger = useFilterTriggerToggle(filtersOpen, setFiltersOpen);
  // Layout-visible columns WITHOUT device filtering: the same button must
  // produce the same file on phone and desktop. The selection, the full column
  // set and the highlighted range come along so `scope: "selected"`,
  // `columns: "all"` and `scope: "range"` work without the host wiring anything
  // up — the columns here are the same list cell navigation addresses, which is
  // what makes a range's column indices mean the same thing on both sides.
  const exportHandler = useExportHandler(
    makeExportCsvHandler(
      props.exportCsv,
      chrome.source,
      chrome.columnLayout.visibleColumns,
      {
        selectedIds: table.selection?.selectedIds,
        getRowId,
        allColumns: chrome.allColumns,
        range: gridFocus.range,
        firstRowIndex: windowStart,
        getCellSpan: props.getCellSpan,
        grouping: chrome.grouping,
        tree: chrome.tree,
        groupTotal: labels.groupTotal,
        summaryRow: chromeProps.summaryRow,
      },
      featureHost
    ),
    labels,
    // The button names the format it produces, so a spreadsheet writer relabels
    // it without the host retyping a translated string.
    resolveExportCsv(props.exportCsv, featureHost)?.writer?.extension,
    chrome.featureNotices.some((notice) => notice.kind === "export-all-page")
  );
  // The chrome owns it: progressive column hiding measures this element.
  const rootRef = chrome.rootRef;
  // Fullscreen also decides where every overlay portals: promoted, the rest
  // of the document is hidden, so a menu on `document.body` is invisible.
  const fullscreen = useFullscreen(rootRef.current);
  useChromeScrollReset(rootRef, chrome, chromeProps);
  // Name the root the way the scroll box is named: the column menu sizes
  // columns by measuring cells, and it has to know which table is its own.
  useEffect(() => {
    rootRef.current?.setAttribute("data-adapttable-part", "root");
  });

  /**
   * Size every rendered column to its content — the column menu's action.
   * Measures the DOM, because a cell's width is what the browser laid out
   * rather than anything the data knows.
   */
  const autoSizeColumns = useCallback(
    () =>
      autoSizeAllColumns(
        rootRef.current,
        chrome.columnLayout.visibleColumns.map((column) => column.key),
        chrome.columnLayout.setWidth
      ),
    [chrome.columnLayout, rootRef]
  );
  const autoSizeColumn = useCallback(
    (key: string) =>
      autoSizeAllColumns(rootRef.current, [key], chrome.columnLayout.setWidth),
    [chrome.columnLayout, rootRef]
  );
  const {
    virtualization,
    groupingEntries,
    treeEntries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef: bodyScrollRef,
    pinnedTopRows,
    pinnedBottomRows,
  } = useChromeBodyData(chrome, chromeProps);
  // One scroll box, two windows: the rows track its vertical scrolling and the
  // columns its horizontal, so the adapters attach a single ref.
  const scrollBoxElement = useRef<HTMLElement | null>(null);
  const virtualScrollRef = useCallback(
    (node: HTMLElement | null) => {
      scrollBoxElement.current = node;
      // Desktop kits attach this to an unnamed overflow box. The mobile card
      // list already names itself `cards` — overwriting that would hide the
      // list from window-offset measurement and from every cards query.
      if (node && !node.dataset.adapttablePart) {
        node.dataset.adapttablePart = "scroll-box";
      }
      bodyScrollRef(node);
    },
    [bodyScrollRef]
  );

  // The injected actions column is first-class in column management: the layout
  // state treats its reserved key like any column key, so the Columns menu can
  // hide it (strip rowActions before the renderers) or end-pin it (the
  // renderers stick the actions cells, with zero data columns pinned).
  const { hasRowActions, rowActions, hasRowReorder, rowReorder } = chrome;
  const actionsPinned =
    chrome.columnLayout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  const reorderPinned =
    chrome.columnLayout.state.pinned[REORDER_COLUMN_KEY] === "start";

  // The horizontal window reads the same scroll box the vertical one does.
  const columnWindow = useColumnWindow<TRow>({
    columns: chrome.columnLayout.visibleColumns,
    enabled: props.virtualizeColumns === true,
    widths: chrome.columnLayout.state.widths,
    pinnedKeys: new Set(
      Object.keys(chrome.columnLayout.state.pinned).filter(
        (key) => chrome.columnLayout.state.pinned[key] !== undefined
      )
    ),
    getScrollElement: () => scrollBoxElement.current,
  });

  const grouping =
    chrome.grouping && groupingEntries
      ? { ...chrome.grouping, entries: groupingEntries }
      : chrome.grouping;
  // Same shape for the hierarchy: what the body renders is the window, not the
  // whole walked tree.
  const tree =
    chrome.tree && treeEntries
      ? { ...chrome.tree, entries: treeEntries }
      : chrome.tree;

  // The kit-agnostic slice of a table renderer's props — the adapter spreads
  // this and adds its kit's row `size` and accent colour.
  const tableProps = {
    table,
    gridFocus,
    rows: chrome.editingRows,
    rowActions,
    rowActionsLayout: props.rowActionsLayout,
    renderRowActions: props.renderRowActions,
    actionsPinned,
    rowReorder,
    reorderPinned,
    pinnedTopRows,
    pinnedBottomRows,
    rowPinning: chrome.rowPinning,
    getCellSpan: props.getCellSpan,
    cellSpanAppearance: props.cellSpanAppearance,
    extraRows: props.extraRows,
    windowStart,
    confirm,
    getRowId,
    rowEntries: virtualization.enabled ? virtualization.rows : undefined,
    paddingTop: virtualization.paddingTop,
    paddingBottom: virtualization.paddingBottom,
    measureElement: virtualization.measureElement,
    measureRowPair: virtualization.measureRowPair,
    columnWindow,
    fitColumns: props.fitColumns,
    tree,
    stickyHeader: props.stickyHeader,
    stickyTop: props.stickyTop,
    headerFilters:
      resolveFilterMode(props.filtersMode, props.headerFilters) === "header",
    closeHeaderFilterOnSelect: props.closeHeaderFilterOnSelect === true,
    filterDefs: runtime.defs,
    filterRegistry: runtime.registry,
    pinOffset: chrome.columnLayout.pinOffset,
    maxHeight: props.maxHeight,
    virtualScrollRef,
    setWidth: props.resizableColumns ? chrome.columnLayout.setWidth : undefined,
    columnWidths: chrome.columnLayout.state.widths,
    resizeLabel: table.labels.resizeColumn,
    onRowClick: props.onRowClick,
    prefetch: props.prefetch,
    rowClassName: props.rowClassName,
    isCellFlashing: props.isCellFlashing,
    collapsibleColumnGroups: props.collapsibleColumnGroups === true,
    collapsedColumnGroups: chrome.columnLayout.state.collapsedGroups,
    columnGroups: chrome.columnGroups,
    onToggleColumnGroup: chrome.columnLayout.toggleColumnGroup,
    rowStyle: props.rowStyle,
    rowHeight: props.rowHeight,
    renderRowDetail: chrome.detail?.render,
    renderCard: props.renderCard,
    summaryRow: chromeProps.summaryRow,
    expansion: chrome.detail?.expansion,
    editing: chrome.editing,
    grouping,
    dir: props.dir,
  };

  // The kit-agnostic slice of the toolbar's props — the adapter spreads this
  // and adds its filters-mode wiring, saved-views / column menus, and colour.
  const toolbarProps = {
    table,
    searchable: props.searchable !== false,
    searchPlaceholder: props.searchPlaceholder,
    sortByOptions: props.sortByOptions,
    toolbar: props.toolbar,
    toolbarSlots: props.toolbarSlots,
    ...undoRedoToolbar(props.undoRedoButtons, history, labels),
    ...printToolbar(props.printButton, props.onPrint, labels),
    ...viewControlsToolbar(props, fullscreen),
    hasFilters: toolbarShowsFilters(
      resolveFilterMode(props.filtersMode, props.headerFilters),
      Boolean(filtersNode),
      Boolean(table.source.setFilterTree)
    ),
    activeFilterCount: chrome.activeFilterCount,
    filters: filtersNode,
    onClearFilters: chrome.clearFilters,
    // Hidden in the grouped full-set view, where page size has no effect.
    showRowsPerPage: canLoadMore && !chrome.grouping,
    onAddRow: chrome.rowMutations.canAdd
      ? chrome.rowMutations.addRow
      : undefined,
    addRowLabel: labels.addRow,
    ...exportHandler,
    dir: props.dir,
  };

  return {
    /** Cell-navigation state; inert unless `cellNavigation` is set. */
    gridFocus,
    /** What the selection adds up to; `null` unless `selectionStats` is set. */
    selectionStats: stats,
    /** Undo/redo controls; inert unless `editHistory` is set. */
    editHistory: history,
    /** Find-bar state; inert unless `findInTable` is set. */
    find,
    // The chrome's VIEW facade — with grouping armed it presents the full
    // rendered set, so adapter footers and export buttons stay truthful.
    source: chrome.source,
    runtime,
    /** The table's resolved URL backend — pass to saved-views UIs. */
    urlAdapter,
    chrome,
    table,
    labels,
    filtersNode,
    filtersOpen,
    setFiltersOpen,
    filtersTrigger,
    rootRef,
    /** Fullscreen state, and the portal container overlays need with it. */
    fullscreen,
    /** Size every rendered column to its content. */
    autoSizeColumns,
    autoSizeColumn,
    loadMoreRef,
    canLoadMore,
    hasRowActions,
    hasRowReorder,
    tableProps,
    toolbarProps,
    /** The host this table owns — adapters pass it into palette / menu hooks. */
    featureHost,
  };
}

/**
 * Uncontrolled pins write the URL; a host that passes `pinnedRowIds` owns
 * the lists and the URL hook stays a no-op.
 */
function useShellRowPins<TRow>(
  props: Pick<
    DataTableShellProps<TRow>,
    "pinnedRowIds" | "onPinnedRowIdsChange" | "urlSync" | "urlKey"
  >,
  urlAdapter: UrlStateAdapter
): {
  pinnedRowIds: RowPinState | undefined;
  onPinnedRowIdsChange: ((next: RowPinState) => void) | undefined;
} {
  const requested =
    props.pinnedRowIds !== undefined ||
    props.onPinnedRowIdsChange !== undefined;
  const pinUrl = useRowPinningUrlState({
    urlAdapter,
    urlSync:
      props.urlSync !== false && requested && props.pinnedRowIds === undefined,
    urlKey: props.urlKey,
  });
  if (!requested) {
    return { pinnedRowIds: undefined, onPinnedRowIdsChange: undefined };
  }
  return {
    pinnedRowIds: props.pinnedRowIds ?? pinUrl.pinnedRowIds,
    onPinnedRowIdsChange: (next: RowPinState) => {
      if (props.pinnedRowIds === undefined) {
        pinUrl.onPinnedRowIdsChange(next);
      }
      props.onPinnedRowIdsChange?.(next);
    },
  };
}
