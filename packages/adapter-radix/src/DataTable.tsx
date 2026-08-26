import { showSimpleFilterFields } from "@adapttable/core";
import {
  FeatureHostProvider,
  fillSlot,
  GridFocusAnnouncer,
  resolveStickyToolbar,
  RowReorderAnnouncer,
  SidePanelLayout,
  type TableBodyRegion,
  useCommandPalette,
  useDataTableShell,
  useMountStagger,
  useStickyToolbarLayout,
  useTableContextMenu,
  useTableFeatures,
} from "@adapttable/core/adapter";
import { Box, Button, Flex, Progress, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

import { Chips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { BulkBar } from "./components/BulkActionBar";
import { ColumnMenu } from "./components/ColumnMenu";
import { CommandPalette } from "./components/CommandPalette";
import { ContextMenu } from "./components/ContextMenu";
import { DesktopTable } from "./components/DesktopTable";
import { ErrorState } from "./components/ErrorState";
import { FilterDrawer } from "./components/FilterDrawer";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";
import { BatchEditBar, FindBar } from "./components/kitControls";
import { MobileCards } from "./components/MobileCards";
import { Footer } from "./components/PaginationFooter";
import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { SidePanel } from "./components/SidePanel";
import { StatusBar } from "./components/StatusBar";
import { LoadingState } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import { subtleText } from "./styles";
import type { DataTableProps } from "./types";

/**
 * Batteries-included Radix Themes data table. Drop in `columns`, a `rowKey`,
 * and either raw `data` (frontend tier — add `onQueryChange` for the server
 * tier) or a prebuilt `source`, for a fully styled, sortable, filterable,
 * paginated Radix table with selection, bulk actions, RTL, and dark mode — on
 * the headless `@adapttable/core` engine. The shared orchestration lives in
 * core's `useDataTableShell`; this renders only Radix controls over it.
 *
 * @typeParam TRow - The row type.
 */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  const { slots, accentColor, animate = false } = props;
  const { filtersMode = "popover" } = props;
  // Map row density to a Radix table `size` (independent of column pinning):
  // compact → "1", comfortable (default) → "2". An explicit `size` prop, if
  // given, still wins.
  const size =
    props.size ?? ((props.density ?? "comfortable") === "compact" ? "1" : "2");

  const headerFiltersOn =
    props.headerFilters === true || props.filtersMode === "header";
  const simpleFiltersOn = showSimpleFilterFields(
    headerFiltersOn,
    props.filterFields
  );
  const shell = useDataTableShell<TRow>(props, (defs, source, registry) => (
    <div
      data-adapttable-part="filters-form"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <FilterTreeBuilder
        defs={defs}
        source={source}
        labels={props.labels}
        registry={registry}
        defaultExpanded={!simpleFiltersOn}
      />
      {simpleFiltersOn ? (
        <AutoFilterForm
          defs={defs}
          source={source}
          accentColor={accentColor}
          dir={props.dir}
          labels={props.labels}
          registry={registry}
        />
      ) : null}
    </div>
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
    hasRowReorder,
    toolbarProps,
  } = shell;
  const stickyBar = useStickyToolbarLayout(
    resolveStickyToolbar(
      props.stickyHeader,
      props.stickyToolbar,
      props.maxHeight != null
    ),
    props.stickyTop ?? 0
  );
  // One binding covers headers, rows and cells: the target is resolved from
  // wherever the event started, so there is no third handler to forget.
  const contextMenu = useTableContextMenu<TRow>({
    contextMenu: props.contextMenu,
    columns: chrome.allColumns,
    labels,
    rowFor: (rowId) =>
      shell.source.rows.find((row) => props.rowKey(row) === rowId),
    actions: {
      onCopy: () => {
        shell.gridFocus.copyCells();
      },
      onSort: (key, dir) => {
        shell.source.setSort(key, dir);
      },
      onHide: (key) => {
        chrome.columnLayout.toggleVisible(key);
      },
      onFilter: () => {
        shell.setFiltersOpen(true);
      },
    },
    sortBy: shell.source.sortBy,
    sortDir: shell.source.sortDir,
    featureHost: shell.featureHost,
  });

  // The palette lists the table's own actions; its shortcut is bound here
  // so an adapter cannot ship one without the other.
  const palette = useCommandPalette({
    commandPalette: props.commandPalette,
    labels: labels,
    onPrint: props.onPrint,
    onExport: shell.toolbarProps.onExportCsv,
    onClearFilters: chrome.clearFilters,
    hasFilters: chrome.activeFilterCount > 0,
    featureHost: shell.featureHost,
  });
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
      (chrome.emptyVariant === "noResults" ? slots?.noResults : undefined) ??
      slots?.empty ??
      (chrome.emptyVariant === "noResults" ? (
        <Flex role="status" direction="column" align="center" py="6" gap="3">
          <Text {...subtleText}>{labels.noResults}</Text>
          <Button
            size="2"
            variant="outline"
            color={accentColor}
            onClick={chrome.clearFilters}
          >
            {labels.clearAll}
          </Button>
        </Flex>
      ) : (
        <Text
          role="status"
          {...subtleText}
          align="center"
          style={{ display: "block", padding: "var(--space-6) 0" }}
        >
          {labels.noData}
        </Text>
      )),
    mobile: <MobileCards {...tableProps} className={props.classNames?.card} />,
    desktop: (
      <DesktopTable
        {...tableProps}
        stickyTop={stickyBar.headerOffset}
        prefetch={props.prefetch}
        className={props.classNames?.table}
      />
    ),
  };

  return (
    <FeatureHostProvider host={shell.featureHost}>
      <Box
        ref={rootRef}
        {...contextMenu.regionProps}
        dir={props.dir}
        className={props.classNames?.root}
        aria-busy={chrome.isRefreshing || undefined}
        p="3"
      >
        <GridFocusAnnouncer focus={shell.gridFocus} />
        {shell.tableProps.rowReorder ? (
          <RowReorderAnnouncer
            announcement={shell.tableProps.rowReorder.announcement}
          />
        ) : null}
        <FindBar find={shell.find} labels={labels} />
        <Flex direction="column" gap="3">
          <Box ref={stickyBar.toolbarRef} style={stickyBar.toolbarStyle}>
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
                    onAutoSize={shell.autoSizeColumns}
                    onAutoSizeColumn={shell.autoSizeColumn}
                    onSortColumn={(key, dir) => source.setSort(key, dir)}
                    onFilterColumn={() => setFiltersOpen(true)}
                    sortBy={source.sortBy}
                    sortDir={source.sortDir}
                    layout={chrome.columnLayout}
                    labels={table.labels}
                    hasRowActions={hasRowActions}
                    hasRowReorder={hasRowReorder}
                    dir={props.dir}
                  />
                ) : undefined
              }
              accentColor={accentColor}
            />
          </Box>
          {chrome.isRefreshing && (
            <Progress size="1" duration="1.5s" aria-label={labels.loading} />
          )}
          <Chips
            chips={chrome.mergedChips}
            onClearAll={chrome.clearFilters}
            labels={labels}
          />
          {chrome.editing?.batch && (
            <BatchEditBar batch={chrome.editing.batch} labels={labels} />
          )}

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
          <CommandPalette
            commands={palette.commands}
            open={palette.open}
            onClose={palette.close}
            labels={labels}
          />
          <ContextMenu
            items={contextMenu.items}
            at={contextMenu.at}
            onClose={contextMenu.close}
            container={shell.fullscreen.container}
            labels={labels}
          />
          <SidePanelLayout
            side={props.sidePanel?.side}
            body={
              <>
                {chrome.errorState
                  ? (fillSlot(slots?.error, chrome.errorState) ?? (
                      <ErrorState
                        error={chrome.errorState.error}
                        labels={labels}
                        onRetry={chrome.errorState.retry}
                      />
                    ))
                  : bodyByRegion[chrome.body]}
              </>
            }
            panel={
              props.sidePanel?.open != null && (
                <SidePanel
                  panels={props.sidePanel.panels}
                  openPanel={props.sidePanel.open}
                  onOpenPanel={props.sidePanel.onOpenChange}
                  onClose={() => {
                    props.sidePanel?.onOpenChange(null);
                  }}
                  side={props.sidePanel.side}
                  labels={labels}
                />
              )
            }
          />
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
          {props.tableFooter ? (
            <div data-adapttable-part="table-footer">{props.tableFooter}</div>
          ) : null}
          {chrome.showFooter && (
            <Footer
              className={props.classNames?.footer}
              pagination={table.pagination}
              total={source.total}
              limit={source.limit}
              defaultLimit={source.defaultLimit}
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
        <StatusBar
          enabled={props.statusBar === true}
          notices={chrome.featureNotices}
          shown={shell.source.rows.length}
          page={shell.source.page}
          limit={shell.source.limit}
          total={shell.source.total}
          selected={table.selection?.selectedCount ?? 0}
          stats={shell.selectionStats}
          labels={labels}
          locale={props.locale}
        />
      </Box>
    </FeatureHostProvider>
  );
}
