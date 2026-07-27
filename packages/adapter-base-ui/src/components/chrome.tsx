import {
  type ActiveFilterChip,
  type BulkBarChromeProps,
  type Direction,
  FiltersIcon,
  pageSizeOptions,
  type PaginationInfo,
  paginationSlots,
  resolveDisabledReason,
  SearchIcon,
  type TableLabels,
  type ToolbarChromeProps,
  useBulkBarState,
} from "@adapttable/core";
import { Drawer } from "@base-ui/react/drawer";
import { isValidElement, type ReactNode } from "react";

import { subtleText } from "../styles";
import type { BaseUiAccentColor } from "../types";
import {
  Badge,
  Box,
  Button,
  Callout,
  Flex,
  IconButton,
  Skeleton,
  Text,
  TextField,
  VisuallyHidden,
} from "../ui";
import { FilterPopover } from "./FilterPopover";
import { NativeSelect, type SelectOption, Tooltip } from "./primitives";

/** Map the page-size numbers to {@link NativeSelect} options. */
function pageSizeSelectOptions(limit: number): SelectOption[] {
  return pageSizeOptions(limit).map((n) => ({
    value: String(n),
    label: String(n),
  }));
}

/** Props for {@link Toolbar}: the shared chrome surface + Base UI extras. */
export interface ToolbarProps<TRow> extends ToolbarChromeProps<TRow> {
  /** Which filter container opens from the Filters button. */
  filtersMode: "popover" | "drawer";
  /** Filter widgets rendered inside the popover container. */
  filters?: ReactNode;
  /** Close the filter popover (Escape / outside click). */
  onCloseFilters: () => void;
  /** Clear-filters handler for the popover header. */
  onClearFilters: () => void;
  /** Built saved-views menu node, when the `savedViews` prop is set. */
  savedViewsMenu?: ReactNode;
  /** Accent color for primary accents. */
  accentColor?: BaseUiAccentColor;
  /** Class hook for the toolbar row. */
  className?: string;
}

/** Search + sort select + filters button + columns menu + rows-per-page. */
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
  filtersMode,
  filters,
  filtersOpen,
  onToggleFilters,
  onFiltersTriggerPointerDown,
  onCloseFilters,
  onClearFilters,
  savedViewsMenu,
  columnMenu,
  onExportCsv,
  showRowsPerPage,
  accentColor,
  dir,
  className,
}: Readonly<ToolbarProps<TRow>>) {
  const { labels, source } = table;
  const sortOptions =
    sortByOptions ?? (table.isMobile ? table.sortByOptions : undefined);
  const searchProps = table.getSearchInputProps(
    searchPlaceholder ? { placeholder: searchPlaceholder } : undefined
  );

  const filtersButton = (
    <Button
      size="2"
      variant="outline"
      color={accentColor}
      aria-expanded={filtersMode === "popover" ? filtersOpen : undefined}
      data-active={filtersOpen || undefined}
      onPointerDown={onFiltersTriggerPointerDown}
      onClick={onToggleFilters}
    >
      <FiltersIcon />
      {labels.filters}
      {activeFilterCount > 0 && (
        <Badge color={accentColor} radius="full">
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <Flex
      gap="2"
      wrap="wrap"
      justify="between"
      align="center"
      className={className}
    >
      {(searchable ?? hideSearch !== true) && (
        <Box style={{ flex: 1, minWidth: 160, maxWidth: 360 }}>
          <TextField.Root
            size="2"
            aria-label={labels.search}
            type="search"
            value={searchProps.value}
            placeholder={searchProps.placeholder}
            onChange={searchProps.onChange}
          >
            <TextField.Slot side="left">
              <SearchIcon />
            </TextField.Slot>
          </TextField.Root>
        </Box>
      )}
      <Flex gap="2" wrap="wrap" align="center">
        {sortOptions && sortOptions.length > 0 && (
          <NativeSelect
            size="2"
            width="160px"
            aria-label={labels.sortBy}
            placeholder={labels.sortBy}
            value={source.sortBy ?? ""}
            options={[
              { value: "", label: labels.sortBy },
              ...sortOptions.map((o) => ({ value: o.value, label: o.label })),
            ]}
            onValueChange={(value) =>
              source.setSort(value || undefined, source.sortDir ?? "asc")
            }
          />
        )}
        {toolbar ?? customToolbar}
        {hasFilters &&
          (filtersMode === "popover" ? (
            <FilterPopover
              open={filtersOpen}
              onClose={onCloseFilters}
              filters={filters}
              activeFilterCount={activeFilterCount}
              onClearFilters={onClearFilters}
              labels={labels}
              accentColor={accentColor}
              dir={dir}
            >
              {filtersButton}
            </FilterPopover>
          ) : (
            filtersButton
          ))}
        {savedViewsMenu}
        {columnMenu}
        {onExportCsv && (
          <Button
            size="2"
            variant="outline"
            color={accentColor}
            onClick={onExportCsv}
          >
            {labels.exportCsv}
          </Button>
        )}
        {showRowsPerPage && (
          <NativeSelect
            size="2"
            width="90px"
            aria-label={labels.rowsPerPage}
            value={String(source.limit)}
            options={pageSizeSelectOptions(source.limit)}
            onValueChange={(value) => source.setLimit(Number(value))}
          />
        )}
      </Flex>
    </Flex>
  );
}

/** Removable badge chips. */
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
    <ul
      aria-label={labels.filters}
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.25rem",
      }}
    >
      {chips.map((chip) => (
        <li key={chip.key}>
          <Badge size="2" radius="full">
            {chip.label}
            <IconButton
              size="1"
              variant="ghost"
              radius="full"
              color="gray"
              aria-label={`${labels.clearAll}: ${chip.label}`}
              onClick={chip.onRemove}
            >
              ×
            </IconButton>
          </Badge>
        </li>
      ))}
      <li>
        <Button size="1" variant="ghost" onClick={onClearAll}>
          {labels.clearAll}
        </Button>
      </li>
    </ul>
  );
}

