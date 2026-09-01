import { resolveLabels, showSimpleFilterFields } from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  BATCH_EDIT_BAR,
  BULK_BAR,
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  COMMAND_PALETTE_LIVE,
  DataTableShellView,
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
  type TableBodyRegion,
  TableStatusAnnouncer,
  useDataTableShell,
  useMountStagger,
  useStickyToolbarLayout,
  useTableFeatures,
} from "@adapttable/core/adapter";
import { Box, Button, Flex, Progress, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { DesktopTable } from "./components/DesktopTable";
import { ErrorState } from "./components/ErrorState";
import { MobileCards } from "./components/MobileCards";
import { Footer } from "./components/PaginationFooter";
import { LoadingState } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import { ContextMenuLiveGate, OptionalSidePanel } from "./featureRoot";
import { subtleText } from "./styles";
import type { DataTableProps } from "./types";

/**
 * Map row density to Chakra's table `size`. An explicit `size` prop still
 * wins for backward compatibility.
 */
function tableSize(
  bits: Readonly<{
    size?: "sm" | "md" | "lg";
    density?: "comfortable" | "compact";
  }>
): "sm" | "md" | "lg" {
  return (
    bits.size ?? ((bits.density ?? "comfortable") === "compact" ? "sm" : "md")
  );
}

/**
 * Batteries-included Chakra UI data table. Drop in `columns`, a `rowKey`,
 * and either raw `data` (frontend tier — add `onQueryChange` for the server
 * tier) or a prebuilt `source`, for a fully styled, sortable, filterable,
 * paginated Chakra table with selection, bulk actions, RTL, and dark mode —
 * on the headless `@adapttable/core` engine. The shared orchestration lives in
 * core's `useDataTableShell`; this renders only Chakra controls over it.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
function DataTableContent<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  const { slots, animate = false } = props;
  const accentColor = props.accentColor;
  const { filtersMode = "popover" } = props;

  const headerFiltersOn =
    props.headerFilters === true || props.filtersMode === "header";
  const simpleFiltersOn = showSimpleFilterFields(
    headerFiltersOn,
    props.filterFields
  );
  const shell = useDataTableShell<TRow>(props, (defs, source, registry) => {
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
    source,
    chrome,
    labels,
    filtersNode,
    filtersOpen,
    setFiltersOpen,
    filtersTrigger,
    rootRef,
  } = shell;
  // Map resolved row density to Chakra's table `size`; an explicit kit size
  // still wins.
  const size = tableSize({ size: props.size, density: shell.density });
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

  // The palette lists the table's own actions; its shortcut is bound here
  // so an adapter cannot ship one without the other.
  useMountStagger(rootRef, [source.rows.length, chrome.isMobile], {
    enabled: animate,
  });

  return (
    <DataTableShellView shell={shell}>
      {(view) => {
        const chrome = view.chrome;
        const {
          canLoadMore,
          loadMoreRef,
          hasRowActions,
          hasRowReorder,
          toolbarProps,
          table,
          source,
        } = view;
        const tableProps = { ...view.tableProps, size, accentColor };
        const bodyByRegion: Record<TableBodyRegion, ReactNode> = {
          skeleton: slots?.skeleton ?? (
            <LoadingState
              rows={props.skeletonRows ?? source.limit}
              columns={table.columns.length}
              loadingLabel={labels.loading}
            />
          ),
          empty:
            (chrome.emptyVariant === "noResults"
              ? slots?.noResults
              : undefined) ??
            slots?.empty ??
            (chrome.emptyVariant === "noResults" ? (
              <Stack role="status" align="center" py={10} gap={3}>
                <Text {...subtleText}>{labels.noResults}</Text>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette={accentColor}
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
          mobile: (
            <MobileCards {...tableProps} className={props.classNames?.card} />
          ),
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
            <ContextMenuLiveGate
              props={{
                contextMenu: props.contextMenu,
                columns: chrome.allColumns as never,
                labels,
                rowFor: (rowId) =>
                  shell.source.rows.find(
                    (row) => props.rowKey(row) === rowId
                  ) as never,
                actions: {
                  onCopy: () => {
                    view.gridFocus.copyCells();
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
                container: view.fullscreen.container,
              }}
            >
              {(regionProps) => (
                <Box
                  ref={rootRef}
                  {...regionProps}
                  dir={props.dir}
                  className={props.classNames?.root}
                  aria-busy={chrome.isRefreshing || undefined}
                  borderWidth="1px"
                  borderRadius="md"
                  p={3}
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
                  <Stack gap={3}>
                    <Box
                      ref={stickyBar.toolbarRef}
                      style={stickyBar.toolbarStyle}
                      bg={stickyBar.toolbarStyle ? "bg" : undefined}
                    >
                      <Toolbar
                        {...toolbarProps}
                        className={props.classNames?.toolbar}
                        filtersMode={filtersMode}
                        filtersOpen={filtersOpen}
                        onToggleFilters={filtersTrigger.onClick}
                        onFiltersTriggerPointerDown={
                          filtersTrigger.onPointerDown
                        }
                        onCloseFilters={() => setFiltersOpen(false)}
                        savedViewsMenu={
                          props.savedViews ? (
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
                          ) : undefined
                        }
                        columnMenu={
                          props.enableColumnMenu && !chrome.isMobile ? (
                            <FeatureSlot
                              slot={COLUMN_MENU}
                              props={
                                {
                                  allColumns: chrome.allColumns,
                                  onAutoSize: view.autoSizeColumns,
                                  onAutoSizeColumn: view.autoSizeColumn,
                                  onSortColumn: (key, dir) =>
                                    shell.source.setSort(key, dir),
                                  onFilterColumn: () => setFiltersOpen(true),
                                  sortBy: shell.source.sortBy,
                                  sortDir: shell.source.sortDir,
                                  layout: chrome.columnLayout,
                                  labels,
                                  hasRowActions,
                                  hasRowReorder,
                                  dir: props.dir,
                                } as ColumnMenuSlotProps<never>
                              }
                            />
                          ) : undefined
                        }
                        accentColor={accentColor}
                      />
                    </Box>
                    {chrome.isRefreshing && (
                      <Progress.Root
                        size="xs"
                        value={null}
                        aria-label={labels.loading}
                      >
                        <Progress.Track>
                          <Progress.Range />
                        </Progress.Track>
                      </Progress.Root>
                    )}
                    <FeatureSlot
                      slot={ACTIVE_FILTER_CHIPS}
                      props={{
                        chips: chrome.mergedChips,
                        onClearAll: chrome.clearFilters,
                        labels,
                      }}
                    />
                    {chrome.editing?.batch && (
                      <FeatureSlot
                        slot={BATCH_EDIT_BAR}
                        props={{ batch: chrome.editing.batch, labels }}
                      />
                    )}

                    {table.selection && props.bulkActions && (
                      <FeatureSlot
                        slot={BULK_BAR}
                        props={{
                          selection: table.selection,
                          total: shell.source.total,
                          bulkActions: props.bulkActions,
                          confirm: chrome.confirm,
                          labels,
                        }}
                      />
                    )}
                    <FeatureSlot
                      slot={COMMAND_PALETTE_LIVE}
                      props={{
                        commandPalette: props.commandPalette,
                        labels,
                        onPrint: props.onPrint,
                        onExport: view.toolbarProps.onExportCsv,
                        onClearFilters: chrome.clearFilters,
                        hasFilters: chrome.activeFilterCount > 0,
                        featureHost: shell.featureHost,
                      }}
                    />

                    <OptionalSidePanel
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
                          <FeatureSlot
                            slot={SIDE_PANEL}
                            props={{
                              panels: props.sidePanel.panels,
                              openPanel: props.sidePanel.open,
                              onOpenPanel: props.sidePanel.onOpenChange,
                              onClose: () => {
                                props.sidePanel?.onOpenChange(null);
                              },
                              side: props.sidePanel?.side,
                              labels,
                            }}
                          />
                        )
                      }
                    />
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
                    {props.tableFooter ? (
                      <div data-adapttable-part="table-footer">
                        {props.tableFooter}
                      </div>
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
                  </Stack>
                  {filtersNode && filtersMode === "drawer" && (
                    <FeatureSlot
                      slot={FILTER_DRAWER}
                      props={{
                        open: filtersOpen,
                        onClose: () => setFiltersOpen(false),
                        filters: filtersNode,
                        activeFilterCount: chrome.activeFilterCount,
                        onClearFilters: chrome.clearFilters,
                        labels,
                        dir: props.dir,
                      }}
                    />
                  )}
                  <FeatureSlot
                    slot={STATUS_BAR}
                    props={{
                      enabled: props.statusBar === true,
                      notices: chrome.featureNotices,
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
                </Box>
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
