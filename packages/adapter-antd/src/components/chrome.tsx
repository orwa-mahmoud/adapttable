import {
  type ActiveFilterChip,
  bulkActionErrorMessage,
  type BulkBarChromeProps,
  type Direction,
  pageSizeOptions,
  type TableLabels,
  type ToolbarChromeProps,
  useBulkActionRunner,
} from "@adapttable/core";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Flex,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import type { ReactNode } from "react";

import { isDangerColor } from "../colors";
import { FiltersIcon, SearchIcon } from "../icons";
import { FilterPopover } from "./FilterPopover";

/** Extra toolbar props for threading the filter container's open/close wiring. */
export interface ToolbarProps<TRow> extends ToolbarChromeProps<TRow> {
  /** Filter content (anchored popover or drawer). */
  filters?: ReactNode;
  /** The saved-views menu trigger, when the `savedViews` prop opts in. */
  savedViewsMenu?: ReactNode;
  /** Whether to anchor a popover or open the drawer. */
  filtersMode: "popover" | "drawer";
  /** Close the filter container. */
  onCloseFilters: () => void;
  /** Clear every active filter (always wired — falls back to `clearExtras`). */
  onClearFilters: () => void;
  /** Show the subtle background-refresh spinner in the toolbar. */
  isRefreshing: boolean;
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
  filters,
  filtersMode,
  filtersOpen,
  onToggleFilters,
  onFiltersTriggerPointerDown,
  onCloseFilters,
  onClearFilters,
  isRefreshing,
  dir,
  columnMenu,
  onExportCsv,
  savedViewsMenu,
  showRowsPerPage,
}: Readonly<ToolbarProps<TRow>>) {
  const { labels, source } = table;
  const sortOptions =
    sortByOptions ?? (table.isMobile ? table.sortByOptions : undefined);
  const searchProps = table.getSearchInputProps(
    searchPlaceholder ? { placeholder: searchPlaceholder } : undefined
  );

  const filtersButton = (
    <Badge count={activeFilterCount} size="small">
      <Button
        icon={<FiltersIcon size={16} />}
        aria-expanded={filtersMode === "popover" ? filtersOpen : undefined}
        data-active={filtersOpen || undefined}
        onPointerDown={onFiltersTriggerPointerDown}
        onClick={onToggleFilters}
      >
        {labels.filters}
      </Button>
    </Badge>
  );

  return (
    <Flex gap="small" wrap align="center" justify="space-between">
      {(searchable ?? hideSearch !== true) && (
        <Input
          type="search"
          allowClear
          prefix={<SearchIcon size={14} />}
          style={{ flex: 1, minWidth: 160, maxWidth: 360 }}
          aria-label={labels.search}
          value={searchProps.value}
          placeholder={searchProps.placeholder}
          onChange={searchProps.onChange}
        />
      )}
      <Flex gap="small" wrap align="center">
        {isRefreshing && <Spin size="small" aria-label={labels.loading} />}
        {sortOptions && sortOptions.length > 0 && (
          <Select
            style={{ minWidth: 160 }}
            aria-label={labels.sortBy}
            placeholder={labels.sortBy}
            allowClear
            value={source.sortBy ?? undefined}
            options={sortOptions.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            onChange={(value?: string) =>
              source.setSort(value, source.sortDir ?? "asc")
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
              dir={dir}
            >
              {filtersButton}
            </FilterPopover>
          ) : (
            filtersButton
          ))}
        {columnMenu}
        {onExportCsv && (
          <Button onClick={onExportCsv}>{labels.exportCsv}</Button>
        )}
        {savedViewsMenu}
        {showRowsPerPage && (
          <Select
            style={{ minWidth: 110 }}
            aria-label={labels.rowsPerPage}
            value={source.limit}
            options={pageSizeOptions(source.limit).map((n) => ({
              value: n,
              label: String(n),
            }))}
            onChange={(value: number) => source.setLimit(value)}
          />
        )}
      </Flex>
    </Flex>
  );
}

/** Removable antd tag chips. */
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
      gap={4}
      wrap
      align="center"
      component="ul"
      aria-label={labels.filters}
    >
      {chips.map((chip) => (
        <li key={chip.key} style={{ listStyle: "none" }}>
          <Tag closable onClose={chip.onRemove} aria-label={chip.label}>
            {chip.label}
          </Tag>
        </li>
      ))}
      <li style={{ listStyle: "none" }}>
        <Button size="small" type="link" onClick={onClearAll}>
          {labels.clearAll}
        </Button>
      </li>
    </Flex>
  );
}

