import { pageSizeOptions } from "@adapttable/core";
import {
  ExportAnnouncer,
  type ToolbarChromeProps,
} from "@adapttable/core/adapter";
import { Badge, Button, Group, Select, Text, TextInput } from "@mantine/core";
import type { ReactNode } from "react";

import { FiltersIcon, SearchIcon } from "../icons";
import { FilterPopover } from "./FilterPopover";

/**
 * Props for {@link Toolbar}: the shared chrome surface from core plus the
 * Mantine-specific filter-container wiring.
 */
export interface ToolbarProps<TRow> extends ToolbarChromeProps<TRow> {
  /** Close the filter container. */
  onCloseFilters: () => void;
  /** Filter content + how to render its container. */
  filtersMode: "popover" | "drawer" | "header";
  /** The filter fields to render. */
  filters?: ReactNode;
  /** Clear-filters handler used by the popover's clear-all button. */
  onClearFilters: () => void;
  /** Class for the element. */
  className?: string;
}

/** Sticky toolbar: search, optional sort select, custom slot, filters, size. */
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
  onToggleFilters,
  onFiltersTriggerPointerDown,
  onCloseFilters,
  filtersOpen,
  filtersMode,
  filters,
  onClearFilters,
  dir,
  savedViewsMenu,
  columnMenu,
  onAddRow,
  addRowLabel,
  onExportCsv,
  exportBusy,
  exportAnnouncement = "",
  exportLabel,
  showRowsPerPage,
  className,
}: Readonly<ToolbarProps<TRow>>) {
  const { labels, source } = table;
  const searchProps = table.getSearchInputProps(
    searchPlaceholder ? { placeholder: searchPlaceholder } : undefined
  );
  // Explicit options win; otherwise auto-derive on mobile, where the card
  // layout has no clickable headers to sort by.
  const sortOptions =
    sortByOptions ?? (table.isMobile ? table.sortByOptions : undefined);

  const filtersButton = (
    <Button
      variant="default"
      size="sm"
      aria-expanded={filtersMode === "popover" ? filtersOpen : undefined}
      data-active={filtersOpen || undefined}
      leftSection={<FiltersIcon size={16} />}
      rightSection={
        activeFilterCount > 0 ? (
          <Badge size="sm" circle>
            {activeFilterCount}
          </Badge>
        ) : undefined
      }
      onPointerDown={onFiltersTriggerPointerDown}
      onClick={onToggleFilters}
    >
      {labels.filters}
    </Button>
  );

  return (
    <Group
      gap="sm"
      justify="space-between"
      align="center"
      className={className}
    >
      {toolbarSlots?.start}
      {searchable !== false && (
        <TextInput
          {...searchProps}
          leftSection={<SearchIcon size={14} />}
          size="sm"
          style={{ flex: 1, minWidth: 160, maxWidth: 360 }}
        />
      )}
      <Group gap="xs" align="center">
        {sortOptions && sortOptions.length > 0 && (
          <Select
            aria-label={labels.sortBy}
            placeholder={labels.sortBy}
            data={sortOptions}
            value={source.sortBy ?? null}
            onChange={(v) =>
              source.setSort(v ?? undefined, source.sortDir ?? "asc")
            }
            clearable
            size="sm"
            w={160}
            comboboxProps={{ withinPortal: false }}
          />
        )}
        {toolbar}
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
        {savedViewsMenu}
        {columnMenu}
        {onUndo && onRedo && (
          <Button.Group>
            <Button
              variant="default"
              size="sm"
              data-adapttable-part="undo-button"
              disabled={canUndo !== true}
              onClick={onUndo}
            >
              {undoLabel}
            </Button>
            <Button
              variant="default"
              size="sm"
              data-adapttable-part="redo-button"
              disabled={canRedo !== true}
              onClick={onRedo}
            >
              {redoLabel}
            </Button>
          </Button.Group>
        )}
        {onExportCsv && (
          <>
            {/* Mantine's own loading Button: it swaps in the kit's Loader and
                blocks interaction itself, which reads as "working" rather than
                as a control that has been switched off. */}
            <Button
              variant="default"
              size="sm"
              onClick={onExportCsv}
              loading={exportBusy}
              aria-busy={exportBusy}
            >
              {exportLabel}
            </Button>
            <ExportAnnouncer announcement={exportAnnouncement} />
          </>
        )}
        {onAddRow && (
          <Button
            variant="light"
            size="sm"
            data-adapttable-part="add-row"
            onClick={onAddRow}
          >
            {addRowLabel}
          </Button>
        )}
        {onPrint && (
          <Button
            variant="default"
            size="sm"
            data-adapttable-part="print-button"
            onClick={onPrint}
          >
            {printLabel}
          </Button>
        )}
        {onDensityChange && (
          <Button
            variant="default"
            size="sm"
            aria-label={labels.density}
            data-adapttable-part="density-toggle"
            onClick={() => {
              onDensityChange(
                density === "compact" ? "comfortable" : "compact"
              );
            }}
          >
            {density === "compact"
              ? labels.densityCompact
              : labels.densityComfortable}
          </Button>
        )}
        {onToggleFullscreen && (
          <Button
            variant="default"
            size="sm"
            aria-label={
              isFullscreen === true
                ? labels.exitFullscreen
                : labels.enterFullscreen
            }
            data-adapttable-part="fullscreen-toggle"
            onClick={onToggleFullscreen}
          >
            {isFullscreen === true ? "\u2715" : "\u26f6"}
          </Button>
        )}
        {toolbarSlots?.end}
        {showRowsPerPage && (
          <Group gap="xs" align="center">
            <Text fz="xs" c="dimmed">
              {labels.rowsPerPage}
            </Text>
            <Select
              aria-label={labels.rowsPerPage}
              data={pageSizeOptions([source.limit, source.defaultLimit]).map(
                (n) => ({
                  value: String(n),
                  label: String(n),
                })
              )}
              value={String(source.limit)}
              // `allowDeselect={false}` keeps the value non-null.
              onChange={(v) => source.setLimit(Number(v!))}
              size="sm"
              w={80}
              allowDeselect={false}
              comboboxProps={{ withinPortal: false }}
            />
          </Group>
        )}
      </Group>
    </Group>
  );
}
