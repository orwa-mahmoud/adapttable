import {
  pageSizeOptions,
  type PaginationInfo,
  type TableLabels,
} from "@adapttable/core";
import { paginationSlots } from "@adapttable/react/adapter";
import { Form, Pagination } from "react-bootstrap";

export function Footer({
  pagination,
  total,
  limit,
  setPage,
  setLimit,
  labels,
  className,
  showRowsPerPage = true,
}: Readonly<{
  pagination: PaginationInfo;
  total: number;
  limit: number;
  setPage: (n: number) => void;
  setLimit: (n: number) => void;
  labels: Required<TableLabels>;
  className?: string;
  showRowsPerPage?: boolean;
}>) {
  const { safePage, totalPages, fromIndex, toIndex } = pagination;

  return (
    <div
      className={`d-flex justify-content-between align-items-center flex-wrap gap-3 ${className ?? ""}`}
    >
      <div className="d-flex align-items-center gap-2">
        {showRowsPerPage && (
          <>
            <span className="small text-body-secondary">
              {labels.rowsPerPage}
            </span>

            <Form.Select
              size="sm"
              aria-label={labels.rowsPerPage}
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ width: "72px" }}
            >
              {pageSizeOptions(limit).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </Form.Select>
          </>
        )}

        {total > 0 && (
          <span className="small text-body-secondary">
            {labels.showing({ from: fromIndex, to: toIndex, total })}
          </span>
        )}
      </div>

      <div className="d-flex align-items-center gap-2">
        <span className="small text-body-secondary">
          {labels.pageOf({ page: safePage, total: totalPages })}
        </span>

        <Pagination size="sm" className="mb-0">
          <Pagination.Prev
            aria-label={labels.previousPage}
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          />

          {paginationSlots(safePage, totalPages).map(({ item, key }) =>
            item === "ellipsis" ? (
              <Pagination.Ellipsis key={key} disabled />
            ) : (
              <Pagination.Item
                key={key}
                active={item === safePage}
                aria-current={item === safePage ? "page" : undefined}
                onClick={() => setPage(item)}
              >
                {item}
              </Pagination.Item>
            )
          )}

          <Pagination.Next
            aria-label={labels.nextPage}
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          />
        </Pagination>
      </div>
    </div>
  );
}