/** Selection toolbar. */
export function BulkBar({
  selection,
  total,
  bulkActions,
  confirm,
  labels,
  accentColor,
}: Readonly<BulkBarChromeProps & { accentColor?: BaseUiAccentColor }>) {
  const {
    selectedCount,
    ids,
    pending,
    errorMessage,
    run,
    clear,
    expandable,
    scope,
    banner,
  } = useBulkBarState({ selection, total, confirm, labels });
  if (selectedCount === 0) return null;
  return (
    <Flex gap="2" justify="between" wrap="wrap" align="center">
      {expandable ? (
        <Flex gap="2" wrap="wrap" align="center">
          <Text size="2">{banner.text}</Text>
          <Button
            size="1"
            variant="ghost"
            color={accentColor}
            disabled={pending !== null}
            onClick={banner.onClick}
          >
            {banner.action}
          </Button>
        </Flex>
      ) : (
        <Text size="2">{labels.selectedCount(selectedCount)}</Text>
      )}
      <Flex gap="2" wrap="wrap" align="center">
        <Button
          size="1"
          variant="ghost"
          color="gray"
          onClick={clear}
          disabled={pending !== null}
        >
          {labels.clearAll}
        </Button>
        {bulkActions.map((action) => {
          const reason = resolveDisabledReason(action.disabledReason?.(ids));
          return (
            <Tooltip key={action.key} label={reason ?? ""} disabled={!reason}>
              <Button
                size="1"
                color={action.color ?? accentColor}
                disabled={reason !== undefined || pending !== null}
                onClick={() => run(action, ids, scope)}
              >
                {isValidElement(action.icon) ? action.icon : null}
                {action.label}
              </Button>
            </Tooltip>
          );
        })}
        {errorMessage !== null && (
          <Text size="2" color="red" role="alert">
            {`${labels.errorTitle}: ${errorMessage}`}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}

/** Paged footer with numbered page buttons. */
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
  /** Class hook for the footer row. */
  className?: string;
  /** Hidden in the grouped full-set view, where page size has no effect. */
  showRowsPerPage?: boolean;
}>) {
  const { safePage, totalPages, fromIndex, toIndex } = pagination;
  return (
    <Flex
      gap="3"
      justify="between"
      wrap="wrap"
      align="center"
      className={className}
    >
      <Flex gap="2" align="center">
        {showRowsPerPage && (
          <>
            <Text size="1" {...subtleText}>
              {labels.rowsPerPage}
            </Text>
            <NativeSelect
              size="1"
              width="72px"
              aria-label={labels.rowsPerPage}
              value={String(limit)}
              options={pageSizeSelectOptions(limit)}
              onValueChange={(value) => setLimit(Number(value))}
            />
          </>
        )}
        {total > 0 && (
          <Text size="1" {...subtleText}>
            {labels.showing({ from: fromIndex, to: toIndex, total })}
          </Text>
        )}
      </Flex>
      <Flex gap="1" align="center">
        <Text size="1" {...subtleText}>
          {labels.pageOf({ page: safePage, total: totalPages })}
        </Text>
        <Button
          size="1"
          variant="soft"
          color="gray"
          aria-label={labels.previousPage}
          disabled={safePage <= 1}
          onClick={() => setPage(safePage - 1)}
        >
          ‹
        </Button>
        {paginationSlots(safePage, totalPages).map(({ item, key }) =>
          item === "ellipsis" ? (
            <Text
              key={key}
              size="1"
              {...subtleText}
              style={{ paddingInline: "var(--space-1)" }}
            >
              …
            </Text>
          ) : (
            <Button
              key={key}
              size="1"
              variant={item === safePage ? "solid" : "soft"}
              aria-current={item === safePage ? "page" : undefined}
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          )
        )}
        <Button
          size="1"
          variant="soft"
          color="gray"
          aria-label={labels.nextPage}
          disabled={safePage >= totalPages}
          onClick={() => setPage(safePage + 1)}
        >
          ›
        </Button>
      </Flex>
    </Flex>
  );
}

/** Error callout with retry. */
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
    <Callout.Root color="red" role="alert">
      <Callout.Text>
        <Text weight="bold">{labels.errorTitle}</Text> — {error.message}
      </Callout.Text>
      {onRetry && (
        <Box mt="2">
          <Button size="1" color="red" variant="soft" onClick={onRetry}>
            {labels.retry}
          </Button>
        </Box>
      )}
    </Callout.Root>
  );
}

