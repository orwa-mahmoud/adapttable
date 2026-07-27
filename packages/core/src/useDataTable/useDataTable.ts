import type { CSSProperties, ReactNode } from "react";
import { createElement, useCallback, useEffect, useMemo } from "react";

import { resolveColumns } from "../columns/resolveColumns";
import { visibleColumns } from "../columns/visibleColumns";
import { SEARCH_DEBOUNCE_MS } from "../constants";
import {
  type ActiveFilterChip,
  type ChipLabelResolver,
} from "../filters/useActiveFilterChips";
import { useExtraChips } from "../filters/useExtraChips";
import { resolveLabels } from "../labels";
import {
  computePagination,
  type PaginationInfo,
} from "../pagination/paginationMath";
import { type SelectionState, useSelection } from "../selection/useSelection";
import { nextSort } from "../sort/cycleSort";
import { deriveSortByOptions } from "../sort/sortByOptions";
import type { TableSource } from "../source/TableSource";
import type {
  BulkAction,
  ColumnDef,
  Direction,
  SortByOption,
  SortDirection,
  TableLabels,
} from "../types";
import { devWarn } from "../utils/devWarn";
import { mergeProps, type Props } from "../utils/mergeProps";
import { stableKey } from "../utils/stableKey";
import { useSearchInput } from "./useSearchInput";

const EMPTY_LABELS: Readonly<Record<string, ChipLabelResolver>> = {};

/** Options for {@link useDataTable}. */
export interface UseDataTableOptions<TRow> {
  /** The data + state contract, from `useFrontendData` / `useQuerySource`. */
  source: TableSource<TRow>;
  /** Column definitions. */
  columns: ColumnDef<TRow>[];
  /** Stable React key extractor for a row. */
  rowKey: (row: TRow) => string;
  /** Accessible label for the table element. */
  tableLabel?: string;
  /** Pre-translated label overrides (merged over English defaults). */
  labels?: TableLabels;
  /** Text direction. Defaults to `"ltr"`. */
  dir?: Direction;
  /** Render the mobile (card) layout. Defaults to `false`. */
  forceMobile?: boolean;
  /**
   * Active locale — drives per-column `i18n` data-path resolution for
   * bare-key columns, exactly as it does under `<DataTable>`.
   */
  locale?: string;
  /** Number of leading desktop-visible columns always shown on mobile cards. */
  mobileIdentityColumns?: number;
  /** Search debounce in ms. Defaults to 300. */
  searchDebounceMs?: number;
  /** Bulk actions — enabling these turns on selection. */
  bulkActions?: BulkAction[];
  /** Selection id extractor; defaults to `rowKey` when bulk actions exist. */
  selectionGetId?: (row: TRow) => string;
  /** Controlled selection value (see {@link BaseDataTableProps.selectedIds}). */
  selectedIds?: readonly string[];
  /** Change handler for the controlled selection. */
  onSelectedIdsChange?: (selectedIds: string[]) => void;
  /** Per-filter-key chip label resolvers (drives the chip strip). */
  filterLabels?: Readonly<Record<string, ChipLabelResolver>>;
  /** Enable shift-click multi-column sorting (see BaseDataTableProps). */
  multiSort?: boolean;
}

/** Everything a headless consumer needs to render a table. */
export interface UseDataTableResult<TRow> {
  /** The materialised rows for the current slice. */
  rows: readonly TRow[];
  /** Whether there are no rows and nothing is loading. */
  isEmpty: boolean;
  /** Columns visible for the current layout. */
  columns: ColumnDef<TRow>[];
  /** Whether the mobile (card) layout is active. */
  isMobile: boolean;
  /**
   * Sort-by select options auto-derived from the sortable columns. Adapters
   * render these as the mobile sort affordance (no clickable headers there)
   * when the caller passes no explicit `sortByOptions`.
   */
  sortByOptions: SortByOption[];
  /** Resolved labels (English defaults + overrides). */
  labels: Required<TableLabels>;
  /** Text direction. */
  dir: Direction;
  /** Derived pagination figures. */
  pagination: PaginationInfo;
  /** Active sort column key. */
  sortBy: string | undefined;
  /** Active sort direction. */
  sortDir: SortDirection | undefined;
  /** Advance the sort cycle for a column. */
  toggleSort: (key: string) => void;
  /** The controlled search input value. */
  searchValue: string;
  /** Update the search input value. */
  setSearchValue: (next: string) => void;
  /** Selection state, or `null` when no bulk actions are configured. */
  selection: SelectionState | null;
  /** Removable filter chips derived from `filterLabels` + the source. */
  filterChips: ActiveFilterChip[];
  /** Number of active filter chips (drives the Filters badge). */
  activeFilterCount: number;
  /** The underlying source (for pagination setters, fetchNextPage, etc.). */
  source: TableSource<TRow>;

