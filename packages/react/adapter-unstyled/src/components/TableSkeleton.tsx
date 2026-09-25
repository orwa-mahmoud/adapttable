/** Loading skeleton for the table and the card list. */
import type { TableLabels } from "@adapttable/core";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { SR_ONLY } from "./srOnly";

function loadingLineWidth(column: number, total: number): string {
  if (column === 0) return "70%";
  if (column === total - 1) return "42%";
  return "55%";
}

/** Skeleton-ish loading placeholder (semantic, unstyled). */
export function LoadingState({
  rows,
  columns,
  variant,
  labels,
  classNames,
  hasActions = false,
}: Readonly<{
  rows: number;
  columns: number;
  variant: "table" | "cards";
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  hasActions?: boolean;
}>) {
  const rowKeys = Array.from({ length: rows }, (_, i) => i);
  const dataColumns = Math.max(columns, 1);
  const columnCount = dataColumns + (hasActions ? 1 : 0);
  const columnKeys = Array.from({ length: columnCount }, (_, i) => i);
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      data-adapttable-part="loading"
      className={cx(classNames.loading)}
    >
      {variant === "table" ? (
        <table
          data-adapttable-part="loading-table"
          className={classNames.loadingTable}
        >
          <thead>
            <tr
              data-adapttable-part="loading-header-row"
              className={classNames.loadingHeaderRow}
            >
              {columnKeys.map((column) => (
                <th
                  key={column}
                  data-adapttable-part="loading-header-cell"
                  className={classNames.loadingHeaderCell}
                >
                  <span
                    data-adapttable-part="loading-line"
                    className={classNames.loadingLine}
                    style={{ width: loadingLineWidth(column, columnCount) }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((row) => (
              <tr
                key={row}
                data-adapttable-part="loading-row"
                className={classNames.loadingRow}
              >
                {columnKeys.map((column) => (
                  <td
                    key={column}
                    data-adapttable-part="loading-cell"
                    className={classNames.loadingCell}
                  >
                    <span
                      data-adapttable-part="loading-line"
                      className={classNames.loadingLine}
                      style={{
                        width: loadingLineWidth(column, columnCount),
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          data-adapttable-part="loading-cards"
          className={classNames.loadingCards}
        >
          {rowKeys.map((row) => (
            <div
              key={row}
              data-adapttable-part="loading-card"
              className={classNames.loadingCard}
            >
              {columnKeys
                .slice(0, Math.min(4, columnKeys.length))
                .map((column) => (
                  <span
                    key={column}
                    data-adapttable-part="loading-line"
                    className={classNames.loadingLine}
                    style={{
                      width: loadingLineWidth(column, columnKeys.length),
                    }}
                  />
                ))}
            </div>
          ))}
        </div>
      )}
      <span style={SR_ONLY}>{labels.loading}</span>
    </div>
  );
}
