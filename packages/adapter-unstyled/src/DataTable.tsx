import { showSimpleFilterFields, type TableSource } from "@adapttable/core";
import {
  ExportAnnouncer,
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
import type { ReactElement, ReactNode, RefObject } from "react";

import { Chips } from "./components/ActiveFilterChips";
import { AutoFilterForm } from "./components/AutoFilterForm";
import { BulkBar } from "./components/BulkActionBar";
import { ColumnMenu } from "./components/ColumnMenu";
import { CommandPalette } from "./components/CommandPalette";
import { ContextMenu } from "./components/ContextMenu";
import { DesktopTable } from "./components/DesktopTable";
import { ErrorState } from "./components/ErrorState";
import { FilterPanel } from "./components/FilterPanel";
import { FilterPopover } from "./components/FilterPopover";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";
import { FiltersIcon, SearchIcon } from "./components/icons";
import { BatchEditBar, FindBar } from "./components/kitControls";
import { MobileCards } from "./components/MobileCards";
import { Footer, RowsPerPageSelect } from "./components/PaginationFooter";
import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { SidePanel } from "./components/SidePanel";
import { StatusBar } from "./components/StatusBar";
import { LoadingState } from "./components/TableSkeleton";
import { cx } from "./cx";
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
 */
export function DataTable<TRow>(props: Readonly<DataTableProps<TRow>>) {
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
  const shell = useDataTableShell<TRow>(props, (defs, source, registry) => (
    <div
      data-adapttable-part="filters-form"
      className={classNames.filtersForm}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <FilterTreeBuilder
        defs={defs}
        source={source}
        labels={props.labels}
        classNames={classNames}
        registry={registry}
        defaultExpanded={!simpleFiltersOn}
      />
      {simpleFiltersOn ? (
        <AutoFilterForm
          defs={defs}
          source={source}
          classNames={classNames}
          labels={props.labels}
          registry={registry}
        />
      ) : null}
    </div>
  ));
  const {
    chrome,
    table,
    labels,
    filtersNode: filters,
    filtersOpen,
    setFiltersOpen,
    filtersTrigger,
    rootRef,
    canLoadMore,
    tableProps: shellTableProps,
  } = shell;
  const stickyBar = useStickyToolbarLayout(
    resolveStickyToolbar(
      props.stickyHeader,
      props.stickyToolbar,
      props.maxHeight != null
    ),
    props.stickyTop ?? 0
  );
  const tableProps = {
    ...shellTableProps,
    stickyTop: stickyBar.headerOffset,
  };
  // Everything rendered below reads the chrome's VIEW facade — identical to
  // the raw source except under grouping, where it presents the full set.
  const viewSource = shell.source;
  // One binding covers headers, rows and cells: the target is resolved from
  // wherever the event started, so there is no third handler to forget.
  const contextMenu = useTableContextMenu<TRow>({
    contextMenu: props.contextMenu,
    columns: chrome.allColumns,
    labels,
    rowFor: (rowId) =>
      viewSource.rows.find((row) => props.rowKey(row) === rowId),
    actions: {
      onCopy: () => {
        shell.gridFocus.copyCells();
      },
      onSort: (key, dir) => {
        viewSource.setSort(key, dir);
      },
      onHide: (key) => {
        chrome.columnLayout.toggleVisible(key);
      },
      onFilter: () => {
        setFiltersOpen(true);
      },
    },
    sortBy: viewSource.sortBy,
    sortDir: viewSource.sortDir,
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
  });
  const chromeProps: ResolvedDataTableProps<TRow> = {
    ...props,
    source: viewSource,
    filters,
  };
  useMountStagger(rootRef, [viewSource.rows.length, chrome.isMobile], {
    enabled: animate,
  });
  // React 18's `ref` attribute rejects core's `RefObject<HTMLDivElement |
  // null>` through interface variance; the same object viewed through its
  // structural shape attaches fine.
  const loadMoreRef: RefObject<HTMLDivElement | null> = shell.loadMoreRef;
  const searchProps = table.getSearchInputProps(
    searchPlaceholder ? { placeholder: searchPlaceholder } : undefined
  );
  // Explicit options win; otherwise auto-derive on mobile, where the card
  // layout has no clickable headers to sort by.
  const sortOptions =
    sortByOptions ?? (chrome.isMobile ? table.sortByOptions : undefined);

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

  // The export button comes from the shell, already single-flight and already
  // carrying the selection, the full column set and the highlighted range. It
  // used to be rebuilt here from the same parts, which is precisely how a new
  // scope can work in seven kits and silently fall back in the eighth.
  const {
    onExportCsv,
    exportBusy,
    exportAnnouncement,
    exportLabel,
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
  } = shell.toolbarProps;

  return (
    <div
      ref={rootRef}
      dir={dir}
      {...contextMenu.regionProps}
      data-adapttable-part="root"
      data-mobile={chrome.isMobile || undefined}
      data-density={density}
      data-refreshing={chrome.isRefreshing || undefined}
      // The root wraps the whole table region, so a background refresh marks
      // it busy for assistive tech (the indicator below is decorative-ish).
      aria-busy={chrome.isRefreshing || undefined}
      className={cx("adapttable", classNames.root)}
    >
      <GridFocusAnnouncer focus={shell.gridFocus} />
      {shell.tableProps.rowReorder ? (
        <RowReorderAnnouncer
          announcement={shell.tableProps.rowReorder.announcement}
        />
      ) : null}
      <FindBar find={shell.find} labels={labels} />
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
            <FilterPopover
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              filters={filters}
              activeFilterCount={chrome.activeFilterCount}
              onClearFilters={chrome.clearFilters}
              labels={labels}
              dir={dir}
              classNames={classNames}
            >
              {filtersButton}
            </FilterPopover>
          ) : (
            filtersButton
          ))}
        {props.savedViews && (
          // The menu must capture/apply through the SAME URL backend and
          // namespace the table reads, so those default from the table's
          // own props (explicit option values still win).
          <SavedViewsMenu
            options={{
              urlAdapter: shell.urlAdapter,
              urlKey: props.urlKey,
              ...props.savedViews,
            }}
            labels={labels}
            classNames={classNames}
          />
        )}
        {props.enableColumnMenu && !chrome.isMobile && (
          <ColumnMenu
            allColumns={chrome.allColumns}
            onAutoSize={shell.autoSizeColumns}
            layout={chrome.columnLayout}
            labels={labels}
            classNames={classNames}
            hasRowActions={shell.hasRowActions}
            hasRowReorder={shell.hasRowReorder}
            onAutoSizeColumn={shell.autoSizeColumn}
            onSortColumn={(key, dir) => viewSource.setSort(key, dir)}
            onFilterColumn={() => shell.setFiltersOpen(true)}
            sortBy={viewSource.sortBy}
            sortDir={viewSource.sortDir}
            dir={dir}
          />
        )}
        {onUndo && onRedo && (
          <>
            <button
              type="button"
              data-adapttable-part="undo-button"
              className={classNames.undoButton}
              disabled={canUndo !== true}
              onClick={onUndo}
            >
              {undoLabel}
            </button>
            <button
              type="button"
              data-adapttable-part="redo-button"
              className={classNames.redoButton}
              disabled={canRedo !== true}
              onClick={onRedo}
            >
              {redoLabel}
            </button>
          </>
        )}
        {onExportCsv && (
          <>
            <button
              type="button"
              data-adapttable-part="export-csv-button"
              className={classNames.exportCsvButton}
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
              onClick={onExportCsv}
              disabled={exportBusy}
              aria-busy={exportBusy}
            >
              {/* No kit to borrow a loading button from, so the affordance is an
                  element the host can style — `aria-hidden` because the
                  announcement below is what a screen reader should hear, not a
                  decoration. */}
              {exportBusy && (
                <span
                  aria-hidden="true"
                  data-adapttable-part="export-spinner"
                  className={classNames.exportSpinner}
                />
              )}
              {exportLabel}
            </button>
            <ExportAnnouncer announcement={exportAnnouncement} />
          </>
        )}
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
        {onPrint && (
          <button
            type="button"
            data-adapttable-part="print-button"
            className={classNames.printButton}
            onClick={onPrint}
          >
            {printLabel}
          </button>
        )}
        {onDensityChange && (
          <button
            type="button"
            aria-label={labels.density}
            data-adapttable-part="density-toggle"
            className={classNames.densityToggle}
            onClick={() => {
              onDensityChange(
                toolbarDensity === "compact" ? "comfortable" : "compact"
              );
            }}
          >
            {toolbarDensity === "compact"
              ? labels.densityCompact
              : labels.densityComfortable}
          </button>
        )}
        {onToggleFullscreen && (
          <button
            type="button"
            aria-label={
              isFullscreen === true
                ? labels.exitFullscreen
                : labels.enterFullscreen
            }
            data-adapttable-part="fullscreen-toggle"
            className={classNames.fullscreenToggle}
            onClick={onToggleFullscreen}
          >
            {isFullscreen === true ? "\u2715" : "\u26f6"}
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
        <FilterPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          activeFilterCount={chrome.activeFilterCount}
          onClearFilters={chrome.clearFilters}
          labels={labels}
          dir={dir}
          classNames={classNames}
        />
      )}

      <Chips
        chips={chrome.mergedChips}
        onClearAll={chrome.clearFilters}
        labels={labels}
        classNames={classNames}
      />

      {chrome.editing?.batch && (
        <BatchEditBar batch={chrome.editing.batch} labels={labels} />
      )}

      {table.selection && bulkActions && (
        <BulkBar
          selection={table.selection}
          total={viewSource.total}
          bulkActions={bulkActions}
          confirm={chrome.confirm}
          labels={labels}
          classNames={classNames}
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

      <CommandPalette
        commands={palette.commands}
        open={palette.open}
        onClose={palette.close}
        labels={labels}
        classNames={classNames}
      />
      <ContextMenu
        items={contextMenu.items}
        at={contextMenu.at}
        onClose={contextMenu.close}
        container={shell.fullscreen.container}
        labels={labels}
        classNames={classNames}
      />
      <SidePanelLayout
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
            <SidePanel
              panels={props.sidePanel.panels}
              openPanel={props.sidePanel.open}
              onOpenPanel={props.sidePanel.onOpenChange}
              onClose={() => {
                props.sidePanel?.onOpenChange(null);
              }}
              side={props.sidePanel.side}
              labels={labels}
              classNames={classNames}
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
      <StatusBar
        enabled={props.statusBar === true}
        notices={chrome.featureNotices}
        shown={viewSource.rows.length}
        page={viewSource.page}
        limit={viewSource.limit}
        total={viewSource.total}
        selected={table.selection?.selectedCount ?? 0}
        stats={shell.selectionStats}
        labels={labels}
        locale={props.locale}
        classNames={classNames}
      />
    </div>
  );
}
