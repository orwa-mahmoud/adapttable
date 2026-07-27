import {
  type ActiveFilterChip,
  bulkActionErrorMessage,
  type BulkBarChromeProps,
  type Direction,
  pageSizeOptions,
  type PaginationInfo,
  resolveDisabledReason,
  type TableLabels,
  type ToolbarChromeProps,
  useBulkActionRunner,
} from "@adapttable/core";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Drawer,
  InputAdornment,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { type ReactNode, useRef } from "react";

import { FilterPopover } from "./FilterPopover";

/** Funnel/filter glyph (currentColor, no icon-lib dependency). */
function FiltersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
    </svg>
  );
}

/** Magnifying-glass glyph for the search field (currentColor, no icon-lib). */
function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Inline equivalent of `@mui/utils` visuallyHidden (avoids an extra dep). */
const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/**
 * Toolbar props: the shared {@link ToolbarChromeProps} plus the filter-container
 * wiring (mode + open/close handlers) so the Filters button can act as either
 * the popover anchor (default) or the drawer trigger.
 */
export interface MuiToolbarProps<TRow> extends ToolbarChromeProps<TRow> {
  /** Which filter container the Filters button drives. */
  filtersMode: "popover" | "drawer";
  /** Filter content (rendered inside the popover when in popover mode). */
  filters?: ReactNode;
  /** Close the filter container (popover mode). */
  onCloseFilters: () => void;
  /** Clear all active filters. */
  onClearFilters: () => void;
}

