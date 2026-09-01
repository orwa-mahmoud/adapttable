import type { ReactNode, RefCallback, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTableStatusAnnouncement } from "./a11y/useTableStatusAnnouncement";
import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
} from "./columns/columnMenuModel";
import { flattenColumnTree } from "./columns/columnTree";
import { bindFeatureHostFn } from "./features/currentHost";
import { useResolvedDensity } from "./features/densityStateKey";
import {
  featureHostOf,
  rememberFeatureHost,
  useTableFeatures,
} from "./features/featureHost";
import {
  DISABLED_EXPORT,
  DISABLED_FIND,
  DISABLED_FULLSCREEN,
  disabledColumnWindow,
  disabledGridFocus,
  disabledHistory,
  disabledSelectionStats,
} from "./features/shellLiveStubs";
import type { FacetMap } from "./filters/facets";
import { resolveFilterMode, toolbarShowsFilters } from "./filters/filterChrome";
import type { FilterDef } from "./filters/filterDefs";
import type { FilterTypeRegistry } from "./filters/filterRegistry";
import type { AssemblyFns } from "./layout/leanAssembly";
import type { ComposedTableProps } from "./props";
import { isDeclarativeFilters } from "./source/isDeclarativeFilters";
import type { QuerySupport } from "./source/queryContract";
import type { TableSource } from "./source/TableSource";
import type { DataModeProps } from "./source/useTableDataImpl";
import { useTableDataLean } from "./source/useTableDataLean";
import { type UrlStateAdapter, useResolvedAdapter } from "./url/adapter";
import {
  printToolbar,
  undoRedoToolbar,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useTableChrome,
  viewControlsToolbar,
} from "./useTableChrome";
import type { ChromeBodyData } from "./virtual/chromeBodyShared";
import type { VirtualTableRow } from "./virtual/virtualTableModel";

export type { FacetMap, QuerySupport, UrlStateAdapter };

