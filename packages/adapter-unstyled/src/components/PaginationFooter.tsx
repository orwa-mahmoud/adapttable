/** Row count and the windowed pager. */
import type {
  PaginationInfo,
  TableLabels,
  TableSource,
} from "@adapttable/core";
import { pageSizeOptions } from "@adapttable/core";
import { paginationSlots } from "@adapttable/react/adapter";

import type { DataTableClassNames } from "../types";

/** The rows-per-page selector shared by the toolbar (infinite) and footer. */
export function RowsPerPageSelect({
  source,
  labels,
  classNames,
}: Readonly<{
  source: Pick<TableSource<unknown>, "limit" | "defaultLimit" | "setLimit">;
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
        {pageSizeOptions([source.limit, source.defaultLimit]).map((n) => (
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
    defaultLimit: number;
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
