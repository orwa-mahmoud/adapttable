import {
  resolveLabels,
  showSimpleFilterFields,
  type TableLabels,
  type UseSavedViewsOptions,
} from "@adapttable/core";
import {
  FeatureHostProvider,
  fillSlot,
  GridFocusAnnouncer,
  resolveStickyToolbar,
  RowReorderAnnouncer,
  SidePanelLayout,
  useCommandPalette,
  useDataTableShell,
  useStickyToolbarLayout,
  useTableContextMenu,
  useTableFeatures,
} from "@adapttable/core/adapter";
import { Box, Button, Group, Paper, Progress, Stack } from "@mantine/core";
import { useRef } from "react";

import { useMountStagger } from "./animation/useMountStagger";
import { ActiveFilterChips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { BulkActionBar } from "./components/BulkActionBar";
import { ColumnMenu, type ColumnMenuProps } from "./components/ColumnMenu";
import { CommandPalette } from "./components/CommandPalette";
import { ContextMenu } from "./components/ContextMenu";
import { DesktopTable } from "./components/DesktopTable";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { FilterDrawer } from "./components/FilterDrawer";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";
import { BatchEditBar, FindBar } from "./components/kitControls";
import { MobileCards } from "./components/MobileCards";
import { PaginationFooter } from "./components/PaginationFooter";
import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { SidePanel } from "./components/SidePanel";
import { StatusBar } from "./components/StatusBar";
import { TableSkeleton } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import { SURFACE } from "./surface";
import type { DataTableProps } from "./types";

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
  return <SavedViewsMenu options={options} labels={labels} />;
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
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  const {
    dir,
    prefetch,
    filtersMode = "popover",
    bulkActions,
    slots,
    classNames,
    skeletonRows,
    stickyTop = 0,
    stickyToolbar,
    animate = false,
    stickyHeader = false,
    enableColumnMenu = false,
    savedViews,
  } = props;
  const density = props.density ?? "comfortable";

  // The whole shared orchestration — data tier, filter runtime, chrome,
  // scroll reset, body windowing — lives in core. Mantine adds only what its
  // kit needs: a measured sticky toolbar, per-body stagger refs, and density.
  const headerFiltersOn =
    props.headerFilters === true || props.filtersMode === "header";
  const simpleFiltersOn = showSimpleFilterFields(
    headerFiltersOn,
    props.filterFields
  );
  const shell = useDataTableShell<TRow>(props, (defs, source, registry) => (
    <Stack gap="lg" data-adapttable-part="filters-form">
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
          labels={resolveLabels(props.labels)}
          registry={registry}
        />
      ) : null}
    </Stack>
  ));
  const {
    chrome,
    table,
    filtersNode: filters,
    filtersOpen: drawerOpened,
    setFiltersOpen: setDrawerOpened,
    filtersTrigger,
    rootRef,
    loadMoreRef,
    canLoadMore,
    hasRowActions,
    hasRowReorder,
    toolbarProps,
  } = shell;
  // Everything rendered below reads the chrome's VIEW facade — identical to
  // the raw source except under grouping, where it presents the full set.
  const viewSource = shell.source;
  // One binding covers headers, rows and cells: the target is resolved from
  // wherever the event started, so there is no third handler to forget.
  const contextMenu = useTableContextMenu<TRow>({
    contextMenu: props.contextMenu,
    columns: chrome.allColumns,
    labels: table.labels,
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
    labels: table.labels,
    onPrint: props.onPrint,
    onExport: shell.toolbarProps.onExportCsv,
    onClearFilters: chrome.clearFilters,
    hasFilters: chrome.activeFilterCount > 0,
    featureHost: shell.featureHost,
  });
  const { isMobile, confirm } = chrome;
  const stickyBar = useStickyToolbarLayout(
    resolveStickyToolbar(stickyHeader, stickyToolbar, props.maxHeight != null),
    stickyTop
  );

  const desktopBodyRef = useRef<HTMLTableSectionElement>(null);
  const mobileBodyRef = useRef<HTMLDivElement>(null);

  useMountStagger(
    isMobile ? mobileBodyRef : desktopBodyRef,
    [shell.tableProps.rows.length, isMobile],
    { enabled: animate }
  );

  // Kit-agnostic render bundle + Mantine's own extras.
  const tableProps = { ...shell.tableProps, density };

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
      (chrome.emptyVariant === "noResults" ? slots?.noResults : undefined) ??
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
        {...tableProps}
        bodyRef={mobileBodyRef}
        className={classNames?.card}
      />
    );
  } else {
    body = (
      <DesktopTable
        {...tableProps}
        prefetch={prefetch}
        bodyRef={desktopBodyRef}
        className={classNames?.table}
        stickyHeader={stickyHeader}
        stickyHeaderOffset={stickyBar.headerOffset}
      />
    );
  }

  return (
    <FeatureHostProvider host={shell.featureHost}>
      <Paper
        {...contextMenu.regionProps}
        ref={rootRef}
        p="xs"
        radius="md"
        withBorder
        dir={dir}
        aria-busy={chrome.isRefreshing || undefined}
        className={classNames?.root}
      >
        <GridFocusAnnouncer focus={shell.gridFocus} />
        {shell.tableProps.rowReorder ? (
          <RowReorderAnnouncer
            announcement={shell.tableProps.rowReorder.announcement}
          />
        ) : null}
        <FindBar find={shell.find} labels={table.labels} />
        <Stack gap="xs">
          <Box
            data-adapttable-part="toolbar"
            ref={stickyBar.toolbarRef}
            style={{
              ...stickyBar.toolbarStyle,
              ...(stickyBar.toolbarStyle
                ? {
                    background: SURFACE,
                    paddingBottom: "var(--mantine-spacing-xs)",
                  }
                : {}),
            }}
            className={classNames?.toolbar}
          >
            <Stack gap="xs">
              <Toolbar
                {...toolbarProps}
                filtersMode={filtersMode}
                filtersOpen={drawerOpened}
                onToggleFilters={filtersTrigger.onClick}
                onFiltersTriggerPointerDown={filtersTrigger.onPointerDown}
                onCloseFilters={() => setDrawerOpened(false)}
                savedViewsMenu={
                  savedViews && (
                    <SavedViewsSlot
                      // The table's own URL backend/namespace are the
                      // defaults — an explicit option still wins.
                      options={{
                        urlAdapter: shell.urlAdapter,
                        urlKey: props.urlKey,
                        ...savedViews,
                      }}
                      labels={table.labels}
                    />
                  )
                }
                columnMenu={
                  <ColumnMenuSlot
                    enabled={enableColumnMenu && !isMobile}
                    onAutoSize={shell.autoSizeColumns}
                    onAutoSizeColumn={shell.autoSizeColumn}
                    onSortColumn={(key, dir) => viewSource.setSort(key, dir)}
                    onFilterColumn={() => setDrawerOpened(true)}
                    sortBy={viewSource.sortBy}
                    sortDir={viewSource.sortDir}
                    allColumns={chrome.allColumns}
                    layout={chrome.columnLayout}
                    labels={table.labels}
                    hasRowActions={hasRowActions}
                    hasRowReorder={hasRowReorder}
                    dir={dir}
                  />
                }
              />
              <ActiveFilterChips
                chips={chrome.mergedChips}
                onClearAll={chrome.clearFilters}
                label={table.labels.filters}
                clearAllLabel={table.labels.clearAll}
              />
              {chrome.editing?.batch && (
                <BatchEditBar
                  batch={chrome.editing.batch}
                  labels={table.labels}
                />
              )}

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

          <CommandPalette
            commands={palette.commands}
            open={palette.open}
            onClose={palette.close}
            labels={table.labels}
          />
          <ContextMenu
            items={contextMenu.items}
            at={contextMenu.at}
            onClose={contextMenu.close}
            container={shell.fullscreen.container}
            labels={table.labels}
          />
          <SidePanelLayout
            side={props.sidePanel?.side}
            body={
              <>
                {chrome.errorState
                  ? (fillSlot(slots?.error, chrome.errorState) ?? (
                      <ErrorState
                        error={chrome.errorState.error}
                        title={table.labels.errorTitle}
                        message={table.labels.errorMessage}
                        retryLabel={table.labels.retry}
                        onRetry={chrome.errorState.retry}
                        isRetrying={chrome.errorState.retrying}
                      />
                    ))
                  : body}
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
                  labels={table.labels}
                />
              )
            }
          />

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

          {props.tableFooter ? (
            <Box data-adapttable-part="table-footer">{props.tableFooter}</Box>
          ) : null}

          {chrome.showFooter && (
            <Box className={classNames?.footer}>
              <PaginationFooter
                page={table.pagination.safePage}
                totalPages={table.pagination.totalPages}
                limit={viewSource.limit}
                defaultLimit={viewSource.defaultLimit}
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
        <StatusBar
          enabled={props.statusBar === true}
          notices={chrome.featureNotices}
          shown={shell.source.rows.length}
          page={shell.source.page}
          limit={shell.source.limit}
          total={shell.source.total}
          selected={table.selection?.selectedCount ?? 0}
          stats={shell.selectionStats}
          labels={table.labels}
          locale={props.locale}
        />
      </Paper>
    </FeatureHostProvider>
  );
}