/** Search field + sort select + filters button + rows-per-page. */
export function Toolbar<TRow>({
  table,
  searchable,
  hideSearch,
  searchPlaceholder,
  sortByOptions,
  toolbar,
  customToolbar,
  hasFilters,
  activeFilterCount,
  showRowsPerPage,
  filtersMode,
  filters,
  filtersOpen,
  onToggleFilters,
  onFiltersTriggerPointerDown,
  onCloseFilters,
  onClearFilters,
  dir,
  columnMenu,
  onExportCsv,
}: Readonly<MuiToolbarProps<TRow>>) {
  const { labels, source } = table;
  const sortOptions =
    sortByOptions ?? (table.isMobile ? table.sortByOptions : undefined);
  const searchProps = table.getSearchInputProps(
    searchPlaceholder ? { placeholder: searchPlaceholder } : undefined
  );
  const filtersAnchorRef = useRef<HTMLButtonElement>(null);

  const filtersButton = hasFilters ? (
    <Badge color="primary" badgeContent={activeFilterCount}>
      <Button
        ref={filtersAnchorRef}
        variant="outlined"
        size="small"
        startIcon={<FiltersIcon />}
        aria-expanded={filtersMode === "popover" ? filtersOpen : undefined}
        onPointerDown={onFiltersTriggerPointerDown}
        onClick={onToggleFilters}
      >
        {labels.filters}
      </Button>
    </Badge>
  ) : null;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {(searchable ?? hideSearch !== true) && (
        <TextField
          size="small"
          value={searchProps.value}
          placeholder={searchProps.placeholder}
          slotProps={{
            htmlInput: { "aria-label": labels.search, type: "search" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          onChange={searchProps.onChange}
          sx={{ flex: 1, minWidth: 160, maxWidth: 360 }}
        />
      )}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: "center", flexWrap: "wrap" }}
      >
        {sortOptions && sortOptions.length > 0 && (
          <TextField
            select
            size="small"
            label={labels.sortBy}
            value={source.sortBy ?? ""}
            onChange={(e) =>
              source.setSort(
                e.target.value || undefined,
                source.sortDir ?? "asc"
              )
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">—</MenuItem>
            {sortOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        {toolbar ?? customToolbar}
        {filtersButton}
        {hasFilters && filtersMode === "popover" && (
          <FilterPopover
            open={filtersOpen}
            onClose={onCloseFilters}
            anchorEl={filtersAnchorRef.current}
            filters={filters}
            activeFilterCount={activeFilterCount}
            onClearFilters={onClearFilters}
            labels={labels}
            dir={dir}
          />
        )}
        {columnMenu}
        {onExportCsv && (
          <Button variant="outlined" size="small" onClick={onExportCsv}>
            {labels.exportCsv}
          </Button>
        )}
        {showRowsPerPage && (
          <TextField
            select
            size="small"
            label={labels.rowsPerPage}
            value={source.limit}
            onChange={(e) => source.setLimit(Number(e.target.value))}
            sx={{ minWidth: 110 }}
          >
            {pageSizeOptions(source.limit).map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
    </Stack>
  );
}

/** Removable MUI chips. */
export function Chips({
  chips,
  onClearAll,
  labels,
}: Readonly<{
  chips: readonly ActiveFilterChip[];
  onClearAll: () => void;
  labels: Required<TableLabels>;
}>) {
  if (chips.length === 0) return null;
  return (
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      component="ul"
      aria-label={labels.filters}
      sx={{ listStyle: "none", p: 0, m: 0, flexWrap: "wrap" }}
    >
      {chips.map((chip) => (
        <li key={chip.key}>
          <Chip
            label={chip.label}
            size="small"
            onDelete={chip.onRemove}
            deleteIcon={
              <span aria-label={`${labels.clearAll}: ${chip.label}`}>×</span>
            }
          />
        </li>
      ))}
      <li>
        <Button size="small" onClick={onClearAll}>
          {labels.clearAll}
        </Button>
      </li>
    </Stack>
  );
}

/** Selection toolbar. */
export function BulkBar({
  selection,
  total,
  bulkActions,
  confirm,
  labels,
}: Readonly<BulkBarChromeProps>) {
  const {
    selectedIds,
    selectedCount,
    headerState,
    visibleIds,
    allMatching,
    selectAllMatching,
    clear,
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
  // Offer "select all N matching" only when the whole page is selected and
  // more rows match beyond it; once active, show the cross-page scope.
  const showBanner = headerState === "all" && total > visibleIds.length;
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: "center", flexWrap: "wrap" }}
      >
        <Typography variant="body2">
          {labels.selectedCount(selectedCount)}
        </Typography>
        {showBanner &&
          (allMatching ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {labels.allMatchingSelected(total)}
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={clear}
                disabled={pending !== null}
              >
                {labels.clearAll}
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {labels.pageSelected(visibleIds.length)}
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={selectAllMatching}
                disabled={pending !== null}
              >
                {labels.selectAllMatching(total)}
              </Button>
            </>
          ))}
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Button
          size="small"
          variant="text"
          onClick={clear}
          disabled={pending !== null}
        >
          {labels.clearAll}
        </Button>
        {bulkActions.map((action) => {
          const reason = resolveDisabledReason(action.disabledReason?.(ids));
          return (
            <Tooltip key={action.key} title={reason ?? ""}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color={action.color as "primary" | undefined}
                  startIcon={action.icon}
                  disabled={reason !== undefined || pending !== null}
                  onClick={() =>
                    run(
                      action,
                      ids,
                      allMatching ? { allMatching: true, total } : undefined
                    )
                  }
                >
                  {action.label}
                </Button>
              </span>
            </Tooltip>
          );
        })}
        {errorMessage !== null && (
          <Typography variant="body2" color="error" role="alert">
            {`${labels.errorTitle}: ${errorMessage}`}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

/** Paged footer: rows-per-page + range on the left, pager on the right. */
export function Footer({
  pagination,
  total,
  limit,
  setPage,
  setLimit,
  labels,
  showRowsPerPage = true,
}: Readonly<{
  pagination: PaginationInfo;
  total: number;
  limit: number;
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
            sx={{ minWidth: 100 }}
          >
            {pageSizeOptions(limit).map((n) => (
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

/** Error alert. */
export function ErrorState({
  error,
  labels,
  onRetry,
}: Readonly<{
  error: Error;
  labels: Required<TableLabels>;
  onRetry?: () => void;
}>) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            {labels.retry}
          </Button>
        ) : undefined
      }
    >
      <strong>{labels.errorTitle}</strong> — {error.message}
    </Alert>
  );
}

/** Skeleton loading placeholder. */
export function LoadingState({
  rows,
  columns,
  loadingLabel,
}: Readonly<{ rows: number; columns: number; loadingLabel?: string }>) {
  return (
    <Box
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="adapttable-loading"
    >
      {Array.from({ length: rows }, (_, r) => (
        <Stack key={r} direction="row" spacing={2} sx={{ py: 1 }}>
          {Array.from({ length: Math.max(columns, 1) }, (_, c) => (
            <Skeleton key={c} variant="text" width={c === 0 ? "30%" : "20%"} />
          ))}
        </Stack>
      ))}
      {loadingLabel ? (
        <Box component="span" sx={srOnly}>
          {loadingLabel}
        </Box>
      ) : null}
    </Box>
  );
}

/** Filters drawer. */
export function FilterDrawer({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  dir = "ltr",
}: Readonly<{
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  onClearFilters: () => void;
  labels: Required<TableLabels>;
  dir?: Direction;
}>) {
  return (
    <Drawer
      anchor={dir === "rtl" ? "left" : "right"}
      open={open}
      onClose={onClose}
      slotProps={{ paper: { "aria-label": labels.filters } }}
    >
      <Box
        sx={{
          width: 360,
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: "100%",
        }}
      >
        <Typography variant="h6">{labels.filters}</Typography>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {filters}
        </Box>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Button onClick={onClearFilters} disabled={activeFilterCount === 0}>
            {labels.clearAll}
          </Button>
          <Button variant="contained" onClick={onClose}>
            {labels.filtersDone}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
