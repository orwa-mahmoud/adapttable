import { resolveLabels, showSimpleFilterFields } from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  BATCH_EDIT_BAR,
  BULK_BAR,
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  COMMAND_PALETTE_LIVE,
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
  FeatureHostProvider,
  FeatureProviders,
  FeatureSlot,
  fillSlot,
  FILTER_DRAWER,
  FILTERS_FORM,
  type FiltersFormSlotProps,
  FIND_BAR,
  GRID_FOCUS_ANNOUNCER,
  resolveStickyToolbar,
  ROW_REORDER_ANNOUNCER,
  SAVED_VIEWS,
  SIDE_PANEL,
  STATUS_BAR,
  TableStatusAnnouncer,
  DataTableShellView,
  useDataTableShell,
  useFeatureSlotFilled,
  useMountStagger,
  useStickyToolbarLayout,
  useTableFeatures,
} from "@adapttable/core/adapter";
import { OptionalSidePanel } from "./featureRoot";
import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

import { DesktopTable } from "./components/DesktopTable";
import { ErrorState } from "./components/ErrorState";
import { MobileCards } from "./components/MobileCards";
import { Footer } from "./components/PaginationFooter";
import { LoadingState } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import type { DataTableProps } from "./types";

function ContextMenuLiveGate({
  props,
  children,
}: {
  readonly props: Omit<ContextMenuLiveSlotProps<never>, "children">;
  readonly children: (regionProps: Record<string, unknown>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(CONTEXT_MENU_LIVE);
  if (!filled) return children({});
  return (
    <FeatureSlot slot={CONTEXT_MENU_LIVE} props={{ ...props, children }} />
  );
}

function TableFooterSlot({ children }: Readonly<{ children?: ReactNode }>) {
  if (children == null) return null;
  return <Box data-adapttable-part="table-footer">{children}</Box>;
}

/**
 * Map row density to MUI's table `size`, independent of column pinning. An
 * explicit `size` prop still wins for backward compatibility.
 */
function tableSize(
  bits: Readonly<{
    size?: "small" | "medium";
    density?: "comfortable" | "compact";
  }>
): "small" | "medium" {
  if (bits.size) return bits.size;
  return bits.density === "compact" ? "small" : "medium";
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
 *
 * @public
 */
function DataTableContent<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  const { slots, className, classNames, animate = false } = props;
  const size = tableSize(props);
  const { filtersMode = "popover" } = props;
  // The whole shared orchestration lives in core's shell; MUI adds only its
  // kit's row `size` over the returned bundles.
  const headerFiltersOn =
    props.headerFilters === true || props.filtersMode === "header";
  const simpleFiltersOn = showSimpleFilterFields(
    headerFiltersOn,
    props.filterFields
  );
  const shell = useDataTableShell<TRow>(props, (defs, source, registry) => {
    // The slot key erases the row; TableSource is invariant in TRow.
    const formProps = {
      defs,
      source,
      registry,
      labels: resolveLabels(props.labels),
      defaultExpanded: !simpleFiltersOn,
      showSimpleFields: simpleFiltersOn,
    } as unknown as FiltersFormSlotProps<never>;
    return <FeatureSlot slot={FILTERS_FORM} props={formProps} />;
  });
  const {
    chrome: c,
    table,
    labels,
    filtersNode,
    filtersOpen,
    setFiltersOpen,
    filtersTrigger,
    rootRef,
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
  const { confirm } = c;
  useMountStagger(rootRef, [viewSource.rows.length, c.isMobile], {
    enabled: animate,
  });
  // Saved views capture the table's own URL params, so the menu defaults to
  // the table's URL backend + namespace (an explicit option still wins).
  const savedViewsMenu = props.savedViews ? (
    <FeatureSlot
      slot={SAVED_VIEWS}
      props={{
        options: {
          urlAdapter: shell.urlAdapter,
          urlKey: props.urlKey,
          ...props.savedViews,
        },
        labels,
      }}
    />
  ) : null;

  return (
    <DataTableShellView shell={shell}>
      {(view) => {
        const c = view.chrome;
        const tableProps = {
          ...view.tableProps,
          size,
          stickyTop: stickyBar.headerOffset,
        };
        const { loadMoreRef, canLoadMore, toolbarProps, table } = view;
        const viewSource = view.source;
        const columnMenu = props.enableColumnMenu && !c.isMobile && (
          <FeatureSlot
            slot={COLUMN_MENU}
            props={
              {
                allColumns: c.allColumns,
                onAutoSize: view.autoSizeColumns,
                onAutoSizeColumn: view.autoSizeColumn,
                onSortColumn: (key, dir) => viewSource.setSort(key, dir),
                onFilterColumn: () => setFiltersOpen(true),
                sortBy: viewSource.sortBy,
                sortDir: viewSource.sortDir,
                layout: c.columnLayout,
                labels,
                hasRowActions: view.hasRowActions,
                hasRowReorder: view.hasRowReorder,
                dir: props.dir,
                // The slot key erases the row; ColumnDef is invariant, so the
                // table's TRow cannot be proven to be `never`.
              } as ColumnMenuSlotProps<never>
            }
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
          body = (c.emptyVariant === "noResults"
            ? slots?.noResults
            : undefined) ??
            slots?.empty ?? (
              <Stack
                role="status"
                spacing={1.5}
                sx={{ py: 6, alignItems: "center" }}
              >
                <Typography color="text.secondary" align="center">
                  {c.emptyVariant === "noResults"
                    ? labels.noResults
                    : labels.noData}
                </Typography>
                {c.emptyVariant === "noResults" && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={c.clearFilters}
                  >
                    {labels.clearAll}
                  </Button>
                )}
              </Stack>
            );
        } else if (c.body === "mobile") {
          body = (
            <MobileCards {...tableProps} cardClassName={classNames?.card} />
          );
        } else {
          body = (
            <Box className={classNames?.table}>
              <DesktopTable {...tableProps} prefetch={props.prefetch} />
            </Box>
          );
        }
        const contextMenuLive = {
          contextMenu: props.contextMenu,
          columns: c.allColumns,
          labels,
          rowFor: (rowId: string) =>
            shell.source.rows.find((row) => props.rowKey(row) === rowId),
          actions: {
            onCopy: () => {
              view.gridFocus.copyCells();
            },
            onSort: (key: string, dir: "asc" | "desc") => {
              shell.source.setSort(key, dir);
            },
            onHide: (key: string) => {
              c.columnLayout.toggleVisible(key);
            },
            onFilter: () => {
              shell.setFiltersOpen(true);
            },
          },
          sortBy: shell.source.sortBy,
          sortDir: shell.source.sortDir,
          featureHost: shell.featureHost,
          container: view.fullscreen.container,
        } as Omit<ContextMenuLiveSlotProps<never>, "children">;
        return (
          <FeatureHostProvider host={shell.featureHost}>
            <ContextMenuLiveGate props={contextMenuLive}>
              {(regionProps) => (
                <Paper
                  ref={rootRef}
                  {...regionProps}
                  variant="outlined"
                  dir={props.dir}
                  className={
                    [className, classNames?.root].filter(Boolean).join(" ") ||
                    undefined
                  }
                  aria-busy={c.isRefreshing || undefined}
                  sx={{ p: 1.5 }}
                >
                  <FeatureSlot
                    slot={GRID_FOCUS_ANNOUNCER}
                    props={{ focus: view.gridFocus }}
                  />
                  <TableStatusAnnouncer
                    announcement={shell.statusAnnouncement}
                  />
                  {view.tableProps.rowReorder ? (
                    <FeatureSlot
                      slot={ROW_REORDER_ANNOUNCER}
                      props={{
                        announcement: view.tableProps.rowReorder.announcement,
                      }}
                    />
                  ) : null}
                  <FeatureSlot
                    slot={FIND_BAR}
                    props={{ find: view.find, labels }}
                  />
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
                        onFiltersTriggerPointerDown={
                          filtersTrigger.onPointerDown
                        }
                        onCloseFilters={() => setFiltersOpen(false)}
                        columnMenu={columnMenu}
                      />
                    </Box>
                    {c.isRefreshing && (
                      <LinearProgress aria-label={labels.loading} />
                    )}
                    <FeatureSlot
                      slot={ACTIVE_FILTER_CHIPS}
                      props={{
                        chips: view.chrome.mergedChips,
                        onClearAll: c.clearFilters,
                        labels,
                      }}
                    />
                    {view.chrome.editing?.batch && (
                      <FeatureSlot
                        slot={BATCH_EDIT_BAR}
                        props={{ batch: view.chrome.editing.batch, labels }}
                      />
                    )}

                    {table.selection && props.bulkActions ? (
                      <FeatureSlot
                        slot={BULK_BAR}
                        props={{
                          selection: table.selection,
                          total: viewSource.total,
                          bulkActions: props.bulkActions,
                          confirm,
                          labels,
                        }}
                      />
                    ) : null}
                    <FeatureSlot
                      slot={COMMAND_PALETTE_LIVE}
                      props={{
                        commandPalette: props.commandPalette,
                        labels,
                        onPrint: props.onPrint,
                        onExport: view.toolbarProps.onExportCsv,
                        onClearFilters: c.clearFilters,
                        hasFilters: c.activeFilterCount > 0,
                        featureHost: shell.featureHost,
                      }}
                    />
                    <OptionalSidePanel
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
                          <FeatureSlot
                            slot={SIDE_PANEL}
                            props={{
                              panels: props.sidePanel.panels,
                              openPanel: props.sidePanel.open,
                              onOpenPanel: props.sidePanel.onOpenChange,
                              onClose: () => {
                                props.sidePanel?.onOpenChange(null);
                              },
                              side: props.sidePanel.side,
                              labels,
                            }}
                          />
                        )
                      }
                    />
                    {canLoadMore && viewSource.hasNextPage && (
                      <Box
                        ref={loadMoreRef}
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          py: 1,
                        }}
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
                          showRowsPerPage={!view.chrome.grouping}
                        />
                      </Box>
                    )}
                  </Stack>
                  {filtersNode && filtersMode === "drawer" && (
                    <FeatureSlot
                      slot={FILTER_DRAWER}
                      props={{
                        open: filtersOpen,
                        onClose: () => setFiltersOpen(false),
                        filters: filtersNode,
                        activeFilterCount: c.activeFilterCount,
                        onClearFilters: c.clearFilters,
                        labels,
                        dir: props.dir,
                      }}
                    />
                  )}
                  <FeatureSlot
                    slot={STATUS_BAR}
                    props={{
                      enabled: props.statusBar === true,
                      notices: c.featureNotices,
                      shown: shell.source.rows.length,
                      page: shell.source.page,
                      limit: shell.source.limit,
                      total: shell.source.total,
                      selected: table.selection?.selectedCount ?? 0,
                      stats: view.selectionStats,
                      labels,
                      locale: props.locale,
                    }}
                  />
                </Paper>
              )}
            </ContextMenuLiveGate>
          </FeatureHostProvider>
        );
      }}
    </DataTableShellView>
  );
}

/**
 * Resolve `features` and mount whatever providers they contribute, then render
 * the table inside them.
 *
 * A feature that owns hooks owns a component, so its provider has to sit ABOVE
 * the body that reads what it publishes — that is the whole reason this is two
 * components rather than one.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  return (
    <FeatureProviders props={props}>
      <DataTableContent<TRow> {...props} />
    </FeatureProviders>
  );
}