/** Skeleton loading rows. */
export function LoadingState({
  rows,
  columns,
  loadingLabel,
}: Readonly<{ rows: number; columns: number; loadingLabel?: string }>) {
  return (
    <output
      className="adapttable-flex"
      style={{ flexDirection: "column", gap: "0.5rem", display: "flex" }}
      aria-busy="true"
      aria-live="polite"
      data-testid="adapttable-loading"
    >
      {Array.from({ length: rows }, (_, r) => (
        <Flex key={r} gap="4">
          {Array.from({ length: Math.max(columns, 1) }, (_, c) => (
            <Skeleton key={c} height="14px" width={c === 0 ? "30%" : "20%"} />
          ))}
        </Flex>
      ))}
      {loadingLabel ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </output>
  );
}

/** Filters drawer — Base UI Drawer pinned to the inline-end edge. */
export function FilterDrawer({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  accentColor,
  dir = "ltr",
}: Readonly<{
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  onClearFilters: () => void;
  labels: Required<TableLabels>;
  accentColor?: BaseUiAccentColor;
  dir?: Direction;
}>) {
  return (
    <Drawer.Root
      open={open}
      swipeDirection={dir === "rtl" ? "left" : "right"}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop
          className="adapttable-drawer-backdrop"
          data-testid="adapttable-filter-drawer-backdrop"
        />
        <Drawer.Viewport>
          <Drawer.Popup className="adapttable-drawer" dir={dir}>
            <Drawer.Content>
              <Drawer.Title className="adapttable-drawer-title">
                {labels.filters}
              </Drawer.Title>
              <Flex
                direction="column"
                gap="4"
                mt="3"
                style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
              >
                {filters}
              </Flex>
              <Flex justify="between" mt="4">
                <Button
                  variant="ghost"
                  color="gray"
                  onClick={onClearFilters}
                  disabled={activeFilterCount === 0}
                >
                  {labels.clearAll}
                </Button>
                <Button color={accentColor} variant="solid" onClick={onClose}>
                  {labels.applyFilters}
                </Button>
              </Flex>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
