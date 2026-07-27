import {
  type TableBodyRegion,
  useDataTableShell,
  useMountStagger,
} from "@adapttable/core";
import { Box, Button, Flex, Progress, Stack, Text } from "@chakra-ui/react";
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
import { subtleText } from "./styles";
import type { DataTableProps } from "./types";

/**
 * Batteries-included Chakra UI data table. Drop in `columns`, a `rowKey`,
 * and either raw `data` (frontend tier — add `onQueryChange` for the server
 * tier) or a prebuilt `source`, for a fully styled, sortable, filterable,
 * paginated Chakra table with selection, bulk actions, RTL, and dark mode —
 * on the headless `@adapttable/core` engine. The shared orchestration lives in
 * core's `useDataTableShell`; this renders only Chakra controls over it.
 *
 * @typeParam TRow - The row type.
 */
export function DataTable<TRow>(props: Readonly<DataTableProps<TRow>>) {
  const { slots, colorScheme, animate = false } = props;
  const { filtersMode = "popover" } = props;
  // Map row density to Chakra's table `size` (independent of column pinning):
  // compact → "sm", comfortable (default) → "md". An explicit `size` prop, if
  // given, still wins for backward compatibility.
  const size =
    props.size ??
    ((props.density ?? "comfortable") === "compact" ? "sm" : "md");

  const shell = useDataTableShell<TRow>(props, (defs, source) => (
    <AutoFilterForm
      defs={defs}
      source={source}
      colorScheme={colorScheme}
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
  const tableProps = { ...shell.tableProps, size, colorScheme };
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
        <Stack role="status" align="center" py={10} gap={3}>
          <Text {...subtleText}>{labels.noResults}</Text>
          <Button
            size="sm"
            variant="outline"
            colorPalette={colorScheme}
            onClick={chrome.clearFilters}
          >
            {labels.clearAll}
          </Button>
        </Stack>
      ) : (
        <Text role="status" {...subtleText} textAlign="center" py={10}>
          {labels.noData}
        </Text>
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
      className={props.classNames?.root}
      aria-busy={chrome.isRefreshing || undefined}
      borderWidth="1px"
      borderRadius="md"
      p={3}
    >
      <Stack gap={3}>
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
                  adapter: shell.urlAdapter,
                  urlKey: props.urlKey,
                  ...props.savedViews,
                }}
                labels={labels}
                colorScheme={colorScheme}
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
          colorScheme={colorScheme}
        />
        {chrome.isRefreshing && (
          <Progress.Root size="xs" value={null} aria-label={labels.loading}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
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
            colorScheme={colorScheme}
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
          <Flex ref={loadMoreRef} justify="center" py={2}>
            <Button
              size="sm"
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
          />
        )}
      </Stack>
      {filtersNode && filtersMode === "drawer" && (
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filtersNode}
          activeFilterCount={chrome.activeFilterCount}
          onClearFilters={chrome.clearFilters}
          labels={labels}
          colorScheme={colorScheme}
          dir={props.dir}
        />
      )}
    </Box>
  );
}
