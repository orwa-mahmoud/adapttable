import type { ColumnDef, Direction } from "@adapttable/core";
import {
  columnHeaderController,
  columnResizeHandleProps,
  resolveColumnHeader,
  tableMinWidth,
} from "@adapttable/core";
import {
  columnFlexShares,
  columnSizeStyle,
  fittedTableStyle,
  pinnedColumnWidth,
  type PinOffset,
  type SharedTableRenderProps,
  sortArrow,
  tableRenderModel,
} from "@adapttable/core/adapter";
import type { CSSProperties, ReactNode } from "react";

import { Table } from "./primitives";

export interface BootstrapDesktopTableProps<
  TRow,
> extends SharedTableRenderProps<TRow> {
  /** Custom CSS class name for the <table> element. */
  className?: string;
  /** Density / size of the table. */
  size?: "sm" | "md" | "lg";
  /** Accent color token or hex. */
  accentColor?: string;
  /** Text direction for RTL support. */
  dir?: Direction;
  /** Explicit actions column pinning. */
  actionsPinned?: boolean;
}

const RESIZE_HANDLE_STYLE: CSSProperties = {
  position: "absolute",
  insetInlineEnd: 0,
  top: 0,
  height: "100%",
  width: "8px",
  cursor: "col-resize",
  touchAction: "none",
  userSelect: "none",
  zIndex: 10,
};

function getPinStyle(
  offset: PinOffset | undefined,
  zIndex: number
): CSSProperties {
  if (!offset) return {};
  const isStart = offset.side === "start";
  return {
    position: "sticky",
    zIndex,
    backgroundColor: "var(--bs-body-bg, #fff)",
    ...(isStart
      ? { insetInlineStart: `${offset.inset}px` }
      : { insetInlineEnd: `${offset.inset}px` }),
  };
}

export function DesktopTable<TRow>(
  props: Readonly<BootstrapDesktopTableProps<TRow>>
) {
  const {
    table,
    rows,
    pinOffset,
    getRowId = table.getRowKey,
    columnWidths,
    setWidth,
    resizeLabel = "Resize column",
    fitColumns,
    className,
    size = "md",
    dir,
  } = props;

  const renderModel = tableRenderModel({
    table,
    rows,
    getRowId,
    pinOffset,
  });

  const columns = renderModel.columns;

  const flexShares = columnFlexShares({
    columns,
    fitColumns,
    widths: columnWidths,
  });

  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
  });

  const getHeaderName = (col: ColumnDef<TRow>): string =>
    typeof col.header === "string" ? col.header : col.key;

  const tableSizeClass = size === "sm" ? "table-sm" : "";

  return (
    <div className="table-responsive" dir={dir}>
      <Table
        responsive={false}
        className={`align-middle mb-0 ${tableSizeClass} ${className ?? ""}`.trim()}
        style={{
          tableLayout: "fixed",
          width: "100%",
          minWidth: minWidth > 0 ? `${minWidth}px` : undefined,
          ...fittedTableStyle(fitColumns),
        }}
      >
        <thead>
          <tr {...table.getHeaderRowProps()}>
            {columns.map((column) => {
              const key = String(column.key);
              const offset = pinOffset?.(column.key);
              const pinStyle = getPinStyle(offset, 2);
              const width = offset
                ? pinnedColumnWidth(column, columnWidths)
                : (columnWidths?.[key] ?? column.width);
              const sizing = columnSizeStyle(
                column,
                flexShares,
                columnWidths?.[key]
              );

              const sortButton = table.getSortButtonProps?.(column);
              const sortClick = sortButton?.onClick;
              const sortIndex = sortButton?.["data-sort-index"];
              const ariaSort = table.getHeaderCellProps(column)["aria-sort"] as
                | "ascending"
                | "descending"
                | "none"
                | undefined;

              const caption = resolveColumnHeader(
                column,
                columnHeaderController(column, {
                  sortIndex:
                    typeof sortIndex === "number" ? sortIndex : undefined,
                  toggleSort: sortClick,
                })
              );

              const actions = column.headerActions ? (
                <span
                  data-adapttable-part="header-actions"
                  className="d-inline-flex align-items-center ms-auto"
                >
                  {column.headerActions as ReactNode}
                </span>
              ) : null;

              return (
                <th
                  key={key}
                  {...table.getHeaderCellProps(column)}
                  aria-sort={ariaSort}
                  style={{
                    position: pinStyle.position ?? "relative",
                    width: width ? `${width}px` : undefined,
                    minWidth: width ? `${width}px` : undefined,
                    boxSizing: "border-box",
                    ...sizing,
                    ...pinStyle,
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between gap-1 pe-2">
                    <div className="d-inline-flex align-items-center gap-1 overflow-hidden text-truncate">
                      {column.sortable && sortClick ? (
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none text-reset fw-bold d-inline-flex align-items-center gap-1 text-truncate"
                          onClick={sortClick}
                          aria-label={`${table.labels.sortBy}: ${getHeaderName(column)}`}
                          title={column.headerTooltip}
                        >
                          <span className="text-truncate">{caption}</span>
                          <span aria-hidden="true">{sortArrow(ariaSort)}</span>
                          {sortIndex !== undefined && (
                            <span
                              aria-hidden="true"
                              data-sort-index={sortIndex}
                              className="badge bg-secondary rounded-pill"
                              style={{ fontSize: "0.7em" }}
                            >
                              {sortIndex}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span
                          className="text-truncate"
                          title={column.headerTooltip}
                        >
                          {caption}
                        </span>
                      )}
                    </div>

                    {actions}
                  </div>

                  {setWidth && (
                    <span
                      data-adapttable-part="column-resize-handle"
                      style={RESIZE_HANDLE_STYLE}
                      {...columnResizeHandleProps(
                        column.key,
                        setWidth,
                        `${resizeLabel}: ${getHeaderName(column)}`
                      )}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={table.getRowKey(row)}
              {...table.getRowProps(row, rowIndex)}
            >
              {columns.map((column) => {
                const key = String(column.key);
                const offset = pinOffset?.(column.key);
                const pinStyle = getPinStyle(offset, 1);
                const width = offset
                  ? pinnedColumnWidth(column, columnWidths)
                  : (columnWidths?.[key] ?? column.width);
                const sizing = columnSizeStyle(
                  column,
                  flexShares,
                  columnWidths?.[key]
                );

                return (
                  <td
                    key={key}
                    {...table.getCellProps(column)}
                    style={{
                      position: pinStyle.position,
                      width: width ? `${width}px` : undefined,
                      minWidth: width ? `${width}px` : undefined,
                      boxSizing: "border-box",
                      ...sizing,
                      ...pinStyle,
                    }}
                  >
                    {table.getCellContent
                      ? table.getCellContent(column, row, rowIndex)
                      : column.accessor?.(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
