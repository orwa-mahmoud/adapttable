import {
  type TableBodyRegion,
  useDataTableShell,
  useMountStagger,
} from "@adapttable/core/adapter";
import type { ReactNode } from "react";

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
import { ensureBaseUiStyles } from "./injectStyles";
import { subtleText } from "./styles";
import type { DataTableProps } from "./types";
import { Box, Button, Flex, Progress, Text } from "./ui";

/**
 * Batteries-included Base UI data table. Drop in `columns`, a `rowKey`,
 * and either raw `data` (frontend tier — add `onQueryChange` for the server
 * tier) or a prebuilt `source`, for a fully styled, sortable, filterable,
 * paginated Base UI table with selection, bulk actions, RTL, and dark mode — on
 * the headless `@adapttable/core` engine. The shared orchestration lives in
 * core's `useDataTableShell`; this renders only Base UI controls over it.
 *
 * @typeParam TRow - The row type.
 */
export function DataTable<TRow>(props: Readonly<DataTableProps<TRow>>) {
  ensureBaseUiStyles();
  const { slots, accentColor, animate = false } = props;
  const { filtersMode = "popover" } = props;
  // Map row density to a table `size` (independent of column pinning):
  // compact → "1", comfortable (default) → "2". An explicit `size` prop, if
  // given, still wins.
  const size =
    props.size ?? ((props.density ?? "comfortable") === "compact" ? "1" : "2");

  const shell = useDataTableShell<TRow>(props, (defs, source) => (
    <AutoFilterForm
      defs={defs}
      source={source}
      accentColor={accentColor}
      dir={props.dir}
      labels={props.labels}
    />
  ));
  const {
    source,
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
    toolbarProps,
  } = shell;
  const tableProps = { ...shell.tableProps, size, accentColor };
  useMountStagger(rootRef, [source.rows.length, chrome.isMobile], {
    enabled: animate,
  });

  const bodyByRegion: Record<TableBodyRegion, ReactNode> = {
    skeleton: slots?.skeleton ?? (
      <LoadingState
        rows={props.skeletonRows ?? source.limit}
        columns={table.columns.length}
        loadingLabel={labels.loading}
      />
    ),
    empty:
      slots?.empty ??
      (chrome.emptyVariant === "noResults" ? (
        <output
          className="adapttable-flex"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
            paddingBlock: "1.5rem",
          }}
        >
          <Text {...subtleText}>{labels.noResults}</Text>
          <Button
            size="2"
            variant="outline"
            color={accentColor}
            onClick={chrome.clearFilters}
          >
            {labels.clearAll}
          </Button>
        </output>
      ) : (
        <output
          className="adapttable-text"
          data-muted="true"
          data-align="center"
          style={{ display: "block", padding: "1.5rem 0" }}
        >
          {labels.noData}
        </output>
      )),
    mobile: <MobileCards {...tableProps} className={props.classNames?.card} />,
    desktop: (
      <DesktopTable
        {...tableProps}
        prefetch={props.prefetch}
        className={props.classNames?.table}
      />
    ),
  };

  return (
    <Box
      ref={rootRef}
      dir={props.dir}
      className={["adapttable-base-ui", props.classNames?.root]
        .filter(Boolean)
        .join(" ")}
      aria-busy={chrome.isRefreshing || undefined}
    >
      <Flex direction="column" gap="3">
        <Toolbar
          {...toolbarProps}
          className={props.classNames?.toolbar}
          filtersMode={filtersMode}
          filtersOpen={filtersOpen}
          onToggleFilters={filtersTrigger.onClick}
          onFiltersTriggerPointerDown={filtersTrigger.onPointerDown}
          onCloseFilters={() => setFiltersOpen(false)}
          savedViewsMenu={
            props.savedViews ? (
              <SavedViewsMenu
                options={{
                  // The table's RESOLVED backend — shared so views follow urlSync.
                  urlAdapter: shell.urlAdapter,
                  urlKey: props.urlKey,
                  ...props.savedViews,
                }}
                labels={labels}
                accentColor={accentColor}
              />
            ) : undefined
          }
          columnMenu={
            props.enableColumnMenu && !chrome.isMobile ? (
              <ColumnMenu
                allColumns={chrome.allColumns}
                layout={chrome.columnLayout}
                labels={table.labels}
                hasRowActions={hasRowActions}
                dir={props.dir}
              />
            ) : undefined
          }
          accentColor={accentColor}
        />
        {chrome.isRefreshing && (
          <Progress size="1" duration="1.5s" aria-label={labels.loading} />
        )}
        <Chips
          chips={chrome.mergedChips}
          onClearAll={chrome.clearFilters}
          labels={labels}
        />
        {table.selection && props.bulkActions && (
          <BulkBar
            selection={table.selection}
            total={source.total}
            bulkActions={props.bulkActions}
            confirm={chrome.confirm}
            labels={labels}
            accentColor={accentColor}
          />
        )}
        {source.error ? (
          <ErrorState
            error={source.error}
            labels={labels}
            onRetry={source.refetch ? () => void source.refetch?.() : undefined}
          />
        ) : (
          bodyByRegion[chrome.body]
        )}
        {canLoadMore && source.hasNextPage && (
          <Flex ref={loadMoreRef} justify="center" py="2">
            <Button
              size="2"
              variant="outline"
              loading={source.isFetchingNextPage}
              onClick={() => source.fetchNextPage()}
            >
              {labels.loadMore}
            </Button>
          </Flex>
        )}
        {chrome.showFooter && (
          <Footer
            className={props.classNames?.footer}
            pagination={table.pagination}
            total={source.total}
            limit={source.limit}
            setPage={source.setPage}
            setLimit={source.setLimit}
            labels={labels}
            showRowsPerPage={!chrome.grouping}
          />
        )}
      </Flex>
      {filtersNode && filtersMode === "drawer" && (
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filtersNode}
          activeFilterCount={chrome.activeFilterCount}
          onClearFilters={chrome.clearFilters}
          labels={labels}
          accentColor={accentColor}
          dir={props.dir}
        />
      )}
    </Box>
  );
}
