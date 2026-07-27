import {
  type ActiveFilterChip,
  bulkActionErrorMessage,
  type BulkBarChromeProps,
  pageSizeOptions,
  type PaginationInfo,
  paginationSlots,
  resolveDisabledReason,
  type TableLabels,
  type TableSource,
  useBulkActionRunner,
} from "@adapttable/core";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { SR_ONLY } from "./srOnly";

/** Removable filter-chip strip. Renders nothing when empty. */
export function Chips({
  chips,
  onClearAll,
  labels,
  classNames,
}: Readonly<{
  chips: readonly ActiveFilterChip[];
  /** Clear-all handler — always defined (`chrome.clearFilters`). */
  onClearAll: () => void;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
}>) {
  if (chips.length === 0) return null;
  return (
    <ul
      aria-label={labels.filters}
      data-adapttable-part="chips"
      className={classNames.chips}
    >
      {chips.map((chip) => (
        <li
          key={chip.key}
          data-adapttable-part="chip"
          className={classNames.chip}
        >
          {chip.label}
          <button
            type="button"
            aria-label={labels.removeFilter(chip.label)}
            data-adapttable-part="chip-remove"
            className={classNames.chipRemove}
            onClick={chip.onRemove}
          >
            ×
          </button>
        </li>
      ))}
      {/* Clear-all wears the same chip part as its siblings, so consumers
          style it for free and no bare list marker leaks through. */}
      <li data-adapttable-part="chip" className={classNames.chip}>
        <button
          type="button"
          data-adapttable-part="chip-remove"
          className={classNames.chipRemove}
          onClick={onClearAll}
        >
          {labels.clearAll}
        </button>
      </li>
    </ul>
  );
}

/** Selection toolbar with bulk-action buttons. */
export function BulkBar({
  selection,
  total,
  bulkActions,
  confirm,
  labels,
  classNames,
}: Readonly<BulkBarChromeProps & { classNames: DataTableClassNames }>) {
  const {
    selectedIds,
    selectedCount,
    clear,
    headerState,
    visibleIds,
    allMatching,
    selectAllMatching,
  } = selection;
  const { pending, error, run } = useBulkActionRunner({
    confirm,
    cancelLabel: labels.cancel,
    // Clear only on success — a failed run keeps the selection for retry.
    onComplete: (outcome) => {
      if (outcome.status === "success") clear();
    },
  });
  if (selectedCount === 0) return null;
  const errorMessage = bulkActionErrorMessage(error);
  const ids = [...selectedIds];
  // Offer the cross-page scope only when a full page is selected and more
  // rows match elsewhere; once active, actions run against the whole set.
  const showBanner = headerState === "all" && total > visibleIds.length;
  const scope = allMatching ? { allMatching: true, total } : undefined;

  return (
    <div data-adapttable-part="bulk-bar" className={classNames.bulkBar}>
      {/* A live region (implicit status role): selection changes are
          announced without stealing focus — the count was previously
          silent to screen readers. */}
      <output>{labels.selectedCount(selectedCount)}</output>
      {showBanner && (
        <div
          data-adapttable-part="select-all-banner"
          className={classNames.selectAllBanner}
        >
          <span
            data-adapttable-part="select-all-text"
            className={classNames.selectAllText}
          >
            {allMatching
              ? labels.allMatchingSelected(total)
              : labels.pageSelected(visibleIds.length)}
          </span>
          <button
            type="button"
            data-adapttable-part="select-all-button"
            className={classNames.selectAllButton}
            onClick={allMatching ? clear : selectAllMatching}
          >
            {allMatching ? labels.clearAll : labels.selectAllMatching(total)}
          </button>
        </div>
      )}
      <button type="button" onClick={clear} disabled={pending !== null}>
        {labels.clearAll}
      </button>
      {bulkActions.map((action) => {
        const reason = resolveDisabledReason(action.disabledReason?.(ids));
        return (
          <button
            key={action.key}
            type="button"
            title={reason}
            disabled={reason !== undefined || pending !== null}
            data-adapttable-part="bulk-button"
            data-color={action.color}
            className={classNames.bulkButton}
            onClick={() => run(action, ids, scope)}
          >
            {action.icon}
            {action.label}
          </button>
        );
      })}
      {errorMessage !== null && (
        <span
          role="alert"
          data-adapttable-part="bulk-error"
          className={classNames.bulkError}
        >
          {`${labels.errorTitle}: ${errorMessage}`}
        </span>
      )}
    </div>
  );
}

