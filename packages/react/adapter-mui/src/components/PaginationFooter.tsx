/** Row count and the pager, drawn by the binding with MUI's controls. */
import {
  createPager,
  type KitPagerFrameProps,
  type KitPagesProps,
  type KitRowsPerPageProps,
} from "@adapttable/react/adapter";
import {
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

const ALIGNED = { alignItems: "center" } as const;
const SPREAD = {
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
} as const;

/** Page size and range on the left, the pager on the right. */
function Frame({ rowsPerPage, range, pages }: KitPagerFrameProps) {
  "use no memo";
  return (
    <Stack direction="row" spacing={2} useFlexGap sx={SPREAD}>
      <Stack direction="row" spacing={1.5} useFlexGap sx={ALIGNED}>
        {rowsPerPage}
        {range}
      </Stack>
      {pages}
    </Stack>
  );
}

function Caption({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return (
    <Typography variant="caption" color="text.secondary">
      {children}
    </Typography>
  );
}

const ROWS_PER_PAGE = { minWidth: 132 } as const;

/** The page size as a labelled select field. */
function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitRowsPerPageProps>) {
  "use no memo";
  return (
    <TextField
      select
      size="small"
      label={label}
      value={String(value)}
      onChange={(event) => onValueChange(Number(event.target.value))}
      sx={ROWS_PER_PAGE}
    >
      {options.map((size) => (
        <MenuItem key={size} value={String(size)}>
          {size}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** MUI's own pagination, named in the table's labels. */
function Pages({ page, totalPages, onPageChange, labels }: KitPagesProps) {
  "use no memo";
  return (
    <Pagination
      count={totalPages}
      page={page}
      onChange={(_, next) => onPageChange(next)}
      size="small"
      // Only page items and the previous/next controls render here (no
      // first/last buttons), so the mapping is total.
      getItemAriaLabel={(type, item) => {
        // Page items always carry their page number (null is reserved for
        // ellipsis and control items, which take the other branch).
        if (type === "page") return labels.goToPage(item!);
        return type === "previous" ? labels.previousPage : labels.nextPage;
      }}
    />
  );
}

/** The table's footer: page size, range and the pager. */
export const footer = /* @__PURE__ */ createPager({
  Frame,
  RowsPerPage,
  Caption,
  Pages,
});
