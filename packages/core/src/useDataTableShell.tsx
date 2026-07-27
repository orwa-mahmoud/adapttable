import type { ReactNode } from "react";
import { useRef, useState } from "react";

import { ACTIONS_COLUMN_KEY } from "./columns/columnMenuModel";
import { makeExportCsvHandler } from "./export/tableCsv";
import type { FilterDef } from "./filters/filterDefs";
import type { BaseDataTableProps } from "./props";
import type { TableSource } from "./source/TableSource";
import {
  type DataModeProps,
  isDeclarativeFilters,
  useTableData,
} from "./source/useTableData";
import { type UrlStateAdapter, useResolvedAdapter } from "./url/adapter";
import {
  useChromeBodyData,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useTableChrome,
} from "./useTableChrome";

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
  /** URL-state backend (defaults to the History API). */
  urlAdapter?: UrlStateAdapter;
  /** Sync table state to the URL (default `true`). */
  urlSync?: boolean;
  /** Namespace for this table's URL params. */
  urlKey?: string;
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
  props: DataTableShellProps<TRow>,
  renderAutoForm: (
    defs: readonly FilterDef<TRow>[],
    source: TableSource<TRow>
  ) => ReactNode
) {
  // ONE resolved URL backend for everything in this table: the tier hooks
  // AND chrome that reads URL state (saved views) share this instance, so
  // with `urlSync={false}` they share the same in-memory backend instead of
  // the views hook silently falling back to the real address bar.
  const urlAdapter = useResolvedAdapter(
    props.urlSync === false ? undefined : props.urlAdapter,
    props.urlSync !== false
  );
  // Resolve the data tier (source > onQueryChange server > frontend) and the
  // declarative-filter runtime (defs, chip labels, URL keys, predicate).
  const { source, runtime } = useTableData<TRow>({
    locale: props.locale,
    source: props.source,
    data: props.data,
    total: props.total,
    loading: props.loading,
    mode: props.mode,
    onQueryChange: props.onQueryChange,
    urlAdapter,
    urlSync: props.urlSync,
    urlKey: props.urlKey,
    columns: props.columns,
    filters: props.filters,
  });
  // Declarative `filters` array → the auto-built form; JSX passes through.
  const autoForm =
    runtime.defs.length > 0 ? renderAutoForm(runtime.defs, source) : undefined;
  const filtersNode =
    isDeclarativeFilters(props.filters) || props.filters === undefined
      ? autoForm
      : props.filters;
  const chromeProps = {
    ...props,
    source,
    filters: filtersNode,
    filterLabels: { ...runtime.filterLabels, ...props.filterLabels },
  };
  const chrome = useTableChrome<TRow>(chromeProps);
  const { table, confirm, getRowId } = chrome;
  const { labels } = table;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersTrigger = useFilterTriggerToggle(filtersOpen, setFiltersOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  useChromeScrollReset(rootRef, chrome, chromeProps);
  const {
    virtualization,
    groupingEntries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef,
  } = useChromeBodyData(chrome, chromeProps);

  // The injected actions column is first-class in column management: the layout
  // state treats its reserved key like any column key, so the Columns menu can
  // hide it (strip rowActions before the renderers) or end-pin it (the
  // renderers stick the actions cells, with zero data columns pinned).
  const hasRowActions = Boolean(props.rowActions?.length);
  const rowActions = chrome.columnLayout.isHidden(ACTIONS_COLUMN_KEY)
    ? undefined
    : props.rowActions;
  const actionsPinned =
    chrome.columnLayout.state.pinned[ACTIONS_COLUMN_KEY] === "end";

  const grouping =
    chrome.grouping && groupingEntries
      ? { ...chrome.grouping, entries: groupingEntries }
      : chrome.grouping;

  // The kit-agnostic slice of a table renderer's props — the adapter spreads
  // this and adds its kit's row `size` and accent colour.
  const tableProps = {
    table,
    rows: chrome.editingRows,
    rowActions,
    actionsPinned,
    confirm,
    getRowId,
    rowEntries: virtualization.enabled ? virtualization.rows : undefined,
    paddingTop: virtualization.paddingTop,
    paddingBottom: virtualization.paddingBottom,
    measureElement: virtualization.measureElement,
    stickyHeader: props.stickyHeader,
    stickyTop: props.stickyTop,
    pinOffset: chrome.columnLayout.pinOffset,
    maxHeight: props.maxHeight,
    virtualScrollRef,
    setWidth: props.resizableColumns ? chrome.columnLayout.setWidth : undefined,
    columnWidths: chrome.columnLayout.state.widths,
    resizeLabel: table.labels.resizeColumn,
    onRowClick: props.onRowClick,
    prefetch: props.prefetch,
    rowClassName: props.rowClassName,
    renderRowDetail: props.renderRowDetail,
    summaryRow: props.summaryRow,
    expansion: chrome.detail?.expansion,
    editing: chrome.editing,
    grouping,
    dir: props.dir,
  };

  // The kit-agnostic slice of the toolbar's props — the adapter spreads this
  // and adds its filters-mode wiring, saved-views / column menus, and colour.
  const toolbarProps = {
    table,
    hideSearch: props.hideSearch,
    searchPlaceholder: props.searchPlaceholder,
    sortByOptions: props.sortByOptions,
    toolbar: props.toolbar,
    hasFilters: Boolean(filtersNode),
    activeFilterCount: chrome.activeFilterCount,
    filters: filtersNode,
    onClearFilters: chrome.clearFilters,
    // Hidden in the grouped full-set view, where page size has no effect.
    showRowsPerPage: canLoadMore && !chrome.grouping,
    // Layout-visible columns WITHOUT device filtering: the same button
    // must produce the same file on phone and desktop.
    onExportCsv: makeExportCsvHandler(
      props.exportCsv,
      chrome.source,
      chrome.columnLayout.visibleColumns
    ),
    dir: props.dir,
  };

  return {
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
    loadMoreRef,
    canLoadMore,
    hasRowActions,
    tableProps,
    toolbarProps,
  };
}
