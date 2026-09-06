/** Row count and the windowed pager. */
import {
  pageSizeOptions,
  type PaginationInfo,
  type TableLabels,
} from "@adapttable/core";
import {
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

/** Paged footer: rows-per-page + range on the left, pager on the right. */
export function Footer({
  pagination,
  total,
  limit,
  defaultLimit = limit,
  setPage,
  setLimit,
  labels,
  showRowsPerPage = true,
}: Readonly<{
  pagination: PaginationInfo;
  total: number;
  limit: number;
  defaultLimit?: number;
  setPage: (n: number) => void;
  setLimit: (n: number) => void;
  labels: Required<TableLabels>;
  /** Hidden in the grouped full-set view, where page size has no effect. */
  showRowsPerPage?: boolean;
}>) {
  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ alignItems: "center" }}
      >
        {showRowsPerPage && (
          <TextField
            select
            size="small"
            label={labels.rowsPerPage}
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            sx={{ minWidth: 132 }}
          >
            {pageSizeOptions([limit, defaultLimit]).map((n) => (
              <MenuItem key={n} value={String(n)}>
                {n}
              </MenuItem>
            ))}
          </TextField>
        )}
        {total > 0 && (
          <Typography variant="caption" color="text.secondary">
            {labels.showing({
              from: pagination.fromIndex,
              to: pagination.toIndex,
              total,
            })}
          </Typography>
        )}
      </Stack>
      <Pagination
        count={pagination.totalPages}
        page={pagination.safePage}
        onChange={(_, page) => setPage(page)}
        size="small"
        // Only page items and the previous/next controls render here
        // (no first/last buttons), so the mapping is total.
        getItemAriaLabel={(type, page) => {
          // Page items always carry their page number (null is reserved
          // for ellipsis/control items, which take the other branch).
          if (type === "page") return labels.goToPage(page!);
          return type === "previous" ? labels.previousPage : labels.nextPage;
        }}
      />
    </Stack>
  );
}
