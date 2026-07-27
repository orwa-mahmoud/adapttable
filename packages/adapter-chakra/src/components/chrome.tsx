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
  Alert,
  Badge,
  Button,
  CloseButton,
  Drawer,
  HStack,
  Input,
  InputGroup,
  Portal,
  Skeleton,
  Stack,
  Tag,
  Text,
  VisuallyHidden,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { isValidElement, type ReactNode } from "react";

import { subtleText } from "../styles";
import { FilterPopover } from "./FilterPopover";
import { NativeSelect, Tooltip } from "./primitives";

/** Props for {@link Toolbar}: the shared chrome surface + Chakra extras. */
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
  /** Chakra color scheme for primary accents. */
  accentColor?: string;
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
      size="sm"
      variant="outline"
      colorPalette={accentColor}
      aria-expanded={filtersMode === "popover" ? filtersOpen : undefined}
      data-active={filtersOpen || undefined}
      onPointerDown={onFiltersTriggerPointerDown}
      onClick={onToggleFilters}
    >
      <FiltersIcon />
      {labels.filters}
      {activeFilterCount > 0 && (
        <Badge ml={2} colorPalette={accentColor} borderRadius="full">
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <HStack
      gap={2}
      flexWrap="wrap"
      rowGap={2}
      justify="space-between"
      align="center"
      className={className}
    >
      {(searchable ?? hideSearch !== true) && (
        <InputGroup
          maxW="360px"
          flex="1"
          minW="160px"
          startElement={<SearchIcon />}
        >
          <Input
            size="sm"
            aria-label={labels.search}
            type="search"
            value={searchProps.value}
            placeholder={searchProps.placeholder}
            onChange={searchProps.onChange}
          />
        </InputGroup>
      )}
      <HStack gap={2} flexWrap="wrap" rowGap={2} align="center">
        {sortOptions && sortOptions.length > 0 && (
          <NativeSelect
            size="sm"
            w="160px"
            aria-label={labels.sortBy}
            placeholder={labels.sortBy}
            value={source.sortBy ?? ""}
            onChange={(e) =>
              source.setSort(
                e.target.value || undefined,
                source.sortDir ?? "asc"
              )
            }
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
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
            size="sm"
            variant="outline"
            colorPalette={accentColor}
            onClick={onExportCsv}
          >
            {labels.exportCsv}
          </Button>
        )}
        {showRowsPerPage && (
          <NativeSelect
            size="sm"
            w="90px"
            aria-label={labels.rowsPerPage}
            value={source.limit}
            onChange={(e) => source.setLimit(Number(e.target.value))}
          >
            {pageSizeOptions(source.limit).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </NativeSelect>
        )}
      </HStack>
    </HStack>
  );
}

/** Removable Chakra tag chips. */
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
    <Wrap aria-label={labels.filters} as="ul" listStyleType="none">
      {chips.map((chip) => (
        <WrapItem key={chip.key} as="li">
          <Tag.Root size="md" borderRadius="full">
            <Tag.Label>{chip.label}</Tag.Label>
            <Tag.CloseTrigger
              aria-label={`${labels.clearAll}: ${chip.label}`}
              onClick={chip.onRemove}
            />
          </Tag.Root>
        </WrapItem>
      ))}
      <WrapItem as="li">
        <Button size="xs" variant="plain" onClick={onClearAll}>
          {labels.clearAll}
        </Button>
      </WrapItem>
    </Wrap>
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
}: Readonly<BulkBarChromeProps & { accentColor?: string }>) {
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
    <HStack gap={2} justify="space-between" flexWrap="wrap">
      {expandable ? (
        <HStack gap={2} flexWrap="wrap">
          <Text fontSize="sm">{banner.text}</Text>
          <Button
            size="xs"
            variant="plain"
            colorPalette={accentColor}
            disabled={pending !== null}
            onClick={banner.onClick}
          >
            {banner.action}
          </Button>
        </HStack>
      ) : (
        <Text fontSize="sm">{labels.selectedCount(selectedCount)}</Text>
      )}
      <HStack gap={2} flexWrap="wrap">
        <Button
          size="xs"
          variant="ghost"
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
                size="xs"
                colorPalette={action.color ?? accentColor}
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
          <Text fontSize="sm" color="red.500" role="alert">
            {`${labels.errorTitle}: ${errorMessage}`}
          </Text>
        )}
      </HStack>
    </HStack>
  );
}

