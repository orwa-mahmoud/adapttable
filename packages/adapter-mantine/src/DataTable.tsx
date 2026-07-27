import {
  ACTIONS_COLUMN_KEY,
  type GroupCollapseState,
  type GroupedFlatEntry,
  isDeclarativeFilters,
  makeExportCsvHandler,
  resolveLabels,
  type TableLabels,
  useChromeBodyData,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useResolvedAdapter,
  useSavedViews,
  type UseSavedViewsOptions,
  useTableChrome,
  useTableData,
} from "@adapttable/core";
import { Box, Button, Group, Paper, Progress, Stack } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { type ReactNode, useMemo, useRef, useState } from "react";

import { useMountStagger } from "./animation/useMountStagger";
import { ActiveFilterChips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { BulkActionBar } from "./components/BulkActionBar";
import { ColumnMenu, type ColumnMenuProps } from "./components/ColumnMenu";
import { DesktopTable } from "./components/DesktopTable";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { FilterDrawer } from "./components/FilterDrawer";
import { MobileCards } from "./components/MobileCards";
import { PaginationFooter } from "./components/PaginationFooter";
import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { TableSkeleton } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import type { DataTableProps } from "./types";

/** Chrome grouping bundle shape (matches `useTableChrome` / SharedTableRenderProps). */
interface GroupingBundle<TRow> {
  groupBy: string;
  collapsed: GroupCollapseState;
  entries: readonly GroupedFlatEntry<TRow>[];
  setGroupBy: (key: string | null) => void;
}

/**
 * Prefer chrome body data's (possibly virtual-windowed) flat entries when
 * grouping is armed; otherwise leave the bundle untouched / dormant.
 */
function withWindowedGroupingEntries<TRow>(
  grouping: GroupingBundle<TRow> | undefined,
  groupingEntries: readonly GroupedFlatEntry<TRow>[] | undefined
): GroupingBundle<TRow> | undefined {
  if (!(grouping && groupingEntries)) return grouping;
  return { ...grouping, entries: groupingEntries };
}

const stickyToolbarStyle = (top: number) => ({
  position: "sticky" as const,
  top,
  zIndex: 3,
  background: "var(--mantine-color-body)",
  paddingBottom: "var(--mantine-spacing-xs)",
});

/** The Columns menu, rendered inline in the toolbar — or nothing when off. */
function ColumnMenuSlot<TRow>({
  enabled,
  ...props
}: Readonly<{ enabled: boolean } & ColumnMenuProps<TRow>>) {
  if (!enabled) return null;
  return <ColumnMenu {...props} />;
}

/**
 * The Saved-views menu in the toolbar. A component (not inline JSX) so
 * `useSavedViews` only runs when the `savedViews` prop is set.
 */
function SavedViewsSlot({
  options,
  labels,
}: Readonly<{ options: UseSavedViewsOptions; labels: Required<TableLabels> }>) {
  const views = useSavedViews(options);
  return <SavedViewsMenu views={views} labels={labels} />;
}

/**
 * Resolve the data tier (source ▸ server ▸ frontend) and the declarative
 * filter runtime into the full chrome prop set: the RESOLVED source, the
 * filters node (auto-built form for the declarative array, JSX as-is) and
 * the chip-label resolvers (derived under the caller's — the user wins
 * per key). Everything downstream consumes these.
 */
function useResolvedTableProps<TRow>(props: Readonly<DataTableProps<TRow>>) {
  // ONE resolved URL backend for the tier hooks AND the saved-views menu,
  // so with `urlSync={false}` both share the same in-memory backend instead
  // of the menu silently reading the real address bar.
  const urlAdapter = useResolvedAdapter(
    props.urlSync === false ? undefined : props.urlAdapter,
    props.urlSync !== false
  );
  const { source, runtime } = useTableData<TRow>({
    locale: props.locale,
    source: props.source,
    data: props.data,
    total: props.total,
    loading: props.loading,
    mode: props.mode,
    onQueryChange: props.onQueryChange,
    columns: props.columns,
    filters: props.filters,
    defaults: props.defaults,
    paginationMode: props.paginationMode,
    urlKey: props.urlKey,
    urlAdapter,
    urlSync: props.urlSync,
  });

  // The same resolution `useTableChrome` applies — the auto form needs the
  // operator/value strings before the chrome exists.
  const labels = useMemo(() => resolveLabels(props.labels), [props.labels]);

  let filters: ReactNode;
  // Column-level `filter` shorthands alone must still render the auto form —
  // only explicit JSX takes over the drawing.
  if (isDeclarativeFilters(props.filters) || props.filters === undefined) {
    filters =
      runtime.defs.length > 0 ? (
        <AutoFilterForm defs={runtime.defs} source={source} labels={labels} />
      ) : undefined;
  } else {
    filters = props.filters;
  }

  const filterLabels = useMemo(
    () => ({ ...runtime.filterLabels, ...props.filterLabels }),
    [runtime.filterLabels, props.filterLabels]
  );

  // `urlAdapter` is the RESOLVED backend from here on — downstream chrome
  // (the saved-views menu) must share the table's own instance.
  return { ...props, urlAdapter, source, filters, filterLabels };
}

/**
 * Batteries-included Mantine data table. Drop in `columns`, a `rowKey`,
 * and a data tier — raw `data` (frontend), `data` + `onQueryChange`
 * (server), or a prebuilt `source` — to get a fully styled, sortable,
 * filterable, paginated table with selection, bulk actions, RTL, dark
 * mode, and optional entrance animation.
 *
 * @typeParam TRow - The row type.
 */
export function DataTable<TRow>(props: Readonly<DataTableProps<TRow>>) {
  const chromeProps = useResolvedTableProps(props);
  const {
    rowActions,
    searchPlaceholder,
    sortByOptions,
    dir,
    prefetch,
    hideSearch,
    filters,
    filtersMode = "popover",
    bulkActions,
    slots,
    classNames,
    toolbar: customToolbar,
    skeletonRows,
    stickyTop = 0,
    animate = false,
    stickyHeader = false,
    enableColumnMenu = false,
    savedViews,
    exportCsv,
  } = chromeProps;
  const density = chromeProps.density ?? "comfortable";

  const chrome = useTableChrome<TRow>(chromeProps);
  // Everything rendered below reads the chrome's VIEW facade — identical to
  // `source` except under grouping, where it presents the full rendered set.
  const viewSource = chrome.source;
  const { table, isMobile, confirm, getRowId } = chrome;
  // The injected actions column is first-class in the column layout: the
  // menu lists it under `labels.actions`, hiding it strips the row actions
  // HERE — before any renderer sees them — so the column, its pin lead and
  // the spacer/detail spans all disappear together, and pinning it sticks
  // the column to the inline end without involving any data column.
  const hasRowActions = (rowActions?.length ?? 0) > 0;
  const visibleRowActions = chrome.columnLayout.isHidden(ACTIONS_COLUMN_KEY)
    ? undefined
    : rowActions;
  const actionsPinned =
    chrome.columnLayout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  const {
    virtualization,
    groupingEntries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef,
  } = useChromeBodyData(chrome, chromeProps);
  const grouping = withWindowedGroupingEntries(
    chrome.grouping,
    groupingEntries
  );
  const [drawerOpened, setDrawerOpened] = useState(false);
  const filtersTrigger = useFilterTriggerToggle(drawerOpened, setDrawerOpened);
  const rootRef = useRef<HTMLDivElement>(null);
  const { ref: toolbarRef, height: toolbarHeight } = useElementSize();

  const desktopBodyRef = useRef<HTMLTableSectionElement>(null);
  const mobileBodyRef = useRef<HTMLDivElement>(null);
  useChromeScrollReset(rootRef, chrome, chromeProps);

  useMountStagger(
    isMobile ? mobileBodyRef : desktopBodyRef,
    [virtualization.rows.length, isMobile],
    { enabled: animate }
  );

  let body: React.ReactNode;
  if (chrome.body === "skeleton") {
    body = slots?.skeleton ?? (
      <TableSkeleton
        columns={table.columns.length || 1}
        rows={skeletonRows ?? viewSource.limit}
        loadingLabel={table.labels.loading}
      />
    );
  } else if (chrome.body === "empty") {
    // "noResults" means an active search/filter matched nothing — say so and
    // offer a working clear, instead of the misleading "no data".
    body =
      slots?.empty ??
      (chrome.emptyVariant === "noResults" ? (
        <EmptyState
          title={table.labels.noResults}
          action={
            <Button variant="light" size="sm" onClick={chrome.clearFilters}>
              {table.labels.clearAll}
            </Button>
          }
        />
      ) : (
        <EmptyState title={table.labels.noData} />
      ));
  } else if (chrome.body === "mobile") {
    body = (
      <MobileCards
        table={table}
        rows={chrome.editingRows}
        rowActions={visibleRowActions}
        confirm={confirm}
        getRowId={getRowId}
        onRowClick={props.onRowClick}
        rowClassName={props.rowClassName}
        renderRowDetail={props.renderRowDetail}
        summaryRow={props.summaryRow}
        expansion={chrome.detail?.expansion}
        editing={chrome.editing}
        grouping={grouping}
        bodyRef={mobileBodyRef}
        className={classNames?.card}
        rowEntries={virtualization.enabled ? virtualization.rows : undefined}
        paddingTop={virtualization.paddingTop}
        paddingBottom={virtualization.paddingBottom}
        measureElement={virtualization.measureElement}
        density={density}
      />
    );
  } else {
    body = (
      <DesktopTable
        table={table}
        rows={chrome.editingRows}
        rowActions={visibleRowActions}
        confirm={confirm}
        prefetch={prefetch}
        onRowClick={props.onRowClick}
        rowClassName={props.rowClassName}
        renderRowDetail={props.renderRowDetail}
        summaryRow={props.summaryRow}
        expansion={chrome.detail?.expansion}
        editing={chrome.editing}
        grouping={grouping}
        getRowId={getRowId}
        bodyRef={desktopBodyRef}
        className={classNames?.table}
        rowEntries={virtualization.enabled ? virtualization.rows : undefined}
        paddingTop={virtualization.paddingTop}
        paddingBottom={virtualization.paddingBottom}
        measureElement={virtualization.measureElement}
        stickyHeaderOffset={stickyTop + toolbarHeight}
        stickyHeader={stickyHeader}
        pinOffset={chrome.columnLayout.pinOffset}
        actionsPinned={actionsPinned}
        maxHeight={props.maxHeight}
        virtualScrollRef={virtualScrollRef}
        setWidth={
          props.resizableColumns ? chrome.columnLayout.setWidth : undefined
        }
        columnWidths={chrome.columnLayout.state.widths}
        resizeLabel={table.labels.resizeColumn}
        density={density}
      />
    );
  }

  return (
    <Paper
      ref={rootRef}
      p="xs"
      radius="md"
      withBorder
      dir={dir}
      aria-busy={chrome.isRefreshing || undefined}
      className={classNames?.root}
    >
      <Stack gap="xs">
        <Box
          ref={toolbarRef}
          style={stickyToolbarStyle(stickyTop)}
          className={classNames?.toolbar}
        >
          <Stack gap="xs">
            <Toolbar
              table={table}
              searchable={chromeProps.searchable ?? hideSearch !== true}
              searchPlaceholder={searchPlaceholder}
              sortByOptions={sortByOptions}
              toolbar={customToolbar}
              hasFilters={Boolean(filters)}
              activeFilterCount={chrome.activeFilterCount}
              filtersMode={filtersMode}
              filters={filters}
              filtersOpen={drawerOpened}
              onToggleFilters={filtersTrigger.onClick}
              onFiltersTriggerPointerDown={filtersTrigger.onPointerDown}
              onCloseFilters={() => setDrawerOpened(false)}
              onClearFilters={chrome.clearFilters}
              dir={dir}
              columnMenu={
                <>
                  {savedViews && (
                    <SavedViewsSlot
                      // The table's own URL backend/namespace are the
                      // defaults — an explicit option still wins.
                      options={{
                        urlAdapter: chromeProps.urlAdapter,
                        urlKey: chromeProps.urlKey,
                        ...savedViews,
                      }}
                      labels={table.labels}
                    />
                  )}
                  <ColumnMenuSlot
                    enabled={enableColumnMenu && !isMobile}
                    allColumns={chrome.allColumns}
                    layout={chrome.columnLayout}
                    labels={table.labels}
                    hasRowActions={hasRowActions}
                    dir={dir}
                  />
                </>
              }
              onExportCsv={makeExportCsvHandler(
                exportCsv,
                viewSource,
                chrome.columnLayout.visibleColumns
              )}
              showRowsPerPage={canLoadMore && !chrome.grouping}
            />
            <ActiveFilterChips
              chips={chrome.mergedChips}
              onClearAll={chrome.clearFilters}
              label={table.labels.filters}
              clearAllLabel={table.labels.clearAll}
            />
            {table.selection && bulkActions && (
              <BulkActionBar
                selection={table.selection}
                total={viewSource.total}
                bulkActions={bulkActions}
                confirm={confirm}
                labels={table.labels}
              />
            )}
          </Stack>
        </Box>

        {chrome.isRefreshing && (
          <Progress
            size="xs"
            animated
            value={100}
            aria-label={table.labels.loading}
          />
        )}

        {viewSource.error && (
          <ErrorState
            error={viewSource.error}
            title={table.labels.errorTitle}
            message={table.labels.errorMessage}
            retryLabel={table.labels.retry}
            onRetry={
              viewSource.refetch ? () => void viewSource.refetch?.() : undefined
            }
            isRetrying={viewSource.isFetching}
          />
        )}

        {!viewSource.error && body}

        {canLoadMore && viewSource.hasNextPage && (
          <Group ref={loadMoreRef} justify="center" py="xs">
            <Button
              variant="default"
              size="sm"
              loading={viewSource.isFetchingNextPage}
              onClick={() => viewSource.fetchNextPage()}
            >
              {table.labels.loadMore}
            </Button>
          </Group>
        )}

        {chrome.showFooter && (
          <Box className={classNames?.footer}>
            <PaginationFooter
              page={table.pagination.safePage}
              totalPages={table.pagination.totalPages}
              limit={viewSource.limit}
              total={viewSource.total}
              fromIndex={table.pagination.fromIndex}
              toIndex={table.pagination.toIndex}
              onPageChange={viewSource.setPage}
              onLimitChange={viewSource.setLimit}
              labels={table.labels}
              showRowsPerPage={!chrome.grouping}
            />
          </Box>
        )}
      </Stack>

      {filters && filtersMode === "drawer" && (
        <FilterDrawer
          opened={drawerOpened}
          onClose={() => setDrawerOpened(false)}
          filters={filters}
          activeFilterCount={chrome.activeFilterCount}
          onClearFilters={chrome.clearFilters}
          labels={table.labels}
          dir={dir}
        />
      )}
    </Paper>
  );
}