  /* ── Prop-getters (merge caller overrides) ───────────────────────── */
  getTableProps: (props?: Props) => TableElementProps;
  getHeaderRowProps: (props?: Props) => Props;
  getHeaderCellProps: (
    column: ColumnDef<TRow>,
    props?: Props
  ) => CellElementProps;
  getSortButtonProps: (
    column: ColumnDef<TRow>,
    props?: Props
  ) => SortButtonElementProps;
  getRowProps: (row: TRow, index: number, props?: Props) => RowElementProps;
  getCellProps: (column: ColumnDef<TRow>, props?: Props) => CellElementProps;
  getSearchInputProps: (props?: Props) => SearchInputElementProps;
  /**
   * The row's stable React key. Kept OUT of {@link getRowProps} so its
   * result spreads clean — React forbids spreading a `key`.
   */
  getRowKey: (row: TRow) => string;
  /**
   * A cell's rendered content: the column's `Cell` component when set,
   * else its (resolved) `accessor` value — no optional chaining needed.
   */
  getCellContent: (
    column: ColumnDef<TRow>,
    row: TRow,
    rowIndex: number
  ) => ReactNode;
}

/* Precise prop-getter return shapes. Each extends `Props` (keeping the
   index signature so caller overrides still merge and `mergeProps` stays
   compatible) while typing the known keys — so adapters read them without
   casts. */

/** Props from {@link UseDataTableResult.getTableProps}. */
export interface TableElementProps extends Props {
  role: string;
  dir?: Direction;
  "aria-label": string;
}

/**
 * Props from {@link UseDataTableResult.getRowProps}. Spread-clean by
 * contract: never contains `key` — read {@link UseDataTableResult.getRowKey}
 * for the React key.
 */
export interface RowElementProps extends Props {
  role: string;
  "data-index": number;
  "aria-selected"?: boolean;
}

/** Props from {@link UseDataTableResult.getSortButtonProps}. */
export interface SortButtonElementProps extends Props {
  type: "button";
  disabled: boolean;
  onClick: (event?: { shiftKey?: boolean }) => void;
  "data-sort-index"?: number;
  "aria-label": string;
}

/** Props from {@link UseDataTableResult.getCellProps} / `getHeaderCellProps`. */
export interface CellElementProps extends Props {
  role: string;
  style?: CSSProperties;
  "data-sort-index"?: number;
}

/** Props from {@link UseDataTableResult.getSearchInputProps}. */
export interface SearchInputElementProps extends Props {
  type: string;
  role: string;
  value: string;
  placeholder: string;
  "aria-label": string;
  onChange: (event: { currentTarget: { value: string } }) => void;
}

function textAlign(
  align: ColumnDef<TRowAny>["align"]
): "start" | "center" | "end" {
  if (align === "center") return "center";
  if (align === "end") return "end";
  return "start";
}

/** The chain level for a column, if multi-sort has one. */
function chainLevel(
  levels: readonly { key: string; dir: "asc" | "desc" }[],
  key: string
): { key: string; dir: "asc" | "desc" } | undefined {
  return levels.find((l) => l.key === key);
}

/** 1-based chain position for the header badge, or undefined. */
function sortIndexAttr(
  levels: readonly { key: string; dir: "asc" | "desc" }[],
  key: string
): number | undefined {
  const index = levels.findIndex((l) => l.key === key);
  return index === -1 ? undefined : index + 1;
}