/** Paged footer with prev/next. */
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
    <HStack
      gap={3}
      justify="space-between"
      flexWrap="wrap"
      className={className}
    >
      <HStack gap={2}>
        {showRowsPerPage && (
          <>
            <Text fontSize="xs" {...subtleText}>
              {labels.rowsPerPage}
            </Text>
            <NativeSelect
              size="xs"
              w="72px"
              aria-label={labels.rowsPerPage}
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {pageSizeOptions(limit).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </>
        )}
        {total > 0 && (
          <Text fontSize="xs" {...subtleText}>
            {labels.showing({ from: fromIndex, to: toIndex, total })}
          </Text>
        )}
      </HStack>
      <HStack gap={1}>
        <Text fontSize="xs" {...subtleText}>
          {labels.pageOf({ page: safePage, total: totalPages })}
        </Text>
        <Button
          size="xs"
          variant="outline"
          aria-label={labels.previousPage}
          disabled={safePage <= 1}
          onClick={() => setPage(safePage - 1)}
        >
          ‹
        </Button>
        {paginationSlots(safePage, totalPages).map(({ item, key }) =>
          item === "ellipsis" ? (
            <Text key={key} fontSize="xs" px={1} {...subtleText}>
              …
            </Text>
          ) : (
            <Button
              key={key}
              size="xs"
              variant={item === safePage ? "solid" : "outline"}
              aria-current={item === safePage ? "page" : undefined}
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          )
        )}
        <Button
          size="xs"
          variant="outline"
          aria-label={labels.nextPage}
          disabled={safePage >= totalPages}
          onClick={() => setPage(safePage + 1)}
        >
          ›
        </Button>
      </HStack>
    </HStack>
  );
}

/** Error alert with retry. */
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
    <Alert.Root status="error" borderRadius="md">
      <Alert.Indicator />
      <Alert.Content flex="1">
        <Alert.Title fontWeight="bold">{labels.errorTitle}</Alert.Title>
        <Alert.Description fontSize="sm">{error.message}</Alert.Description>
      </Alert.Content>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          {labels.retry}
        </Button>
      )}
    </Alert.Root>
  );
}

/** Skeleton loading rows. */
export function LoadingState({
  rows,
  columns,
  loadingLabel,
}: Readonly<{ rows: number; columns: number; loadingLabel?: string }>) {
  return (
    <Stack
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="adapttable-loading"
    >
      {Array.from({ length: rows }, (_, r) => (
        <HStack key={r} gap={4}>
          {Array.from({ length: Math.max(columns, 1) }, (_, c) => (
            <Skeleton key={c} height="14px" width={c === 0 ? "30%" : "20%"} />
          ))}
        </HStack>
      ))}
      {loadingLabel ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </Stack>
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
  accentColor,
  dir = "ltr",
}: Readonly<{
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  onClearFilters: () => void;
  labels: Required<TableLabels>;
  accentColor?: string;
  dir?: Direction;
}>) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement={dir === "rtl" ? "start" : "end"}
      size="sm"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.CloseTrigger asChild>
              <CloseButton aria-label={labels.cancel} />
            </Drawer.CloseTrigger>
            <Drawer.Header>{labels.filters}</Drawer.Header>
            <Drawer.Body>
              <Stack gap={4}>{filters}</Stack>
            </Drawer.Body>
            <Drawer.Footer justifyContent="space-between">
              <Button
                variant="ghost"
                onClick={onClearFilters}
                disabled={activeFilterCount === 0}
              >
                {labels.clearAll}
              </Button>
              <Button colorPalette={accentColor} onClick={onClose}>
                {labels.filtersDone}
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
