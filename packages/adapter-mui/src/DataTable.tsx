import type {
  GroupCollapseState,
  GroupedFlatEntry,
  RowAction,
  UseColumnLayoutResult,
} from "@adapttable/core";
import {
  ACTIONS_COLUMN_KEY,
  isDeclarativeFilters,
  makeExportCsvHandler,
  resolveLabels,
  useChromeBodyData,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useMountStagger,
  useResolvedAdapter,
  useTableChrome,
  useTableData,
} from "@adapttable/core";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

import { AutoFilterForm } from "./components/AutoFilterForm";
import {
  BulkBar,
  Chips,
  ErrorState,
  FilterDrawer,
  Footer,
  LoadingState,
  Toolbar,
} from "./components/chrome";
import { ColumnMenu } from "./components/ColumnMenu";
import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { DesktopTable, MobileCards } from "./components/tables";
import type { DataTableProps } from "./types";

/** Chrome grouping bundle shape (matches SharedTableRenderProps.grouping). */
interface GroupingBundle<TRow> {
  groupBy: string;
  collapsed: GroupCollapseState;
  entries: readonly GroupedFlatEntry<TRow>[];
  setGroupBy: (key: string | null) => void;
}

/**
 * Prefer the (possibly virtual-windowed) flat entries from chrome body data
 * when grouping is armed; otherwise leave the bundle untouched / dormant.
 */
function withWindowedGroupingEntries<TRow>(
  grouping: GroupingBundle<TRow> | undefined,
  groupingEntries: readonly GroupedFlatEntry<TRow>[] | undefined
): GroupingBundle<TRow> | undefined {
  if (!(grouping && groupingEntries)) return grouping;
  return { ...grouping, entries: groupingEntries };
}

/**
 * Map row density to MUI's table `size`, independent of column pinning. An
 * explicit `size` prop still wins for backward compatibility.
 */
function tableSize(
  size: "small" | "medium" | undefined,
  density: "comfortable" | "compact" | undefined
): "small" | "medium" {
  if (size) return size;
  return density === "compact" ? "small" : "medium";
}

/** The width setter only when column resize is enabled (opt-in). */
function resizeSetter(
  enabled: boolean | undefined,
  setWidth: (key: string, width: number) => void
): ((key: string, width: number) => void) | undefined {
  return enabled ? setWidth : undefined;
}

/**
 * The injected actions column is first-class in column management: the
 * layout state treats keys opaquely, so the reserved "actions" key hides and
 * end-pins like any data column. Hiding strips `rowActions` BEFORE the
 * renderers, so the column, its pin lead, and the colSpans all disappear
 * consistently (desktop and mobile alike). `actionsPinned` reports the
 * Columns-menu end pin — only meaningful while the column renders.
 */
function resolveActionsColumn<TRow>(
  declared: RowAction<TRow>[] | undefined,
  layout: UseColumnLayoutResult<TRow>
): {
  hasRowActions: boolean;
  rowActions: RowAction<TRow>[] | undefined;
  actionsPinned: boolean;
} {
  const hasRowActions = (declared?.length ?? 0) > 0;
  const rowActions =
    hasRowActions && !layout.isHidden(ACTIONS_COLUMN_KEY)
      ? declared
      : undefined;
  const actionsPinned =
    rowActions !== undefined &&
    layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  return { hasRowActions, rowActions, actionsPinned };
}

/**
 * Resolve the data tier (`source` > `data` + `onQueryChange` > `data`) and
 * the filter content, then overlay them on the caller's props: caller JSX
 * filters pass through; the declarative array becomes the auto-built
 * {@link AutoFilterForm} (or nothing, when no definitions resolved); the
 * runtime's chip-label resolvers merge under any caller overrides.
 */
function useChromeProps<TRow>(props: Readonly<DataTableProps<TRow>>) {
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
    adapter: urlAdapter,
    enabled: props.urlSync,
    urlKey: props.urlKey,
  });
  let filtersNode: ReactNode;
  // Column-level `filter` shorthands alone must still render the auto form —
  // only explicit JSX takes over the drawing.
  if (isDeclarativeFilters(props.filters) || props.filters === undefined) {
    filtersNode =
      runtime.defs.length > 0 ? (
        <AutoFilterForm
          defs={runtime.defs}
          source={source}
          labels={resolveLabels(props.labels)}
        />
      ) : undefined;
  } else {
    filtersNode = props.filters;
  }
  // `urlAdapter` is the RESOLVED backend from here on — downstream chrome
  // (the saved-views menu) must share the table's own instance.
  return {
    ...props,
    urlAdapter,
    source,
    filters: filtersNode,
    filterLabels: { ...runtime.filterLabels, ...props.filterLabels },
  };
}