/**
 * The kit-agnostic prop surface every batteries-included `<DataTable>` shares:
 * the base display props plus the three data tiers (`source` / `data` +
 * `onQueryChange`) and the URL-sync controls. Adapters extend this with
 * kit-specific extras (slots, classNames, colour, table size) and pass the
 * whole thing straight through to `useDataTableShell`.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export type DataTableShellProps<TRow> = Omit<
  ComposedTableProps<TRow>,
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
 *
 * @public
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
  const { density, onDensityChange: requestDensityChange } =
    useResolvedDensity(props);
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
  const { source, runtime } = useTableDataLean<TRow>({
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
  // History, find, grid, export and fullscreen mount in-tree through
  // {@link ShellLiveGate}. The hook only holds inert stand-ins so this
  // module never imports those implementations.
  const history = disabledHistory<TRow>();

  // Declarative `filters` array → the auto-built form; JSX passes through.
  const autoForm =
    runtime.defs.length > 0
      ? renderAutoForm(runtime.defs, source, runtime.registry)
      : undefined;
  const filtersNode =
    isDeclarativeFilters(props.filters) || props.filters === undefined
      ? autoForm
      : props.filters;
  const chromeProps = {
    ...props,
    density,
    onDensityChange: requestDensityChange,
    urlAdapter,
    onCellEdit: props.onCellEdit,
    source,
    filters: filtersNode,
    filterDefs: runtime.defs,
    filterLabels: { ...runtime.filterLabels, ...props.filterLabels },
    summaryRow: bindFeatureHostFn(featureHost, props.summaryRow),
    groupAggregates: bindFeatureHostFn(featureHost, props.groupAggregates),
  };
  rememberFeatureHost(chromeProps, featureHost);
  const chrome = useTableChrome<TRow>(chromeProps);
  const { table, confirm, getRowId } = chrome;
  const { labels } = table;
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The row count is the DATASET total and `windowStart` is where the rendered
  // slice begins, so Ctrl+End reaches the real last row and the ARIA counts stay
  // truthful under virtualization. Derived here so no adapter has to know: an
  // off-by-a-page error is invisible on screen and only wrong to a screen reader.
  const windowStart =
    chrome.source.paginationMode === "paged"
      ? Math.max(0, (chrome.source.page - 1) * chrome.source.limit)
      : 0;
  const find = DISABLED_FIND;
  const scrollBoxElement = useRef<HTMLElement | null>(null);
  const columnWindow = disabledColumnWindow(chrome.columnLayout.visibleColumns);
  const gridFocus = disabledGridFocus();
  const stats = disabledSelectionStats();
  const filtersTrigger = useFilterTriggerToggle(filtersOpen, setFiltersOpen);
  // Layout-visible columns WITHOUT device filtering: the same button must
  // produce the same file on phone and desktop. The selection, the full column
  // set and the highlighted range come along so `scope: "selected"`,
  // `columns: "all"` and `scope: "range"` work without the host wiring anything
  // up — the columns here are the same list cell navigation addresses, which is
  // what makes a range's column indices mean the same thing on both sides.
  const exportHandler = DISABLED_EXPORT;
  // The chrome owns it: progressive column hiding measures this element.
  const rootRef = chrome.rootRef;
  const fullscreen = DISABLED_FULLSCREEN;
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
  const autoSizeColumns =
    chrome.autoSizeColumns ??
    (() => {
      // Column sizing lives on the layout feature.
    });
  const autoSizeColumn =
    chrome.autoSizeColumn ??
    ((_key: string) => {
      // Column sizing lives on the layout feature.
    });
  // Name the scroll box here so tests and a mock that skips the body gate
  // still have a ref that both windows can find. The gate composes the
  // body's own scroll callback on top of this.
  const nameScrollBox = useCallback<RefCallback<HTMLElement>>((node) => {
    scrollBoxElement.current = node;
    // Desktop kits attach this to an unnamed overflow box. The mobile card
    // list already names itself `cards` — overwriting that would hide the
    // list from window-offset measurement and from every cards query.
    if (node && !node.dataset.adapttablePart) {
      node.dataset.adapttablePart = "scroll-box";
    }
  }, []);

  // The injected actions column is first-class in column management: the layout
  // state treats its reserved key like any column key, so the Columns menu can
  // hide it (strip rowActions before the renderers) or end-pin it (the
  // renderers stick the actions cells, with zero data columns pinned).
  const { hasRowActions, rowActions, hasRowReorder, rowReorder } = chrome;
  const actionsPinned =
    chrome.columnLayout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  const reorderPinned =
    chrome.columnLayout.state.pinned[REORDER_COLUMN_KEY] === "start";

  // Body-dependent fields start inert. {@link finishDataTableShell} overlays
  // the window, pins, and load-more sentinel once a body path has run in-tree.
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
    pinnedTopRows: [] as readonly TRow[],
    pinnedBottomRows: [] as readonly TRow[],
    rowPinning: chrome.rowPinning,
    getCellSpan: props.getCellSpan,
    cellSpanAppearance: props.cellSpanAppearance,
    extraRows: props.extraRows,
    windowStart,
    // Rows in the whole dataset, for the card list's `aria-setsize`. A card
    // list is a real <ul>, so a windowed one states its size the way a list
    // does — per item — rather than through the table's `aria-rowcount`.
    cardSetSize: Math.max(
      chrome.source.total,
      windowStart + chrome.source.rows.length
    ),
    confirm,
    getRowId,
    rowEntries: undefined as readonly VirtualTableRow<TRow>[] | undefined,
    paddingTop: 0,
    paddingBottom: 0,
    measureElement: undefined as
      ChromeBodyData<TRow>["virtualization"]["measureElement"] | undefined,
    measureRowPair: undefined as
      ChromeBodyData<TRow>["virtualization"]["measureRowPair"] | undefined,
    columnWindow,
    fitColumns: props.fitColumns,
    tree: chrome.tree,
    stickyHeader: props.stickyHeader,
    stickyTop: props.stickyTop,
    headerFilters:
      resolveFilterMode(props.filtersMode, props.headerFilters) === "header",
    closeHeaderFilterOnSelect: props.closeHeaderFilterOnSelect === true,
    filterDefs: runtime.defs,
    filterRegistry: runtime.registry,
    pinOffset: chrome.columnLayout.pinOffset,
    maxHeight: props.maxHeight,
    virtualScrollRef: nameScrollBox,
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
    grouping: chrome.grouping,
    dir: props.dir,
    assembly: (props as { assembly?: Partial<AssemblyFns<TRow>> }).assembly,
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
    ...viewControlsToolbar(chromeProps, fullscreen),
    hasFilters: toolbarShowsFilters(
      resolveFilterMode(props.filtersMode, props.headerFilters),
      Boolean(filtersNode),
      Boolean(table.source.setFilterTree)
    ),
    activeFilterCount: chrome.activeFilterCount,
    filters: filtersNode,
    onClearFilters: chrome.clearFilters,
    // Hidden in the grouped full-set view, where page size has no effect.
    // The body gate overlays the real sentinel; the shell starts inert.
    showRowsPerPage: false,
    onAddRow: chrome.rowMutations.canAdd
      ? chrome.rowMutations.addRow
      : undefined,
    addRowLabel: labels.addRow,
    ...exportHandler,
    dir: props.dir,
  };

  // What the table says out loud when sorting, filtering or paging rewrites the
  // body. Derived from the SETTLED source rather than from the controls, which
  // is what keeps a filter being typed from announcing once per keystroke.
  const sortedColumn = chrome.columnLayout.visibleColumns.find(
    (column) => column.key === chrome.source.sortBy
  );
  const statusAnnouncement = useTableStatusAnnouncement({
    labels,
    total: chrome.source.total,
    shown: chrome.source.rows.length,
    page: chrome.source.page,
    limit: chrome.source.limit,
    paged: chrome.source.paginationMode === "paged",
    sortBy: chrome.source.sortBy,
    sortDir: chrome.source.sortDir,
    sortColumnName:
      typeof sortedColumn?.header === "string"
        ? sortedColumn.header
        : sortedColumn?.key,
  });

  return {
    /** Cell-navigation state; inert unless `cellNavigation` is set. */
    gridFocus,
    /** What to announce when the rows change; pass to `TableStatusAnnouncer`. */
    statusAnnouncement,
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
    /**
     * Props the chrome was built with. The body gate reads these.
     */
    chromeProps,
    /**
     * When true, {@link DataTableShellView} leaves `tableProps` alone —
     * tests that inject a virtual window set this so the gate cannot
     * overwrite `rowEntries`.
     */
    skipChromeBody: false,
    /** The overflow box both windows attach to. */
    scrollBoxElement,
    table,
    labels,
    /** The density every adapter renders, controlled or feature-owned. */
    density,
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
    loadMoreRef: { current: null } as RefObject<HTMLDivElement | null>,
    canLoadMore: false,
    hasRowActions,
    hasRowReorder,
    tableProps,
    toolbarProps,
    /** The host this table owns — adapters pass it into palette / menu hooks. */
    featureHost,
  };
}

