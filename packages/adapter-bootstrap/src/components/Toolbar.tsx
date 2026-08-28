import { pageSizeOptions } from "@adapttable/core";
import {
  ExportAnnouncer,
  type ToolbarChromeProps,
} from "@adapttable/core/adapter";
import { type ReactNode } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

export interface ToolbarProps<TRow> extends ToolbarChromeProps<TRow> {
  filtersMode: "header" | "popover" | "drawer";
  /** The filter fields to render. */
  filters?: ReactNode;
  onCloseFilters: () => void;
  onClearFilters: () => void;
  /** Class for the element. */
  className?: string;
}

export function Toolbar<TRow>({
  table,
  searchable,
  searchPlaceholder,
  sortByOptions,
  toolbar,
  hasFilters,
  activeFilterCount,
  filtersMode,
  //   filters,
  filtersOpen,
  onToggleFilters,
  onFiltersTriggerPointerDown,
  //   onCloseFilters,
  //   onClearFilters,
  savedViewsMenu,
  columnMenu,
  onAddRow,
  addRowLabel,
  onExportCsv,
  exportBusy,
  exportAnnouncement = "",
  exportLabel,
  showRowsPerPage,
  dir,
  className,
}: Readonly<ToolbarProps<TRow>>) {
  const { labels, source } = table;

  const sortOptions =
    sortByOptions ?? (table.isMobile ? table.sortByOptions : undefined);

  const searchProps = table.getSearchInputProps(
    searchPlaceholder ? { placeholder: searchPlaceholder } : undefined
  );

  return (
    <div
      className={`d-flex flex-wrap justify-content-between align-items-center gap-2 ${className ?? ""}`}
      dir={dir}
    >
      {searchable !== false && (
        <Form.Control
          className="flex-grow-1"
          style={{ maxWidth: 360, minWidth: 160 }}
          aria-label={labels.search}
          type="search"
          value={searchProps.value}
          placeholder={searchProps.placeholder}
          onChange={searchProps.onChange}
        />
      )}

      <div className="d-flex flex-wrap align-items-center gap-2">
        {sortOptions && sortOptions.length > 0 && (
          <Form.Select
            size="sm"
            style={{ width: 160 }}
            aria-label={labels.sortBy}
            value={source.sortBy ?? ""}
            onChange={(event) =>
              source.setSort(
                event.target.value || undefined,
                source.sortDir ?? "asc"
              )
            }
          >
            <option value="">{labels.sortBy}</option>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        )}

        {toolbar}

        {hasFilters && (
          <Button
            size="sm"
            variant="outline-secondary"
            aria-expanded={filtersMode === "popover" ? filtersOpen : undefined}
            data-active={filtersOpen || undefined}
            onPointerDown={onFiltersTriggerPointerDown}
            onClick={onToggleFilters}
          >
            {labels.filters}
            {activeFilterCount > 0 && (
              <span className="ms-2 badge rounded-pill text-bg-secondary">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}

        {savedViewsMenu}
        {columnMenu}

        {onExportCsv && (
          <>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={onExportCsv}
              disabled={exportBusy}
              aria-busy={exportBusy}
            >
              {exportLabel}
            </Button>

            <ExportAnnouncer announcement={exportAnnouncement} />
          </>
        )}

        {onAddRow && (
          <Button size="sm" data-adapttable-part="add-row" onClick={onAddRow}>
            {addRowLabel}
          </Button>
        )}

        {showRowsPerPage && (
          <Form.Select
            size="sm"
            style={{ width: 90 }}
            aria-label={labels.rowsPerPage}
            value={source.limit}
            onChange={(event) => source.setLimit(Number(event.target.value))}
          >
            {pageSizeOptions(source.limit).map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Form.Select>
        )}
      </div>
    </div>
  );
}
