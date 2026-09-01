/** Search field, sort select, filters trigger, menus and rows-per-page. */
import { pageSizeOptions } from "@adapttable/core";
import {
  ExportAnnouncer,
  FeatureSlot,
  FILTER_POPOVER,
  SearchIcon,
  type ToolbarChromeProps,
} from "@adapttable/core/adapter";
import { Badge, Button, HStack, Input, InputGroup } from "@chakra-ui/react";
import { type ReactNode } from "react";

import { FiltersIcon } from "../icons";
import { NativeSelect } from "./primitives";

export interface ToolbarProps<TRow> extends ToolbarChromeProps<TRow> {
  /** Which filter container opens from the Filters button. */
  filtersMode: "popover" | "drawer" | "header";
  /** Filter widgets rendered inside the popover container. */
  filters?: ReactNode;
  /** Close the filter popover (Escape / outside click). */
  onCloseFilters: () => void;
  /** Clear-filters handler for the popover header. */
  onClearFilters: () => void;
  /** Chakra color scheme for primary accents. */
  accentColor?: string;
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
      data-adapttable-part="toolbar"
      gap={2}
      flexWrap="wrap"
      rowGap={2}
      justify="space-between"
      align="center"
      className={className}
    >
      {toolbarSlots?.start}
      {searchable !== false && (
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
        {onUndo && onRedo && (
          <>
            <Button
              size="sm"
              variant="outline"
              data-adapttable-part="undo-button"
              disabled={canUndo !== true}
              onClick={onUndo}
            >
              {undoLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              data-adapttable-part="redo-button"
              disabled={canRedo !== true}
              onClick={onRedo}
            >
              {redoLabel}
            </Button>
          </>
        )}
        {onExportCsv && (
          <>
            {/* Chakra's own loading Button: its Spinner replaces the label and
                the control blocks itself, which is the kit's own vocabulary for
                work in progress. */}
            <Button
              size="sm"
              variant="outline"
              colorPalette={accentColor}
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
            size="sm"
            colorPalette={accentColor}
            data-adapttable-part="add-row"
            onClick={onAddRow}
          >
            {addRowLabel}
          </Button>
        )}
        {onPrint && (
          <Button
            size="sm"
            variant="outline"
            data-adapttable-part="print-button"
            onClick={onPrint}
          >
            {printLabel}
          </Button>
        )}
        {onDensityChange && (
          <Button
            size="sm"
            variant="outline"
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
            size="sm"
            variant="outline"
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
          <NativeSelect
            size="sm"
            w="90px"
            aria-label={labels.rowsPerPage}
            value={source.limit}
            onChange={(e) => source.setLimit(Number(e.target.value))}
          >
            {pageSizeOptions([source.limit, source.defaultLimit]).map((n) => (
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
