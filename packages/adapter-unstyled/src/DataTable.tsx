import {
  ACTIONS_COLUMN_KEY,
  isDeclarativeFilters,
  makeExportCsvHandler,
  type TableSource,
  type TableVirtualization,
  useChromeBodyData,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useMountStagger,
  useResolvedAdapter,
  useTableChrome,
  useTableData,
} from "@adapttable/core";
import type { ReactElement, ReactNode, RefObject } from "react";
import { useRef, useState } from "react";

import { AutoFilterForm } from "./components/AutoFilterForm";
import {
  BulkBar,
  Chips,
  ErrorState,
  Footer,
  LoadingState,
  RowsPerPageSelect,
} from "./components/chrome";
import { ColumnMenu } from "./components/ColumnMenu";
import { FilterPanel } from "./components/FilterPanel";
import { FilterPopover } from "./components/FilterPopover";
import { FiltersIcon, SearchIcon } from "./components/icons";
import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { DesktopTable, MobileCards } from "./components/tables";
import { cx } from "./cx";
import type { DataTableClassNames, DataTableProps } from "./types";

// A stable default: the memoized desktop rows compare `classNames` by
// identity, so an inline `{}` default would defeat them on every render.
const NO_CLASSNAMES: DataTableClassNames = {};

/**
 * `DataTableProps` after tier resolution: the source is definite (whichever
 * tier provided it) and `filters` is plain JSX (the auto-built form when the
 * caller passed the declarative array).
 */
type ResolvedDataTableProps<TRow> = Omit<
  DataTableProps<TRow>,
  "source" | "filters"
> & {
  source: TableSource<TRow>;
  filters?: ReactNode;
};

interface DataTableBodyProps<TRow> {
  chrome: ReturnType<typeof useTableChrome<TRow>>;
  props: Readonly<ResolvedDataTableProps<TRow>>;
  classNames: NonNullable<DataTableProps<TRow>["classNames"]>;
  confirm: ReturnType<typeof useTableChrome<TRow>>["confirm"];
  getRowId: ReturnType<typeof useTableChrome<TRow>>["getRowId"];
  virtualization: TableVirtualization<TRow>;
  virtualScrollRef: (node: HTMLElement | null) => void;
  labels: ReturnType<typeof useTableChrome<TRow>>["table"]["labels"];
  grouping: ReturnType<typeof useTableChrome<TRow>>["grouping"];
}

