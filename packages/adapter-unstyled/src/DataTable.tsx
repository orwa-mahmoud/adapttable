import {
  resolveLabels,
  showSimpleFilterFields,
  type TableSource,
} from "@adapttable/core";
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
  FILTER_POPOVER,
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
  TOOLBAR_EXTRAS,
  useDataTableShell,
  useMountStagger,
  useStickyToolbarLayout,
  useTableFeatures,
} from "@adapttable/core/adapter";
import type { ReactElement, ReactNode, RefObject } from "react";

import { ClassNamesProvider } from "./components/classNamesContext";
import { DesktopTable } from "./components/DesktopTable";
import { ErrorState } from "./components/ErrorState";
import { FiltersIcon, SearchIcon } from "./components/icons";
import { MobileCards } from "./components/MobileCards";
import { Footer, RowsPerPageSelect } from "./components/PaginationFooter";
import { LoadingState } from "./components/TableSkeleton";
import { cx } from "./cx";
import { ContextMenuLiveGate, OptionalSidePanel } from "./featureRoot";
import type { DataTableClassNames, DataTableProps } from "./types";

// A stable default: the memoized desktop rows compare `classNames` by
// identity, so an inline `{}` default would defeat them on every render.
const NO_CLASSNAMES: DataTableClassNames = {};

/**
 * `DataTableProps` after tier resolution: the source is definite (whichever
 * tier provided it) and `filters` is plain JSX (the auto-built form when the
 * caller passed the declarative array).
 */
type ResolvedDataTableProps<TRow> = Omit<
  DataTableProps<TRow>,
  "source" | "filters"
> & {
  source: TableSource<TRow>;
  filters?: ReactNode;
};

/** The shell's return shape, derived so no extra public type is needed. */
type ShellResult<TRow> = ReturnType<typeof useDataTableShell<TRow>>;

interface DataTableBodyProps<TRow> {
  chrome: ShellResult<TRow>["chrome"];
  props: Readonly<ResolvedDataTableProps<TRow>>;
  classNames: NonNullable<DataTableProps<TRow>["classNames"]>;
  labels: ShellResult<TRow>["labels"];
  /** The shell's kit-agnostic render bundle, spread straight onto the renderer. */
  tableProps: ShellResult<TRow>["tableProps"];
}

function DataTableBody<TRow>({
  chrome,
  props,
  classNames,
  labels,
  tableProps,
}: Readonly<DataTableBodyProps<TRow>>): ReactElement {
  // The shell already applied the column layout to the injected actions
  // column: hidden strips `rowActions` before the renderers, an end pin sets
  // `actionsPinned`.
  const rowActions = tableProps.rowActions;
  if (chrome.body === "skeleton") {
    return (
      <>
        {props.slots?.skeleton ?? (
          <LoadingState
            rows={props.skeletonRows ?? props.source.limit}
            columns={chrome.table.columns.length}
            variant={chrome.isMobile ? "cards" : "table"}
            labels={labels}
            classNames={classNames}
            hasActions={(rowActions?.length ?? 0) > 0}
          />
        )}
      </>
    );
  }
  if (chrome.body === "empty") {
    // "noResults" means an active search/filter matched nothing — say so and
    // offer a clear CTA; "noData" means the source itself is empty.
    const noResults = chrome.emptyVariant === "noResults";
    return (
      <>
        {(noResults ? props.slots?.noResults : undefined) ??
          props.slots?.empty ?? (
            <output data-adapttable-part="empty" className={classNames.empty}>
              {noResults ? labels.noResults : labels.noData}
              {noResults && (
                <button
                  type="button"
                  data-adapttable-part="empty-clear"
                  className={classNames.emptyClear}
                  onClick={chrome.clearFilters}
                >
                  {labels.clearAll}
                </button>
              )}
            </output>
          )}
      </>
    );
  }
  const Renderer = chrome.isMobile ? MobileCards : DesktopTable;
  return <Renderer {...tableProps} classNames={classNames} />;
}

