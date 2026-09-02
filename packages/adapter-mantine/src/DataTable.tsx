import {
  resolveLabels,
  showSimpleFilterFields,
  type TableLabels,
  type UseSavedViewsOptions,
} from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  AGENT_APPROVAL_STATE,
  BATCH_EDIT_BAR,
  BULK_BAR,
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  COMMAND_PALETTE_LIVE,
  ContextMenuLiveGate,
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
  GROUPING_PANEL,
  type GroupingPanelSlotProps,
  OptionalSidePanel,
  resolveStickyToolbar,
  ROW_REORDER_ANNOUNCER,
  SAVED_VIEWS,
  SIDE_PANEL,
  STATUS_BAR,
  TableStatusAnnouncer,
  useDataTableShell,
  useFeatureState,
  useStickyToolbarLayout,
  useTableFeatures,
} from "@adapttable/core/adapter";
import { Box, Button, Group, Paper, Progress, Stack } from "@mantine/core";
import { useRef } from "react";

import { useMountStagger } from "./animation/useMountStagger";
import { DesktopTable } from "./components/DesktopTable";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { MobileCards } from "./components/MobileCards";
import { PaginationFooter } from "./components/PaginationFooter";
import { TableSkeleton } from "./components/TableSkeleton";
import { Toolbar } from "./components/Toolbar";
import { SURFACE } from "./surface";
import type { DataTableProps } from "./types";

/** The Columns menu, rendered inline in the toolbar — or nothing when off. */
function ColumnMenuSlot<TRow>({
  enabled,
  ...props
}: Readonly<{ enabled: boolean } & ColumnMenuSlotProps<TRow>>) {
  if (!enabled) return null;
  return (
    <FeatureSlot
      slot={COLUMN_MENU}
      props={props as unknown as ColumnMenuSlotProps<never>}
    />
  );
}

/**
 * The Saved-views menu in the toolbar. A component (not inline JSX) so
 * `useSavedViews` only runs when the feature is composed.
 */
function SavedViewsSlot({
  options,
  labels,
}: Readonly<{ options: UseSavedViewsOptions; labels: Required<TableLabels> }>) {
  return <FeatureSlot slot={SAVED_VIEWS} props={{ options, labels }} />;
}

/**
 * Batteries-included Mantine data table. Drop in `columns`, a `rowKey`,
 * and a data tier — raw `data` (frontend), `data` + `onQueryChange`
 * (server), or a prebuilt `source` — to get a fully styled, sortable,
 * filterable, paginated table with selection, bulk actions, RTL, dark
 * mode, and optional entrance animation.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
function DataTableContent<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
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

  // The whole shared orchestration — data tier, filter runtime, chrome,
  // scroll reset, body windowing — lives in core. Mantine adds only what its
  // kit needs: a measured sticky toolbar, per-body stagger refs, and density.
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
    chrome,
    labels,
    density,
    filtersNode: filters,
    filtersOpen: drawerOpened,
    setFiltersOpen: setDrawerOpened,
    filtersTrigger,
    rootRef,
  } = shell;
  const approval = useFeatureState(AGENT_APPROVAL_STATE);
  // One binding covers headers, rows and cells: the target is resolved from
  // wherever the event started, so there is no third handler to forget.

  // The palette lists the table's own actions; its shortcut is bound here
  // so an adapter cannot ship one without the other.
  const { isMobile } = chrome;
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
        } = view;
        const viewSource = view.source;
        const tableProps = { ...view.tableProps, density };
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
          body =
            (chrome.emptyVariant === "noResults"
              ? slots?.noResults
              : undefined) ??
            slots?.empty ??
            (chrome.emptyVariant === "noResults" ? (
              <EmptyState
                title={table.labels.noResults}
                action={
                  <Button
                    variant="light"
                    size="sm"
                    onClick={chrome.clearFilters}
                  >
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
                <Paper
                  {...regionProps}
                  ref={rootRef}
                  p="xs"
                  radius="md"
                  withBorder
                  dir={dir}
                  aria-busy={chrome.isRefreshing || undefined}
                  className={classNames?.root}
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
                    props={{ find: view.find, labels: table.labels }}
                  />
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
                          onFiltersTriggerPointerDown={
                            filtersTrigger.onPointerDown
                          }
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
                              onAutoSize={view.autoSizeColumns}
                              onAutoSizeColumn={view.autoSizeColumn}
                              onSortColumn={(key, dir) =>
                                viewSource.setSort(key, dir)
                              }
                              onFilterColumn={() => setDrawerOpened(true)}
                              onRenameColumn={
                                props.onColumnRename
                                  ? chrome.columnLayout.setName
                                  : undefined
                              }
                              sortBy={viewSource.sortBy}
                              sortDir={viewSource.sortDir}
                              allColumns={chrome.allColumns}
                              layout={chrome.columnLayout}
                              labels={table.labels}
                              hasRowActions={hasRowActions}
                              hasRowReorder={hasRowReorder}
                              groupingPanel={chrome.groupingPanel}
                              dir={dir}
                            />
                          }
                        />
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
                        <FeatureSlot
                          slot={AGENT_APPROVAL}
                          props={{
                            proposals: approval?.proposals,
                            onApprove: approval?.approve ?? (() => undefined),
                            onReject: approval?.reject ?? (() => undefined),
                            labels,
                          }}
                        />

                        {table.selection && bulkActions && (
                          <FeatureSlot
                            slot={BULK_BAR}
                            props={{
                              selection: table.selection,
                              total: shell.source.total,
                              bulkActions,
                              confirm: chrome.confirm,
                              labels,
                            }}
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

                    {view.groupingPanelProps ? (
                      <FeatureSlot
                        slot={GROUPING_PANEL}
                        props={
                          view.groupingPanelProps as GroupingPanelSlotProps<never>
                        }
                      />
                    ) : null}

                    <OptionalSidePanel
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
                      <Box data-adapttable-part="table-footer">
                        {props.tableFooter}
                      </Box>
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
                    <FeatureSlot
                      slot={FILTER_DRAWER}
                      props={{
                        open: drawerOpened,
                        onClose: () => setDrawerOpened(false),
                        filters,
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