function DataTableBody<TRow>({
  chrome,
  props,
  classNames,
  confirm,
  getRowId,
  virtualization,
  virtualScrollRef,
  labels,
  grouping,
}: Readonly<DataTableBodyProps<TRow>>): ReactElement {
  // The injected actions column obeys the user column layout like any data
  // column: hiding it strips `rowActions` before the renderers (desktop and
  // cards alike), and an end-pin sticks it without needing a data pin.
  const rowActions = chrome.columnLayout.isHidden(ACTIONS_COLUMN_KEY)
    ? undefined
    : props.rowActions;
  const actionsPinned =
    (rowActions?.length ?? 0) > 0 &&
    chrome.columnLayout.state.pinned[ACTIONS_COLUMN_KEY] !== undefined;
  if (chrome.body === "skeleton") {
    return (
      <>
        {props.slots?.skeleton ?? props.loadingState ?? (
          <LoadingState
            rows={props.skeletonRows ?? props.source.limit}
            columns={chrome.table.columns.length}
            variant={chrome.isMobile ? "cards" : "table"}
            labels={labels}
            classNames={classNames}
            hasActions={(rowActions?.length ?? 0) > 0}
          />
        )}
      </>
    );
  }
  if (chrome.body === "empty") {
    // "noResults" means an active search/filter matched nothing — say so and
    // offer a clear CTA; "noData" means the source itself is empty.
    const noResults = chrome.emptyVariant === "noResults";
    return (
      <>
        {props.slots?.empty ?? props.emptyState ?? (
          <output data-adapttable-part="empty" className={classNames.empty}>
            {noResults ? labels.noResults : labels.noData}
            {noResults && (
              <button
                type="button"
                data-adapttable-part="empty-clear"
                className={classNames.emptyClear}
                onClick={chrome.clearFilters}
              >
                {labels.clearAll}
              </button>
            )}
          </output>
        )}
      </>
    );
  }
  const Renderer = chrome.isMobile ? MobileCards : DesktopTable;
  return (
    <Renderer
      table={chrome.table}
      rows={chrome.editingRows}
      rowActions={rowActions}
      actionsPinned={actionsPinned}
      confirm={confirm}
      getRowId={getRowId}
      classNames={classNames}
      prefetch={props.prefetch}
      onRowClick={props.onRowClick}
      rowClassName={props.rowClassName}
      renderRowDetail={props.renderRowDetail}
      summaryRow={props.summaryRow}
      expansion={chrome.detail?.expansion}
      editing={chrome.editing}
      grouping={grouping}
      rowEntries={virtualization.enabled ? virtualization.rows : undefined}
      paddingTop={virtualization.paddingTop}
      paddingBottom={virtualization.paddingBottom}
      measureElement={virtualization.measureElement}
      stickyHeader={props.stickyHeader}
      stickyTop={props.stickyTop}
      pinOffset={chrome.columnLayout.pinOffset}
      maxHeight={props.maxHeight}
      virtualScrollRef={virtualScrollRef}
      setWidth={
        props.resizableColumns ? chrome.columnLayout.setWidth : undefined
      }
      columnWidths={chrome.columnLayout.state.widths}
      resizeLabel={labels.resizeColumn}
    />
  );
}

/**
 * Headless, unstyled AdaptTable for Tailwind / shadcn / custom CSS. Renders
 * semantic HTML with `data-adapttable-part` hooks and `className` overrides;
 * ships no styles of its own. Built on the `@adapttable/core` prop-getters.
 *
 * @typeParam TRow - The row type.
 */