/**
 * One state of the cross-page selection banner: a status text plus an
 * inline link widening the scope ("select all N matching") or backing out
 * of it ("clear all").
 */
function bannerLine(
  text: string,
  actionLabel: string,
  onClick: () => void,
  disabled: boolean
) {
  return (
    <Space size={4} wrap>
      <Typography.Text>{text}</Typography.Text>
      <Button size="small" type="link" disabled={disabled} onClick={onClick}>
        {actionLabel}
      </Button>
    </Space>
  );
}

/**
 * Selection bar, rendered with antd's idiomatic `Alert` + `action` slot
 * (the pattern antd's own Table docs use for batch operations). When a
 * full page is selected and more rows match on other pages, the message
 * becomes a two-state banner: offer "select all N matching", then report
 * the widened scope — bulk actions run with `allMatching` so the backend
 * can act on the whole filtered set.
 */
export function BulkBar(props: Readonly<BulkBarChromeProps>) {
  const { selection, total, bulkActions, confirm, labels } = props;
  const runner = useBulkActionRunner({
    confirm,
    cancelLabel: labels.cancel,
    // Clear only on success — a failed run keeps the selection for retry.
    onComplete: (outcome) => {
      if (outcome.status === "success") selection.clear();
    },
  });
  if (selection.selectedCount === 0) return null;
  const errorMessage = bulkActionErrorMessage(runner.error);
  const ids = [...selection.selectedIds];
  const busy = runner.pending !== null;
  const crossPage =
    selection.headerState === "all" && total > selection.visibleIds.length;
  const context = selection.allMatching
    ? { allMatching: true, total }
    : undefined;
  let message: ReactNode = labels.selectedCount(selection.selectedCount);
  if (crossPage) {
    message = selection.allMatching
      ? bannerLine(
          labels.allMatchingSelected(total),
          labels.clearAll,
          selection.clear,
          busy
        )
      : bannerLine(
          labels.pageSelected(selection.visibleIds.length),
          labels.selectAllMatching(total),
          selection.selectAllMatching,
          busy
        );
  }
  return (
    <Alert
      type={errorMessage === null ? "info" : "error"}
      banner
      title={message}
      description={
        errorMessage === null ? undefined : (
          <span role="alert">{`${labels.errorTitle}: ${errorMessage}`}</span>
        )
      }
      action={
        <Space size="small" wrap>
          <Button
            size="small"
            type="text"
            disabled={busy}
            onClick={selection.clear}
          >
            {labels.clearAll}
          </Button>
          {bulkActions.map((action) => (
            <Button
              key={action.key}
              size="small"
              type="primary"
              danger={isDangerColor(action.color)}
              icon={action.icon}
              title={action.disabledReason?.(ids)}
              disabled={action.disabledReason?.(ids) !== undefined || busy}
              onClick={() => runner.run(action, ids, context)}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      }
    />
  );
}

/** Error banner with optional retry. */
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
      type="error"
      showIcon
      title={labels.errorTitle}
      description={error.message}
      action={
        onRetry ? (
          <Button size="small" danger onClick={onRetry}>
            {labels.retry}
          </Button>
        ) : undefined
      }
    />
  );
}

/** Slide-over filter panel. */
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
      open={open}
      onClose={onClose}
      title={labels.filters}
      placement={dir === "rtl" ? "left" : "right"}
      size={360}
      footer={
        <Flex justify="space-between">
          <Button disabled={activeFilterCount === 0} onClick={onClearFilters}>
            {labels.clearAll}
          </Button>
          <Button type="primary" onClick={onClose}>
            {labels.filtersDone}
          </Button>
        </Flex>
      }
    >
      {filters}
    </Drawer>
  );
}
