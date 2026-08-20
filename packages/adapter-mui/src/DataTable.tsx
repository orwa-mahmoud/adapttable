import { resolveLabels, showSimpleFilterFields } from "@adapttable/core";
import {
  fillSlot,
  GridFocusAnnouncer,
  resolveStickyToolbar,
  RowReorderAnnouncer,
  SidePanelLayout,
  useCommandPalette,
  useDataTableShell,
  useMountStagger,
  useStickyToolbarLayout,
  useTableContextMenu,
} from "@adapttable/core/adapter";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
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
import type { DataTableProps } from "./types";

function TableFooterSlot({ children }: Readonly<{ children?: ReactNode }>) {
  if (children == null) return null;
  return <Box data-adapttable-part="table-footer">{children}</Box>;
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
  const { slots, className, classNames, animate = false } = props;
  const size = tableSize(props.size, props.density);
  const { filtersMode = "popover" } = props;
  // The whole shared orchestration lives in core's shell; MUI adds only its
  // kit's row `size` over the returned bundles.
  const headerFiltersOn =
    props.headerFilters === true || props.filtersMode === "header";
  const simpleFiltersOn = showSimpleFilterFields(
    headerFiltersOn,
    props.filterFields
  );
  const shell = useDataTableShell<TRow>(props, (defs, source, registry) => (
    <Stack spacing={3} data-adapttable-part="filters-form">
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
    chrome: c,
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
  // Everything rendered below reads the chrome's VIEW facade — identical to
  // the raw source except under grouping, where it presents the full set.
  const viewSource = shell.source;
  // One binding covers headers, rows and cells: the target is resolved from
  // wherever the event started, so there is no third handler to forget.
  const contextMenu = useTableContextMenu<TRow>({
    contextMenu: props.contextMenu,
    columns: c.allColumns,
    labels: labels,
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
        c.columnLayout.toggleVisible(key);
      },
      onFilter: () => {
        shell.setFiltersOpen(true);
      },
    },
    sortBy: shell.source.sortBy,
    sortDir: shell.source.sortDir,
  });

  // The palette lists the table's own actions; its shortcut is bound here
  // so an adapter cannot ship one without the other.
  const palette = useCommandPalette({
    commandPalette: props.commandPalette,
    labels: labels,
    onPrint: props.onPrint,
    onExport: shell.toolbarProps.onExportCsv,
    onClearFilters: c.clearFilters,
    hasFilters: c.activeFilterCount > 0,
  });
  const { confirm } = c;
  const tableProps = {
    ...shell.tableProps,
    size,
    stickyTop: stickyBar.headerOffset,
  };
  useMountStagger(rootRef, [viewSource.rows.length, c.isMobile], {
    enabled: animate,
  });
  const columnMenu = props.enableColumnMenu && !c.isMobile && (
    <ColumnMenu
      allColumns={c.allColumns}
      onAutoSize={shell.autoSizeColumns}
      onAutoSizeColumn={shell.autoSizeColumn}
      onSortColumn={(key, dir) => viewSource.setSort(key, dir)}
      onFilterColumn={() => setFiltersOpen(true)}
      sortBy={viewSource.sortBy}
      sortDir={viewSource.sortDir}
      layout={c.columnLayout}
      labels={labels}
      hasRowActions={hasRowActions}
      hasRowReorder={hasRowReorder}
      dir={props.dir}
    />
  );
  // Saved views capture the table's own URL params, so the menu defaults to
  // the table's URL backend + namespace (an explicit option still wins).
  const savedViewsMenu = props.savedViews && (
    <SavedViewsMenu
      options={{
        urlAdapter: shell.urlAdapter,
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
    body = (c.emptyVariant === "noResults" ? slots?.noResults : undefined) ??
      slots?.empty ?? (
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
    body = <MobileCards {...tableProps} cardClassName={classNames?.card} />;
  } else {
    body = (
      <Box className={classNames?.table}>
        <DesktopTable {...tableProps} prefetch={props.prefetch} />
      </Box>
    );
  }

  return (
    <Paper
      ref={rootRef}
      {...contextMenu.regionProps}
      variant="outlined"
      dir={props.dir}
      className={
        [className, classNames?.root].filter(Boolean).join(" ") || undefined
      }
      aria-busy={c.isRefreshing || undefined}
      sx={{ p: 1.5 }}
    >
      <GridFocusAnnouncer focus={shell.gridFocus} />
      {shell.tableProps.rowReorder ? (
        <RowReorderAnnouncer
          announcement={shell.tableProps.rowReorder.announcement}
        />
      ) : null}
      <FindBar find={shell.find} labels={labels} />
      <Stack spacing={1.5}>
        <Box
          data-adapttable-part="toolbar"
          ref={stickyBar.toolbarRef}
          className={classNames?.toolbar}
          sx={
            stickyBar.toolbarStyle
              ? {
                  position: "sticky",
                  top: stickyBar.toolbarStyle.top,
                  zIndex: 3,
                  bgcolor: "background.paper",
                  pb: 1.5,
                }
              : undefined
          }
        >
          <Toolbar
            {...toolbarProps}
            savedViewsMenu={savedViewsMenu}
            filtersMode={filtersMode}
            filtersOpen={filtersOpen}
            onToggleFilters={filtersTrigger.onClick}
            onFiltersTriggerPointerDown={filtersTrigger.onPointerDown}
            onCloseFilters={() => setFiltersOpen(false)}
            columnMenu={columnMenu}
          />
        </Box>
        {c.isRefreshing && <LinearProgress aria-label={labels.loading} />}
        <Chips
          chips={c.mergedChips}
          onClearAll={c.clearFilters}
          labels={labels}
        />
        {c.editing?.batch && (
          <BatchEditBar batch={c.editing.batch} labels={labels} />
        )}

        {table.selection && props.bulkActions && (
          <BulkBar
            selection={table.selection}
            total={viewSource.total}
            bulkActions={props.bulkActions}
            confirm={confirm}
            labels={labels}
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
              {c.errorState
                ? (fillSlot(slots?.error, c.errorState) ?? (
                    <ErrorState
                      error={c.errorState.error}
                      labels={labels}
                      onRetry={c.errorState.retry}
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
                labels={labels}
              />
            )
          }
        />
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
        <TableFooterSlot>{props.tableFooter}</TableFooterSlot>
        {c.showFooter && (
          <Box className={classNames?.footer}>
            <Footer
              pagination={table.pagination}
              total={viewSource.total}
              limit={viewSource.limit}
              defaultLimit={viewSource.defaultLimit}
              setPage={viewSource.setPage}
              setLimit={viewSource.setLimit}
              labels={labels}
              showRowsPerPage={!c.grouping}
            />
          </Box>
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
      <StatusBar
        enabled={props.statusBar === true}
        notices={c.featureNotices}
        shown={shell.source.rows.length}
        page={shell.source.page}
        limit={shell.source.limit}
        total={shell.source.total}
        selected={table.selection?.selectedCount ?? 0}
        stats={shell.selectionStats}
        labels={labels}
        locale={props.locale}
      />
    </Paper>
  );
}