/**
 * Overlay the in-tree chrome-body result onto a shell the hook already built.
 *
 * The hook never calls TanStack (or the plain body hook). Adapters finish
 * through {@link DataTableShellView}, which mounts the right child and
 * calls this.
 *
 * @public
 */
export function finishDataTableShell<TRow>(
  shell: DataTableShellResult<TRow>,
  body: ChromeBodyData<TRow>
): DataTableShellResult<TRow> {
  const virtualScrollRef: RefCallback<HTMLElement> = (node) => {
    shell.tableProps.virtualScrollRef(node);
    body.virtualScrollRef(node);
  };
  const grouping =
    shell.chrome.grouping && body.groupingEntries
      ? { ...shell.chrome.grouping, entries: body.groupingEntries }
      : shell.chrome.grouping;
  const tree =
    shell.chrome.tree && body.treeEntries
      ? { ...shell.chrome.tree, entries: body.treeEntries }
      : shell.chrome.tree;
  return {
    ...shell,
    loadMoreRef: body.loadMoreRef,
    canLoadMore: body.canLoadMore,
    tableProps: {
      ...shell.tableProps,
      pinnedTopRows: body.pinnedTopRows,
      pinnedBottomRows: body.pinnedBottomRows,
      rowEntries: body.virtualization.enabled
        ? body.virtualization.rows
        : undefined,
      paddingTop: body.virtualization.paddingTop,
      paddingBottom: body.virtualization.paddingBottom,
      measureElement: body.virtualization.measureElement,
      measureRowPair: body.virtualization.measureRowPair,
      columnWindow: body.columnWindow ?? shell.tableProps.columnWindow,
      grouping,
      tree,
      virtualScrollRef,
    },
    toolbarProps: {
      ...shell.toolbarProps,
      showRowsPerPage: body.canLoadMore && !shell.chrome.grouping,
    },
  };
}

/**
 * What {@link useDataTableShell} returns, before or after the body gate.
 *
 * @public
 */
export type DataTableShellResult<TRow> = ReturnType<
  typeof useDataTableShell<TRow>
>;

export type { FilterRuntime } from "./filters/filterDefs";
export type { GroupAggregatesFn } from "./grouping/groupRows";
export type { Direction } from "./types";
export type { TableChrome } from "./useTableChrome";