export function DataTable<TRow>(props: Readonly<DataTableProps<TRow>>) {
  const {
    data,
    total,
    loading,
    onQueryChange,
    urlAdapter,
    urlKey,
    searchPlaceholder,
    sortByOptions,
    dir,
    filtersMode = "popover",
    bulkActions,
    classNames = NO_CLASSNAMES,
    toolbar,
    animate = false,
  } = props;

  const density = props.density ?? "comfortable";

  // ONE resolved URL backend for the tier hooks AND the saved-views menu,
  // so with `urlSync={false}` both share the same in-memory backend instead
  // of the menu silently reading the real address bar.
  const resolvedUrlAdapter = useResolvedAdapter(
    props.urlSync === false ? undefined : urlAdapter,
    props.urlSync !== false
  );
  // Resolve the data tier (prebuilt source > server > frontend) and the
  // declarative-filter runtime (URL keys, chip labels, predicate).
  const { source, runtime } = useTableData<TRow>({
    locale: props.locale,
    source: props.source,
    data,
    total,
    loading,
    error: props.error,
    mode: props.mode,
    onQueryChange,
    urlAdapter: resolvedUrlAdapter,
    urlSync: props.urlSync,
    urlKey,
    columns: props.columns,
    filters: props.filters,
    defaults: props.defaults,
    paginationMode: props.paginationMode,
  });

  // The declarative array becomes the auto-built form; JSX passes through.
  const autoForm =
    runtime.defs.length > 0 ? (
      <AutoFilterForm
        defs={runtime.defs}
        source={source}
        classNames={classNames}
        labels={props.labels}
      />
    ) : undefined;
  // Column-level `filter` shorthands alone must still render the auto form —
  // only explicit JSX takes over the drawing.
  const filters =
    isDeclarativeFilters(props.filters) || props.filters === undefined
      ? autoForm
      : props.filters;

  // Everything downstream sees the RESOLVED source and plain-JSX filters,
  // with the runtime's chip labels under the caller's overrides.
  const chromeProps: ResolvedDataTableProps<TRow> = {
    ...props,
    source,
    filters,
    filterLabels: { ...runtime.filterLabels, ...props.filterLabels },
  };

  const chrome = useTableChrome<TRow>(chromeProps);
  const { table, confirm, getRowId } = chrome;
  // Everything rendered below reads the chrome's VIEW facade — identical to
  // `source` except under grouping, where it presents the full rendered set.
  const viewSource = chrome.source;
  const { labels } = table;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersTrigger = useFilterTriggerToggle(filtersOpen, setFiltersOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  useChromeScrollReset(rootRef, chrome, chromeProps);
  useMountStagger(rootRef, [viewSource.rows.length, chrome.isMobile], {
    enabled: animate,
  });
  const bodyData = useChromeBodyData(chrome, chromeProps);
  const { virtualization, groupingEntries, canLoadMore } = bodyData;
  const grouping =
    chrome.grouping && groupingEntries
      ? { ...chrome.grouping, entries: groupingEntries }
      : chrome.grouping;
  // React 18's `ref` attribute rejects core's `RefObject<HTMLDivElement |
  // null>` through interface variance; the same object viewed through its
  // structural shape attaches fine.
  const loadMoreRef: RefObject<HTMLDivElement | null> = bodyData.loadMoreRef;
  const searchProps = table.getSearchInputProps(
    searchPlaceholder ? { placeholder: searchPlaceholder } : undefined
  );
  // Explicit options win; otherwise auto-derive on mobile, where the card
  // layout has no clickable headers to sort by.
  const sortOptions =
    sortByOptions ?? (chrome.isMobile ? table.sortByOptions : undefined);

  const filtersButton = (
    <button
      type="button"
      aria-expanded={filtersMode === "popover" ? filtersOpen : undefined}
      data-active={filtersOpen || undefined}
      data-adapttable-part="filters-button"
      className={classNames.filtersButton}
      style={{ flexShrink: 0, whiteSpace: "nowrap" }}
      onPointerDown={filtersTrigger.onPointerDown}
      onClick={filtersTrigger.onClick}
    >
      <span
        data-adapttable-part="filters-icon"
        className={classNames.filtersIcon}
        style={{ display: "inline-flex" }}
      >
        <FiltersIcon />
      </span>
      {labels.filters}
      {chrome.activeFilterCount > 0 && (
        <span
          data-adapttable-part="filters-count"
          className={classNames.filtersCount}
        >
          {chrome.activeFilterCount}
        </span>
      )}
    </button>
  );

  // Layout-visible columns WITHOUT device filtering: the same button must
  // produce the same file on phone and desktop.
  const onExportCsv = makeExportCsvHandler(
    props.exportCsv,
    viewSource,
    chrome.columnLayout.visibleColumns
  );

  return (
    <div
      ref={rootRef}
      dir={dir}
      data-adapttable-part="root"
      data-mobile={chrome.isMobile || undefined}
      data-density={density}
      data-refreshing={chrome.isRefreshing || undefined}
      // The root wraps the whole table region, so a background refresh marks
      // it busy for assistive tech (the indicator below is decorative-ish).
      aria-busy={chrome.isRefreshing || undefined}
      className={cx("adapttable", classNames.root)}
    >
      <div
        data-adapttable-part="toolbar"
        className={classNames.toolbar}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          rowGap: 8,
        }}
      >
        {props.searchable !== false && (
          <span
            data-adapttable-part="search-field"
            className={classNames.searchField}
            style={{
              flex: 1,
              minWidth: 0,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <span
              data-adapttable-part="search-icon"
              className={classNames.searchIcon}
              style={{ display: "inline-flex" }}
            >
              <SearchIcon size={14} />
            </span>
            <input
              {...searchProps}
              data-adapttable-part="search"
              className={classNames.search}
              style={{ flex: 1, minWidth: 0 }}
            />
          </span>
        )}
        {sortOptions && sortOptions.length > 0 && (
          <label>
            {labels.sortBy}{" "}
            <select
              aria-label={labels.sortBy}
              data-adapttable-part="sort-select"
              className={classNames.sortSelect}
              value={source.sortBy ?? ""}
              onChange={(e) =>
                source.setSort(
                  e.currentTarget.value || undefined,
                  source.sortDir ?? "asc"
                )
              }
            >
              <option value="">—</option>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {toolbar}
        {filters &&
          (filtersMode === "popover" ? (
            <FilterPopover
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              filters={filters}
              activeFilterCount={chrome.activeFilterCount}
              onClearFilters={chrome.clearFilters}
              labels={labels}
              dir={dir}
              classNames={classNames}
            >
              {filtersButton}
            </FilterPopover>
          ) : (
            filtersButton
          ))}
        {props.enableColumnMenu && !chrome.isMobile && (
          <ColumnMenu
            allColumns={chrome.allColumns}
            layout={chrome.columnLayout}
            labels={labels}
            classNames={classNames}
            hasRowActions={(props.rowActions?.length ?? 0) > 0}
          />
        )}
        {onExportCsv && (
          <button
            type="button"
            data-adapttable-part="export-csv-button"
            className={classNames.exportCsvButton}
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            onClick={onExportCsv}
          >
            {labels.exportCsv}
          </button>
        )}
        {props.savedViews && (
          // The menu must capture/apply through the SAME URL backend and
          // namespace the table reads, so those default from the table's
          // own props (explicit option values still win).
          <SavedViewsMenu
            options={{
              urlAdapter: resolvedUrlAdapter,
              urlKey,
              ...props.savedViews,
            }}
            labels={labels}
            classNames={classNames}
          />
        )}
        {canLoadMore && !chrome.grouping && (
          <RowsPerPageSelect
            source={viewSource}
            labels={labels}
            classNames={classNames}
          />
        )}
      </div>

      {filters && filtersMode === "drawer" && (
        <FilterPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          activeFilterCount={chrome.activeFilterCount}
          onClearFilters={chrome.clearFilters}
          labels={labels}
          dir={dir}
          classNames={classNames}
        />
      )}

      <Chips
        chips={chrome.mergedChips}
        onClearAll={chrome.clearFilters}
        labels={labels}
        classNames={classNames}
      />

      {table.selection && bulkActions && (
        <BulkBar
          selection={table.selection}
          total={viewSource.total}
          bulkActions={bulkActions}
          confirm={confirm}
          labels={labels}
          classNames={classNames}
        />
      )}

      {chrome.isRefreshing && (
        // Native indeterminate progress (no `value`) — implicit progressbar
        // role with correct semantics on every device.
        <progress
          aria-label={labels.loading}
          data-adapttable-part="refresh-indicator"
          className={classNames.refreshIndicator}
        />
      )}

      {viewSource.error ? (
        <ErrorState
          error={viewSource.error}
          labels={labels}
          onRetry={
            viewSource.refetch ? () => void viewSource.refetch?.() : undefined
          }
          classNames={classNames}
        />
      ) : (
        <DataTableBody
          chrome={chrome}
          props={chromeProps}
          classNames={classNames}
          confirm={confirm}
          getRowId={getRowId}
          virtualization={virtualization}
          virtualScrollRef={bodyData.virtualScrollRef}
          labels={labels}
          grouping={grouping}
        />
      )}

      {canLoadMore && viewSource.hasNextPage && (
        <div
          ref={loadMoreRef}
          data-adapttable-part="load-more"
          className={classNames.loadMore}
        >
          <button
            type="button"
            disabled={viewSource.isFetchingNextPage}
            data-adapttable-part="load-more-button"
            className={classNames.loadMoreButton}
            onClick={() => viewSource.fetchNextPage()}
          >
            {labels.loadMore}
          </button>
        </div>
      )}

      {chrome.showFooter && (
        <Footer
          pagination={table.pagination}
          source={viewSource}
          labels={labels}
          classNames={classNames}
          showRowsPerPage={!chrome.grouping}
        />
      )}
    </div>
  );
}