function ariaSort<TRow>(
  column: ColumnDef<TRow>,
  sortBy: string | undefined,
  sortDir: SortDirection | undefined
): "ascending" | "descending" | "none" | undefined {
  if (!column.sortable) return undefined;
  if (sortBy !== column.key) return "none";
  return sortDir === "asc" ? "ascending" : "descending";
}

/** A row type we don't care about here — `align` is independent of it. */
type TRowAny = Record<string, unknown>;

/**
 * The headless entry point. Combines a {@link TableSource} with columns,
 * sorting, a debounced search input, selection, and filter chips, and
 * returns derived state plus accessible prop-getters so consumers can
 * render any markup with any UI kit.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseDataTableOptions}.
 * @returns Derived state and prop-getters — see {@link UseDataTableResult}.
 */
export function useDataTable<TRow>(
  options: UseDataTableOptions<TRow>
): UseDataTableResult<TRow> {
  const {
    source,
    columns: declaredColumns,
    rowKey,
    tableLabel,
    labels: labelOverrides,
    dir = "ltr",
    forceMobile: isMobile = false,
    mobileIdentityColumns = 3,
    searchDebounceMs = SEARCH_DEBOUNCE_MS,
    bulkActions,
    selectionGetId,
    selectedIds,
    onSelectedIdsChange,
    filterLabels = EMPTY_LABELS,
    multiSort = false,
    locale,
  } = options;

  const labels = useMemo(() => resolveLabels(labelOverrides), [labelOverrides]);

  // Bare-key columns auto-derive their header and accessor here, exactly
  // as they do under `<DataTable>` — headless callers get real headers and
  // cells, not blanks. Idempotent: already-complete columns pass through.
  const allColumns = useMemo(
    () => resolveColumns(declaredColumns, locale),
    [declaredColumns, locale]
  );

  // Duplicate keys silently corrupt sorting, selection, and column layout —
  // every feature targets columns by key. Catch it in development.
  useEffect(() => {
    const seen = new Set<string>();
    for (const column of allColumns) {
      if (seen.has(column.key)) {
        devWarn(
          `duplicate column key "${column.key}" — column keys must be unique; sorting, selection, and column layout all target keys.`
        );
      }
      seen.add(column.key);
    }
  }, [allColumns]);

  const columns = useMemo(
    () =>
      visibleColumns(
        allColumns,
        isMobile ? "mobile" : "desktop",
        mobileIdentityColumns
      ),
    [allColumns, isMobile, mobileIdentityColumns]
  );

  const sortByOptions = useMemo(() => deriveSortByOptions(columns), [columns]);

  const { value: searchValue, setValue: setSearchValue } = useSearchInput(
    source.search,
    source.setSearch,
    searchDebounceMs
  );

  const filterChips = useExtraChips({
    extra: source.extra,
    setExtra: source.setExtra,
    labels: filterLabels,
  });
  const activeFilterCount = filterChips.length;

  const pagination = useMemo(
    () =>
      computePagination({
        page: source.page,
        limit: source.limit,
        total: source.total,
      }),
    [source.page, source.limit, source.total]
  );

  const hasBulk = (bulkActions?.length ?? 0) > 0;
  const getId = selectionGetId ?? rowKey;
  // Selection is keyed by id, so it persists across page / sort / page-size
  // changes (the rows still exist); it only resets when the result *set*
  // changes — i.e. a new search term or a filter change. Keyed on the filter
  // *values* (not just the active count) so swapping one filter value for
  // another — same count, different rows — still clears the stale selection.
  const selectionResetKey = `${source.search}|${stableKey(source.extra)}|${source.groupBy ?? ""}`;
  const selectionState = useSelection<TRow>({
    rows: source.rows,
    getId,
    resetKey: selectionResetKey,
    selectedIds,
    onSelectionChange: onSelectedIdsChange,
  });
  const selection = hasBulk ? selectionState : null;

  const toggleSort = useCallback(
    (key: string) => {
      const next = nextSort({ key: source.sortBy, dir: source.sortDir }, key);
      source.setSort(next.key, next.dir);
    },
    [source]
  );

  const getTableProps = useCallback(
    (props?: Props) =>
      mergeProps(
        { role: "table", dir, "aria-label": tableLabel ?? labels.table },
        props
      ),
    [dir, tableLabel, labels.table]
  );

  const getHeaderRowProps = useCallback(
    (props?: Props) => mergeProps({ role: "row" }, props),
    []
  );

  const getHeaderCellProps = useCallback(
    (column: ColumnDef<TRow>, props?: Props) =>
      mergeProps(
        {
          role: "columnheader",
          "aria-sort": ariaSort(
            column,
            chainLevel(source.sortLevels, column.key)?.key ?? source.sortBy,
            chainLevel(source.sortLevels, column.key)?.dir ?? source.sortDir
          ),
          "data-sort-index": sortIndexAttr(source.sortLevels, column.key),
          style: { textAlign: textAlign(column.align), width: column.width },
        },
        props
      ),
    [source.sortBy, source.sortDir, source.sortLevels]
  );

  const getSortButtonProps = useCallback(
    (column: ColumnDef<TRow>, props?: Props) =>
      mergeProps<SortButtonElementProps>(
        {
          type: "button",
          disabled: !column.sortable,
          onClick: (event?: { shiftKey?: boolean }) => {
            if (!column.sortable) return;
            if (multiSort && event?.shiftKey) {
              source.toggleSortLevel(column.key);
              return;
            }
            toggleSort(column.key);
          },
          "data-sort-index": sortIndexAttr(source.sortLevels, column.key),
          "aria-label": `${labels.sortBy}: ${
            typeof column.header === "string" ? column.header : column.key
          }`,
        },
        props
      ),
    [toggleSort, labels.sortBy, multiSort, source]
  );

  // Spread-clean by contract: no `key` in here — React forbids spreading
  // one, and every consumer had to destructure-and-cast it out. The key
  // lives in `getRowKey` instead.
  const getRowProps = useCallback(
    (row: TRow, index: number, props?: Props) => {
      const id = getId(row);
      const selected = selection?.isSelected(id) ?? false;
      return mergeProps<RowElementProps>(
        {
          role: "row",
          "data-index": index,
          "aria-selected": hasBulk ? selected : undefined,
        },
        props
      );
    },
    [getId, selection, hasBulk]
  );

  const getCellContent = useCallback(
    (column: ColumnDef<TRow>, row: TRow, rowIndex: number): ReactNode =>
      column.Cell
        ? createElement(column.Cell, { row, rowIndex })
        : (column.accessor?.(row) ?? null),
    []
  );

  const getCellProps = useCallback(
    (column: ColumnDef<TRow>, props?: Props) =>
      mergeProps(
        {
          role: "cell",
          style: { textAlign: textAlign(column.align), width: column.width },
        },
        props
      ),
    []
  );

  const getSearchInputProps = useCallback(
    (props?: Props) =>
      mergeProps(
        {
          type: "search",
          role: "searchbox",
          value: searchValue,
          placeholder: labels.searchPlaceholder,
          "aria-label": labels.search,
          onChange: (event: { currentTarget: { value: string } }) =>
            setSearchValue(event.currentTarget.value),
        },
        props
      ),
    [searchValue, setSearchValue, labels.searchPlaceholder, labels.search]
  );

  return {
    rows: source.rows,
    isEmpty: source.rows.length === 0 && !source.isLoading,
    columns,
    isMobile,
    sortByOptions,
    labels,
    dir,
    pagination,
    sortBy: source.sortBy,
    sortDir: source.sortDir,
    toggleSort,
    searchValue,
    setSearchValue,
    selection,
    filterChips,
    activeFilterCount,
    source,
    getTableProps,
    getHeaderRowProps,
    getHeaderCellProps,
    getSortButtonProps,
    getRowProps,
    getCellProps,
    getSearchInputProps,
    getRowKey: rowKey,
    getCellContent,
  };
}

export { defaultLabels } from "../labels";