/**
 * Headless, unstyled AdaptTable for Tailwind / shadcn / custom CSS. Renders
 * semantic HTML with `data-adapttable-part` hooks and `className` overrides;
 * ships no styles of its own. Built on the `@adapttable/core` prop-getters.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
function DataTableContent<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  const {
    searchPlaceholder,
    sortByOptions,
    dir,
    filtersMode = "popover",
    bulkActions,
    classNames = NO_CLASSNAMES,
    toolbar,
    toolbarSlots,
    animate = false,
  } = props;

  const density = props.density ?? "comfortable";

  // The whole shared orchestration — data tier, filter runtime, chrome,
  // scroll reset, body windowing — lives in core's shell; this file renders
  // only semantic markup with class hooks over it.
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
    table,
    labels,
    filtersNode: filters,
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
  // One binding covers headers, rows and cells: the target is resolved from
  // wherever the event started, so there is no third handler to forget.

  // The palette lists the table's own actions; its shortcut is bound here
  // so an adapter cannot ship one without the other.
  const chromeProps: ResolvedDataTableProps<TRow> = {
    ...props,
    source: viewSource,
    filters,
  };
  useMountStagger(rootRef, [viewSource.rows.length, chrome.isMobile], {
    enabled: animate,
  });
  const searchProps = table.getSearchInputProps(
    searchPlaceholder ? { placeholder: searchPlaceholder } : undefined
  );
  // Explicit options win; otherwise auto-derive on mobile, where the card
  // layout has no clickable headers to sort by.
  const sortOptions =
    sortByOptions ?? (chrome.isMobile ? table.sortByOptions : undefined);

  // The export button comes from the shell, already single-flight and already
  // carrying the selection, the full column set and the highlighted range. It
  // used to be rebuilt here from the same parts, which is precisely how a new
  // scope can work in seven kits and silently fall back in the eighth.
  return (
    <DataTableShellView shell={shell}>
      {(view) => {
        const chrome = view.chrome;
        const table = view.table;
        const viewSource = view.source;
        const {
          onExportCsv,
          exportBusy,
          exportAnnouncement,
          exportLabel,
          exportDisabled,
          exportDisabledReason,
          onAddRow,
          addRowLabel,
          onUndo,
          onRedo,
          density: toolbarDensity,
          onDensityChange,
          onToggleFullscreen,
          isFullscreen,
          canUndo,
          canRedo,
          undoLabel,
          redoLabel,
          onPrint,
          printLabel,
        } = view.toolbarProps;
        const canLoadMore = view.canLoadMore;
        // React 18's `ref` attribute rejects core's `RefObject<HTMLDivElement |
        // null>` through interface variance; the same object viewed through its
        // structural shape attaches fine.
        const loadMoreRef: RefObject<HTMLDivElement | null> = view.loadMoreRef;
        const tableProps = {
          ...view.tableProps,
          stickyTop: stickyBar.headerOffset,
        };
        const filtersButton = (
          <button
            type="button"
            aria-expanded={filtersMode === "popover" ? filtersOpen : undefined}
            data-active={filtersOpen || undefined}
            data-adapttable-part="filters-button"
            className={classNames.filtersButton}
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            onPointerDown={filtersTrigger.onPointerDown}
            onClick={filtersTrigger.onClick}
          >
            <span
              data-adapttable-part="filters-icon"
              className={classNames.filtersIcon}
              style={{ display: "inline-flex" }}
            >
              <FiltersIcon />
            </span>
            {labels.filters}
            {chrome.activeFilterCount > 0 && (
              <span
                data-adapttable-part="filters-count"
                className={classNames.filtersCount}
              >
                {chrome.activeFilterCount}
              </span>
            )}
          </button>
        );
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
                <div
                  ref={rootRef}
                  dir={dir}
                  {...regionProps}
                  data-adapttable-part="root"
                  data-mobile={chrome.isMobile || undefined}
                  data-density={density}
                  data-refreshing={chrome.isRefreshing || undefined}
                  // The root wraps the whole table region, so a background refresh marks
                  // it busy for assistive tech (the indicator below is decorative-ish).
                  aria-busy={chrome.isRefreshing || undefined}
                  className={cx("adapttable", classNames.root)}
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
                  <div
                    data-adapttable-part="toolbar"
                    ref={stickyBar.toolbarRef}
                    className={classNames.toolbar}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      rowGap: 8,
                      ...stickyBar.toolbarStyle,
                    }}
                  >
                    {toolbarSlots?.start}
                    {props.searchable !== false && (
                      <span
                        data-adapttable-part="search-field"
                        className={classNames.searchField}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        <span
                          data-adapttable-part="search-icon"
                          className={classNames.searchIcon}
                          style={{ display: "inline-flex" }}
                        >
                          <SearchIcon size={14} />
                        </span>
                        <input
                          {...searchProps}
                          data-adapttable-part="search"
                          className={classNames.search}
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      </span>
                    )}
                    {sortOptions && sortOptions.length > 0 && (
                      <label>
                        {labels.sortBy}{" "}
                        <select
                          aria-label={labels.sortBy}
                          data-adapttable-part="sort-select"
                          className={classNames.sortSelect}
                          value={viewSource.sortBy ?? ""}
                          onChange={(e) =>
                            viewSource.setSort(
                              e.currentTarget.value || undefined,
                              viewSource.sortDir ?? "asc"
                            )
                          }
                        >
                          <option value="">—</option>
                          {sortOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {toolbar}
                    {filters &&
                      (filtersMode === "popover" ? (
                        <FeatureSlot
                          slot={FILTER_POPOVER}
                          props={{
                            open: filtersOpen,
                            onClose: () => setFiltersOpen(false),
                            filters,
                            activeFilterCount: chrome.activeFilterCount,
                            onClearFilters: chrome.clearFilters,
                            labels,
                            dir,
                            children: filtersButton,
                          }}
                        />
                      ) : (
                        filtersButton
                      ))}
                    {props.savedViews && (
                      // The menu must capture/apply through the SAME URL backend and
                      // namespace the table reads, so those default from the table's
                      // own props (explicit option values still win).
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
                    )}
                    {props.enableColumnMenu && !chrome.isMobile && (
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
                            hasRowActions: view.hasRowActions,
                            hasRowReorder: view.hasRowReorder,
                            dir: props.dir,
                          } as ColumnMenuSlotProps<never>
                        }
                      />
                    )}
                    <FeatureSlot
                      slot={TOOLBAR_EXTRAS}
                      props={{
                        onUndo,
                        onRedo,
                        canUndo,
                        canRedo,
                        undoLabel,
                        redoLabel,
                        onPrint,
                        printLabel,
                        density: toolbarDensity,
                        onDensityChange,
                        onToggleFullscreen,
                        isFullscreen,
                        onExportCsv,
                        exportBusy,
                        exportAnnouncement,
                        exportLabel,
                        exportDisabled,
                        exportDisabledReason,
                        // A plain object, because the kit's class map is an
                        // interface and the slot takes any kit's map.
                        classNames: { ...classNames },
                        labels,
                      }}
                    />
                    {onAddRow && (
                      <button
                        type="button"
                        data-adapttable-part="add-row"
                        className={classNames.addRow}
                        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                        onClick={onAddRow}
                      >
                        {addRowLabel}
                      </button>
                    )}
                    {toolbarSlots?.end}
                    {canLoadMore && !chrome.grouping && (
                      <RowsPerPageSelect
                        source={viewSource}
                        labels={labels}
                        classNames={classNames}
                      />
                    )}
                  </div>

                  {filters && filtersMode === "drawer" && (
                    <FeatureSlot
                      slot={FILTER_DRAWER}
                      props={{
                        open: filtersOpen,
                        onClose: () => setFiltersOpen(false),
                        filters: filters,
                        activeFilterCount: chrome.activeFilterCount,
                        onClearFilters: chrome.clearFilters,
                        labels,
                        dir: props.dir,
                      }}
                    />
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

                  {table.selection && bulkActions && (
                    <FeatureSlot
                      slot={BULK_BAR}
                      props={{
                        selection: table.selection,
                        total: shell.source.total,
                        bulkActions: bulkActions,
                        confirm: chrome.confirm,
                        labels,
                      }}
                    />
                  )}

                  {chrome.isRefreshing && (
                    // Native indeterminate progress (no `value`) — implicit progressbar
                    // role with correct semantics on every device.
                    <progress
                      aria-label={labels.loading}
                      data-adapttable-part="refresh-indicator"
                      className={classNames.refreshIndicator}
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
                        {chrome.errorState ? (
                          (fillSlot(props.slots?.error, chrome.errorState) ?? (
                            <ErrorState
                              error={chrome.errorState.error}
                              labels={labels}
                              onRetry={chrome.errorState.retry}
                              classNames={classNames}
                            />
                          ))
                        ) : (
                          <DataTableBody
                            chrome={chrome}
                            props={chromeProps}
                            classNames={classNames}
                            labels={labels}
                            tableProps={tableProps}
                          />
                        )}
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
                    <div
                      ref={loadMoreRef}
                      data-adapttable-part="load-more"
                      className={classNames.loadMore}
                    >
                      <button
                        type="button"
                        disabled={viewSource.isFetchingNextPage}
                        data-adapttable-part="load-more-button"
                        className={classNames.loadMoreButton}
                        onClick={() => viewSource.fetchNextPage()}
                      >
                        {labels.loadMore}
                      </button>
                    </div>
                  )}

                  {props.tableFooter ? (
                    <div
                      data-adapttable-part="table-footer"
                      className={classNames.tableFooter}
                    >
                      {props.tableFooter}
                    </div>
                  ) : null}

                  {chrome.showFooter && (
                    <Footer
                      pagination={table.pagination}
                      source={viewSource}
                      labels={labels}
                      classNames={classNames}
                      showRowsPerPage={!chrome.grouping}
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
                </div>
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
    <ClassNamesProvider classNames={incoming.classNames}>
      <FeatureProviders props={props}>
        <DataTableContent<TRow> {...props} />
      </FeatureProviders>
    </ClassNamesProvider>
  );
}
