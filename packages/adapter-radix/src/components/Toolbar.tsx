/** Search field, sort select, filters trigger, menus and rows-per-page. */
import { pageSizeOptions } from "@adapttable/core";
import {
  FeatureSlot,
  FILTER_POPOVER,
  SearchIcon,
  TOOLBAR_EXTRAS,
  type ToolbarChromeProps,
} from "@adapttable/core/adapter";
import { Badge, Box, Button, Flex, TextField } from "@radix-ui/themes";
import { type ReactNode } from "react";

import { FiltersIcon } from "../icons";
import type { RadixAccentColor } from "../types";
import { NativeSelect, type SelectOption } from "./primitives";

export function pageSizeSelectOptions(
  limit: number,
  defaultLimit: number = limit
): SelectOption[] {
  return pageSizeOptions([limit, defaultLimit]).map((n) => ({
    value: String(n),
    label: String(n),
  }));
}

/** Props for {@link Toolbar}: the shared chrome surface + Radix extras. */
export interface ToolbarProps<TRow> extends ToolbarChromeProps<TRow> {
  /** Which filter container opens from the Filters button. */
  filtersMode: "popover" | "drawer" | "header";
  /** Filter widgets rendered inside the popover container. */
  filters?: ReactNode;
  /** Close the filter popover (Escape / outside click). */
  onCloseFilters: () => void;
  /** Clear-filters handler for the popover header. */
  onClearFilters: () => void;
  /** Radix accent color for primary accents. */
  accentColor?: RadixAccentColor;
  /** Class hook for the toolbar row. */
  className?: string;
}

/** Search + sort select + filters button + columns menu + rows-per-page. */
export function Toolbar<TRow>({
  table,
  searchable,
  searchPlaceholder,
  sortByOptions,
  toolbar,
  toolbarSlots,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onPrint,
  printLabel,
  density,
  onDensityChange,
  onToggleFullscreen,
  isFullscreen,
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
  onAddRow,
  addRowLabel,
  onExportCsv,
  exportBusy,
  exportAnnouncement = "",
  exportDisabled = false,
  exportDisabledReason = "",
  exportLabel,
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
      data-adapttable-part="toolbar"
      gap="2"
      wrap="wrap"
      justify="between"
      align="center"
      className={className}
    >
      {toolbarSlots?.start}
      {searchable !== false && (
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
        {toolbar}
        {hasFilters && filtersMode === "popover" ? (
          <FeatureSlot
            slot={FILTER_POPOVER}
            props={{
              open: filtersOpen,
              onClose: onCloseFilters,
              filters,
              activeFilterCount,
              onClearFilters,
              labels,
              dir,
              children: filtersButton,
            }}
          />
        ) : (
          hasFilters && filtersButton
        )}
        {savedViewsMenu}
        {columnMenu}
        <FeatureSlot
          slot={TOOLBAR_EXTRAS}
          props={{
            onUndo,
            onRedo,
            canUndo,
            canRedo,
            undoLabel,
            redoLabel,
            onPrint,
            printLabel,
            density,
            onDensityChange,
            onToggleFullscreen,
            isFullscreen,
            onExportCsv,
            exportBusy,
            exportAnnouncement,
            exportLabel,
            exportDisabled,
            exportDisabledReason,
            accentColor,
            labels,
          }}
        />
        {onAddRow && (
          <Button
            size="2"
            color={accentColor}
            data-adapttable-part="add-row"
            onClick={onAddRow}
          >
            {addRowLabel}
          </Button>
        )}
        {toolbarSlots?.end}
        {showRowsPerPage && (
          <NativeSelect
            size="2"
            width="90px"
            aria-label={labels.rowsPerPage}
            value={String(source.limit)}
            options={pageSizeSelectOptions(source.limit, source.defaultLimit)}
            onValueChange={(value) => source.setLimit(Number(value))}
          />
        )}
      </Flex>
    </Flex>
  );
}
