import {
  bindFeatureHostFn,
  type FilterDef,
  type FilterTypeRegistry,
  isDeclarativeFilters,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import {
  createTableStore,
  finishShellBody,
  resolveTableLabels,
  sortedColumnName,
} from "@adapttable/core/binding";
import {
  type ReactNode,
  type RefCallback,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useTableStatusAnnouncement } from "./a11y/useTableStatusAnnouncement";
import { useChromeScrollReset } from "./chrome/scrollReset";
import { useFilterTriggerToggle } from "./chrome/toolbarChrome";
import { flattenReactColumnTree } from "./columns/flattenColumnTree";
import { applyReactColumnNames } from "./columns/reactColumns";
import { useResolvedDensity } from "./features/densityStateKey";
import {
  featureHostOf,
  rememberFeatureHost,
  useTableFeatures,
} from "./features/featureHost";
import {
  DISABLED_FIND,
  DISABLED_FULLSCREEN,
  disabledColumnWindow,
  disabledGridFocus,
  disabledHistory,
  disabledSelectionStats,
} from "./features/shellLiveStubs";
import { featureLabelsFor } from "./features/tableFeature";
import type {
  DataTableShellChromeProps,
  DataTableShellProps,
  DataTableShellResult,
} from "./shell/shellContract";
import { shellTableProps } from "./shell/shellTableProps";
import { shellToolbarProps } from "./shell/shellToolbarProps";
import { useTableDataLean } from "./source/useTableDataLean";
import { useResolvedAdapter } from "./url/adapter";
import { useTableChrome } from "./useTableChrome";
import type { ChromeBodyData } from "./virtual/chromeBodyShared";

export {
  type DataTableShellChromeProps,
  type DataTableShellProps,
  type DataTableShellResult,
  type DataTableShellTableProps,
  type DataTableShellToolbarProps,
} from "./shell/shellContract";
export type { UrlStateAdapter } from "./url/adapter";
export type { FacetMap, QuerySupport } from "@adapttable/core";

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
    registry: FilterTypeRegistry,
    labels: Required<TableLabels>
  ) => ReactNode
): DataTableShellResult<TRow> {
  const props = useTableFeatures(incoming);
  const featureHost = featureHostOf(props);
  // One store per table: its view state, selection, column layout and
  // expansion are slices of it.
  const [tableStore] = useState(createTableStore);
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
  const persistedColumnNames =
    props.columnLayout !== undefined
      ? props.columnLayout.names
      : props.defaultColumnLayout?.names;
  const dataColumns = useMemo(
    () =>
      applyReactColumnNames(
        flattenReactColumnTree(props.columns).leaves,
        persistedColumnNames
      ),
    [props.columns, persistedColumnNames]
  );
  // Resolve the data tier (a prebuilt source, else the frontend rows) and the
  // declarative-filter runtime (defs, chip labels, URL keys, predicate).
  const { source, runtime } = useTableDataLean<TRow>({
    locale: props.locale,
    source: props.source,
    data: props.data,
    loading: props.loading,
    error: props.error,
    onViewChange: props.onViewChange,
    urlAdapter,
    // No `urlSync` here on purpose: the decision is already baked into WHICH
    // adapter was resolved above (memory when off, the real one when on), and
    // the tier hooks would otherwise apply it a second time — routing the
    // active tier to a private store that saved views cannot see.
    urlKey: props.urlKey,
    store: tableStore,
    columns: dataColumns,
    filters: props.filters,
    filterTypes: props.filterTypes,
    featureHost,
    defaults: props.defaults,
    paginationMode: props.paginationMode,
    forceMobile: props.forceMobile,
    mobileBreakpoint: props.mobileBreakpoint,
  });
  // History, find, grid, export and fullscreen mount in-tree through
  // {@link ShellLiveGate}. The hook only holds inert stand-ins so this
  // module never imports those implementations.
  const history = disabledHistory<TRow>();

  // Declarative `filters` array → the auto-built form; JSX passes through.
  const featureLabels = featureLabelsFor(props);
  const formLabels = useMemo(
    () => resolveTableLabels(props.labels, featureLabels),
    [props.labels, featureLabels]
  );
  const autoForm =
    runtime.defs.length > 0
      ? renderAutoForm(runtime.defs, source, runtime.registry, formLabels)
      : undefined;
  const filtersNode =
    isDeclarativeFilters(props.filters) || props.filters === undefined
      ? autoForm
      : props.filters;
  const chromeProps: DataTableShellChromeProps<TRow> = {
    ...props,
    density,
    onDensityChange: requestDensityChange,
    urlAdapter,
    onCellEdit: props.onCellEdit,
    source,
    filters: filtersNode,
    filterDefs: runtime.defs,
    filterRegistry: runtime.registry,
    filterLabels: { ...runtime.filterLabels, ...props.filterLabels },
    summaryRow: bindFeatureHostFn(featureHost, props.summaryRow),
    groupAggregates: bindFeatureHostFn(featureHost, props.groupAggregates),
  };
  rememberFeatureHost(chromeProps, featureHost);
  const chrome = useTableChrome<TRow>(chromeProps);
  const { table } = chrome;
  const { labels } = table;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const find = DISABLED_FIND;
  const scrollBoxElement = useRef<HTMLElement | null>(null);
  const columnWindow = disabledColumnWindow(chrome.columnLayout.visibleColumns);
  const gridFocus = disabledGridFocus();
  const stats = disabledSelectionStats();
  const filtersTrigger = useFilterTriggerToggle(filtersOpen, setFiltersOpen);
  // The chrome owns it: progressive column hiding measures this element.
  const rootRef = chrome.rootRef;
  const fullscreen = DISABLED_FULLSCREEN;
  useChromeScrollReset(rootRef, chromeProps);
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
  const autoSizeColumns = () => {
    // Column sizing lives on the layout feature.
  };
  const autoSizeColumn = (_key: string) => {
    // Column sizing lives on the layout feature.
  };
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
  const { hasRowReorder } = chrome;

  // Body-dependent fields start inert. {@link finishDataTableShell} overlays
  // the window, pins, and load-more sentinel once a body path has run in-tree.
  const tableProps = shellTableProps<TRow>(
    props,
    chromeProps,
    chrome,
    columnWindow,
    runtime,
    nameScrollBox
  );

  // The kit-agnostic slice of the toolbar's props — the adapter spreads this
  // and adds its filters-mode wiring, saved-views / column menus, and colour.
  const toolbarProps = shellToolbarProps<TRow>(props, chrome, filtersNode);

  // What the table says out loud when sorting, filtering or paging rewrites the
  // body. Derived from the SETTLED source rather than from the controls, which
  // is what keeps a filter being typed from announcing once per keystroke.
  const statusAnnouncement = useTableStatusAnnouncement({
    labels,
    total: chrome.source.total,
    shown: chrome.source.rows.length,
    page: chrome.source.page,
    limit: chrome.source.limit,
    paged: chrome.source.paginationMode === "paged",
    sortBy: chrome.source.sortBy,
    sortDir: chrome.source.sortDir,
    sortColumnName: sortedColumnName(
      chrome.columnLayout.visibleColumns,
      chrome.source.sortBy
    ),
  });

  return {
    /** The table's one store, which its feature components share. */
    tableStore,
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
    loadMoreRef: { current: null },
    canLoadMore: false,
    hasRowActions: false,
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
  return finishShellBody(shell, body, composeScrollRefs);
}

/** One scroll callback that names the box for the shell, then the body. */
function composeScrollRefs(
  first: RefCallback<HTMLElement>,
  second: RefCallback<HTMLElement>
): RefCallback<HTMLElement> {
  return (node) => {
    first(node);
    second(node);
  };
}

export type { TableChrome } from "./chrome/tableChromeContract";
export type { FilterRuntime } from "@adapttable/core";
export type { GroupAggregatesFn } from "@adapttable/core";
export type { Direction } from "@adapttable/core";