/**
 * Batteries-included Material UI data table. Drop in `columns`, `data` (or
 * `data` + `onQueryChange` for server fetching, or a full `source`), and a
 * `rowKey` for a fully styled, sortable, filterable, paginated MUI table
 * with selection, bulk actions, RTL, and dark mode — a free DataGrid-style
 * experience on the headless `@adapttable/core` engine. Declarative
 * `filters` (and column `filter` shorthands) render an auto-built form.
 *
 * @typeParam TRow - The row type.
 */
export function DataTable<TRow>(props: Readonly<DataTableProps<TRow>>) {
  const { slots, className, animate = false } = props;
  const size = tableSize(props.size, props.density);
  const { filtersMode = "popover" } = props;
  const chromeProps = useChromeProps(props);
  const { filters: filtersNode } = chromeProps;
  const c = useTableChrome<TRow>(chromeProps);
  // Everything rendered below reads the chrome's VIEW facade — identical to
  // `source` except under grouping, where it presents the full rendered set.
  const viewSource = c.source;
  const { table, confirm, getRowId } = c;
  const { labels } = table;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersTrigger = useFilterTriggerToggle(filtersOpen, setFiltersOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  useChromeScrollReset(rootRef, c, chromeProps);
  const {
    virtualization,
    groupingEntries,
    loadMoreRef,
    canLoadMore,
    virtualScrollRef,
  } = useChromeBodyData(c, chromeProps);
  const grouping = withWindowedGroupingEntries(c.grouping, groupingEntries);
  useMountStagger(rootRef, [viewSource.rows.length, c.isMobile], {
    enabled: animate,
  });
  const { hasRowActions, rowActions, actionsPinned } = resolveActionsColumn(
    props.rowActions,
    c.columnLayout
  );
  const columnMenu = props.enableColumnMenu && !c.isMobile && (
    <ColumnMenu
      allColumns={c.allColumns}
      layout={c.columnLayout}
      labels={labels}
      hasRowActions={hasRowActions}
      dir={props.dir}
    />
  );
  // Saved views capture the table's own URL params, so the menu defaults to
  // the table's URL backend + namespace (an explicit option still wins).
  const savedViewsMenu = props.savedViews && (
    <SavedViewsMenu
      options={{
        adapter: chromeProps.urlAdapter,
        urlKey: props.urlKey,
        ...props.savedViews,
      }}
      labels={labels}
    />
  );

  let body: React.ReactNode;
  if (c.body === "skeleton") {
    body = slots?.skeleton ?? (
      <LoadingState
        rows={props.skeletonRows ?? viewSource.limit}
        columns={table.columns.length}
        loadingLabel={labels.loading}
      />
    );
  } else if (c.body === "empty") {
    body = slots?.empty ?? (
      <Stack role="status" spacing={1.5} sx={{ py: 6, alignItems: "center" }}>
        <Typography color="text.secondary" align="center">
          {c.emptyVariant === "noResults" ? labels.noResults : labels.noData}
        </Typography>
        {c.emptyVariant === "noResults" && (
          <Button variant="outlined" size="small" onClick={c.clearFilters}>
            {labels.clearAll}
          </Button>
        )}
      </Stack>
    );
  } else if (c.body === "mobile") {
    body = (
      <MobileCards
        table={table}
        rows={c.editingRows}
        rowActions={rowActions}
        confirm={confirm}
        getRowId={getRowId}
        size={size}
        dir={props.dir}
        onRowClick={props.onRowClick}
        rowClassName={props.rowClassName}
        renderRowDetail={props.renderRowDetail}
        summaryRow={props.summaryRow}
        expansion={c.detail?.expansion}
        editing={c.editing}
        grouping={grouping}
        rowEntries={virtualization.enabled ? virtualization.rows : undefined}
        paddingTop={virtualization.paddingTop}
        paddingBottom={virtualization.paddingBottom}
        measureElement={virtualization.measureElement}
      />
    );
  } else {
    body = (
      <DesktopTable
        table={table}
        rows={c.editingRows}
        rowActions={rowActions}
        actionsPinned={actionsPinned}
        confirm={confirm}
        getRowId={getRowId}
        size={size}
        dir={props.dir}
        prefetch={props.prefetch}
        onRowClick={props.onRowClick}
        rowClassName={props.rowClassName}
        renderRowDetail={props.renderRowDetail}
        summaryRow={props.summaryRow}
        expansion={c.detail?.expansion}
        editing={c.editing}
        grouping={grouping}
        rowEntries={virtualization.enabled ? virtualization.rows : undefined}
        paddingTop={virtualization.paddingTop}
        paddingBottom={virtualization.paddingBottom}
        measureElement={virtualization.measureElement}
        stickyHeader={props.stickyHeader}
        stickyTop={props.stickyTop}
        pinOffset={c.columnLayout.pinOffset}
        maxHeight={props.maxHeight}
        virtualScrollRef={virtualScrollRef}
        setWidth={resizeSetter(props.resizableColumns, c.columnLayout.setWidth)}
        columnWidths={c.columnLayout.state.widths}
        resizeLabel={labels.resizeColumn}
      />
    );
  }

  return (
    <Paper
      ref={rootRef}
      variant="outlined"
      dir={props.dir}
      className={className}
      aria-busy={c.isRefreshing || undefined}
      sx={{ p: 1.5 }}
    >
      <Stack spacing={1.5}>
        <Toolbar
          table={table}
          hideSearch={props.hideSearch}
          searchPlaceholder={props.searchPlaceholder}
          sortByOptions={props.sortByOptions}
          customToolbar={
            <>
              {savedViewsMenu}
              {props.toolbar}
            </>
          }
          hasFilters={Boolean(filtersNode)}
          activeFilterCount={c.activeFilterCount}
          showRowsPerPage={canLoadMore}
          filtersMode={filtersMode}
          filters={filtersNode}
          filtersOpen={filtersOpen}
          onToggleFilters={filtersTrigger.onClick}
          onFiltersTriggerPointerDown={filtersTrigger.onPointerDown}
          onCloseFilters={() => setFiltersOpen(false)}
          onClearFilters={c.clearFilters}
          dir={props.dir}
          columnMenu={columnMenu}
          onExportCsv={makeExportCsvHandler(
            props.exportCsv,
            viewSource,
            c.columnLayout.visibleColumns
          )}
        />
        {c.isRefreshing && <LinearProgress aria-label={labels.loading} />}
        <Chips
          chips={c.mergedChips}
          onClearAll={c.clearFilters}
          labels={labels}
        />
        {table.selection && props.bulkActions && (
          <BulkBar
            selection={table.selection}
            total={viewSource.total}
            bulkActions={props.bulkActions}
            confirm={confirm}
            labels={labels}
          />
        )}
        {viewSource.error ? (
          <ErrorState
            error={viewSource.error}
            labels={labels}
            onRetry={
              viewSource.refetch ? () => void viewSource.refetch?.() : undefined
            }
          />
        ) : (
          body
        )}
        {canLoadMore && viewSource.hasNextPage && (
          <Box
            ref={loadMoreRef}
            sx={{ display: "flex", justifyContent: "center", py: 1 }}
          >
            <Button
              variant="outlined"
              size="small"
              disabled={viewSource.isFetchingNextPage}
              onClick={() => viewSource.fetchNextPage()}
            >
              {labels.loadMore}
            </Button>
          </Box>
        )}
        {c.showFooter && (
          <Footer
            pagination={table.pagination}
            total={viewSource.total}
            limit={viewSource.limit}
            setPage={viewSource.setPage}
            setLimit={viewSource.setLimit}
            labels={labels}
            showRowsPerPage={!c.grouping}
          />
        )}
      </Stack>
      {filtersNode && filtersMode === "drawer" && (
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filtersNode}
          activeFilterCount={c.activeFilterCount}
          onClearFilters={c.clearFilters}
          labels={labels}
          dir={props.dir}
        />
      )}
    </Paper>
  );
}