/** The rows-per-page selector shared by the toolbar (infinite) and footer. */
export function RowsPerPageSelect({
  source,
  labels,
  classNames,
}: Readonly<{
  source: Pick<TableSource<unknown>, "limit" | "setLimit">;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
}>) {
  return (
    <label>
      {labels.rowsPerPage}{" "}
      <select
        aria-label={labels.rowsPerPage}
        data-adapttable-part="rows-per-page"
        className={classNames.rowsPerPage}
        value={source.limit}
        onChange={(e) => source.setLimit(Number(e.currentTarget.value))}
      >
        {pageSizeOptions(source.limit).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Prev/next pager with a rows-per-page select. */
export function Footer({
  pagination,
  source,
  labels,
  classNames,
  showRowsPerPage = true,
}: Readonly<{
  pagination: PaginationInfo;
  source: {
    limit: number;
    total: number;
    setPage: (n: number) => void;
    setLimit: (n: number) => void;
  };
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  /** Hidden in the grouped full-set view, where page size has no effect. */
  showRowsPerPage?: boolean;
}>) {
  const { safePage, totalPages, fromIndex, toIndex } = pagination;
  return (
    <div data-adapttable-part="footer" className={classNames.footer}>
      {showRowsPerPage && (
        <RowsPerPageSelect
          source={source}
          labels={labels}
          classNames={classNames}
        />
      )}
      {source.total > 0 && (
        <span>
          {labels.showing({
            from: fromIndex,
            to: toIndex,
            total: source.total,
          })}
        </span>
      )}
      <div data-adapttable-part="pager" className={classNames.pager}>
        <span>{labels.pageOf({ page: safePage, total: totalPages })}</span>
        <button
          type="button"
          aria-label={labels.previousPage}
          data-adapttable-part="page-prev"
          className={classNames.pagePrev}
          disabled={safePage <= 1}
          onClick={() => source.setPage(safePage - 1)}
        >
          ‹
        </button>
        {paginationSlots(safePage, totalPages).map(({ item, key }) =>
          item === "ellipsis" ? (
            <span
              key={key}
              data-adapttable-part="page-ellipsis"
              aria-hidden="true"
              className={classNames.pageEllipsis}
            >
              …
            </span>
          ) : (
            <button
              key={key}
              type="button"
              data-adapttable-part="page-number"
              aria-current={item === safePage ? "page" : undefined}
              className={classNames.pageNumber}
              onClick={() => source.setPage(item)}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          aria-label={labels.nextPage}
          data-adapttable-part="page-next"
          className={classNames.pageNext}
          disabled={safePage >= totalPages}
          onClick={() => source.setPage(safePage + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}

/** Inline error with optional retry. */
export function ErrorState({
  error,
  labels,
  onRetry,
  classNames,
}: Readonly<{
  error: Error;
  labels: Required<TableLabels>;
  onRetry?: () => void;
  classNames: DataTableClassNames;
}>) {
  return (
    <div role="alert" data-adapttable-part="error" className={classNames.error}>
      <strong>{labels.errorTitle}</strong>
      <p>{labels.errorMessage}</p>
      <small>{error.message}</small>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          data-adapttable-part="retry-button"
          className={classNames.retryButton}
        >
          {labels.retry}
        </button>
      )}
    </div>
  );
}

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
