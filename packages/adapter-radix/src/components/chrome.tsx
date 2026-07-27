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
import {
  Badge,
  Box,
  Button,
  Callout,
  Dialog,
  Flex,
  IconButton,
  Skeleton,
  Text,
  TextField,
  VisuallyHidden,
} from "@radix-ui/themes";
import { isValidElement, type ReactNode } from "react";

import { subtleText } from "../styles";
import type { RadixAccentColor } from "../types";
import { FilterPopover } from "./FilterPopover";
import { NativeSelect, type SelectOption, Tooltip } from "./primitives";

/** Map the page-size numbers to {@link NativeSelect} options. */
function pageSizeSelectOptions(limit: number): SelectOption[] {
  return pageSizeOptions(limit).map((n) => ({
    value: String(n),
    label: String(n),
  }));
}

/** Props for {@link Toolbar}: the shared chrome surface + Radix extras. */
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
  /** Radix accent color for primary accents. */
  accentColor?: RadixAccentColor;
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

/** Removable Radix badge chips. */
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
    <Flex
      asChild
      gap="1"
      wrap="wrap"
      align="center"
      aria-label={labels.filters}
    >
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
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
    </Flex>
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
}: Readonly<BulkBarChromeProps & { accentColor?: RadixAccentColor }>) {
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
                color={(action.color as RadixAccentColor) ?? accentColor}
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
    <Flex
      direction="column"
      gap="2"
      role="status"
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
    </Flex>
  );
}

/** Filters dialog (Radix has no Drawer — a real modal with backdrop + focus trap). */
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
  accentColor?: RadixAccentColor;
  dir?: Direction;
}>) {
  // Radix Themes ships no Drawer primitive, so the drawer is a Dialog restyled
  // into a full-height panel pinned to the inline-end edge (RTL-correct via
  // logical insets) that slides in from that edge — instead of the centered
  // modal Dialog renders by default. Injected as a <style> because keyframes
  // can't be declared inline; the two-class selector + later source order
  // outrank Radix's own centering/animation rules without `!important`.
  const drawerClass = "adapttable-radix-drawer";
  const fromEdge = dir === "rtl" ? "-100%" : "100%";
  const drawerCss = `
.${drawerClass}{position:fixed;inset-block:0;inset-inline-end:0;inset-inline-start:auto;margin:0;width:min(420px,100vw);max-width:none;height:100dvh;max-height:100dvh;border-radius:0;display:flex;flex-direction:column}
.${drawerClass}[data-state="open"]{animation:${drawerClass}-in 220ms cubic-bezier(.32,.72,0,1)}
.${drawerClass}[data-state="closed"]{animation:${drawerClass}-out 200ms cubic-bezier(.32,.72,0,1)}
@keyframes ${drawerClass}-in{from{transform:translateX(${fromEdge})}to{transform:translateX(0)}}
@keyframes ${drawerClass}-out{from{transform:translateX(0)}to{transform:translateX(${fromEdge})}}
@media(prefers-reduced-motion:reduce){.${drawerClass}[data-state]{animation-duration:1ms}}
`;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Content dir={dir} className={drawerClass}>
        <style>{drawerCss}</style>
        <Dialog.Title>{labels.filters}</Dialog.Title>
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
          <Button color={accentColor} onClick={onClose}>
            {labels.filtersDone}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
