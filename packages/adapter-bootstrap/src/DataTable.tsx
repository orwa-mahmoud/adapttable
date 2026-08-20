import {
  GridFocusAnnouncer,
  RowReorderAnnouncer,
  type TableBodyRegion,
  useDataTableShell,
  useMountStagger,
} from "@adapttable/core/adapter";
import type { ReactNode } from "react";

import { ColumnMenu } from "./components/ColumnMenu";
import { DesktopTable } from "./components/DesktopTable";
import { Footer } from "./components/PaginationFooter";
import { Toolbar } from "./components/Toolbar";
import type { DataTableProps } from "./types";

function renderNoAutoForm() {
  return null;
}

export function DataTable<TRow>(
  props: Readonly<DataTableProps<TRow>>
): ReactNode {
  const { animate = false, slots } = props;
  const { filtersMode = "popover" } = props;

  const size =
    props.size ??
    ((props.density ?? "comfortable") === "compact" ? "sm" : "md");

  const shell = useDataTableShell<TRow>(props, renderNoAutoForm);

  const {
    chrome,
    source,
    table,
    labels,
    toolbarProps,
    filtersOpen,
    filtersTrigger,
    setFiltersOpen,
    rootRef,
    hasRowActions,
    hasRowReorder,
  } = shell;

  const tableProps = {
    ...shell.tableProps,
    size,
    dir: props.dir,
  };

  useMountStagger(rootRef, [source.rows.length, chrome.isMobile], {
    enabled: animate,
  });

  const bodyByRegion: Record<TableBodyRegion, ReactNode> = {
    skeleton: slots?.skeleton ?? (
      <div className="text-center py-5 text-muted">{labels.loading}</div>
    ),
    empty:
      (chrome.emptyVariant === "noResults" ? slots?.noResults : undefined) ??
      slots?.empty ??
      (chrome.emptyVariant === "noResults" ? (
        <div className="d-flex flex-column align-items-center py-5 gap-2">
          <p className="text-muted mb-0">{labels.noResults}</p>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={chrome.clearFilters}
          >
            {labels.clearAll}
          </button>
        </div>
      ) : (
        <p className="text-muted text-center py-5 mb-0">{labels.noData}</p>
      )),
    mobile: (
      <DesktopTable
        {...tableProps}
        prefetch={props.prefetch}
        className={props.classNames?.table}
      />
    ),
    desktop: (
      <DesktopTable
        {...tableProps}
        prefetch={props.prefetch}
        className={props.classNames?.table}
      />
    ),
  };

  return (
    <div
      ref={rootRef}
      dir={props.dir}
      className={`d-flex flex-column gap-3 ${props.classNames?.root ?? ""}`.trim()}
      aria-busy={chrome.isRefreshing || undefined}
    >
      <GridFocusAnnouncer focus={shell.gridFocus} />
      {shell.tableProps.rowReorder ? (
        <RowReorderAnnouncer
          announcement={shell.tableProps.rowReorder.announcement}
        />
      ) : null}

      <Toolbar
        {...toolbarProps}
        className={props.classNames?.toolbar}
        filtersMode={filtersMode}
        filtersOpen={filtersOpen}
        onToggleFilters={filtersTrigger.onClick}
        onFiltersTriggerPointerDown={filtersTrigger.onPointerDown}
        onCloseFilters={() => setFiltersOpen(false)}
        columnMenu={
          props.enableColumnMenu && !chrome.isMobile ? (
            <ColumnMenu
              allColumns={chrome.allColumns}
              layout={chrome.columnLayout}
              labels={labels}
              onAutoSize={shell.autoSizeColumns}
              onAutoSizeColumn={shell.autoSizeColumn}
              onSortColumn={(key, dir) => source.setSort(key, dir)}
              onFilterColumn={() => setFiltersOpen(true)}
              sortBy={source.sortBy}
              sortDir={source.sortDir}
              hasRowActions={hasRowActions}
              hasRowReorder={hasRowReorder}
              dir={props.dir}
            />
          ) : undefined
        }
      />

      {bodyByRegion[chrome.body]}

      {props.tableFooter ? (
        <div data-adapttable-part="table-footer">{props.tableFooter}</div>
      ) : null}

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
    </div>
  );
}
