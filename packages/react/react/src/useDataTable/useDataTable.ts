import {
  type BulkAction,
  columnFlexShares,
  computePagination,
  deriveSortByOptions,
  devWarn,
  type Direction,
  mergeProps,
  nextSort,
  type PaginationInfo,
  type Props,
  resolveLabels,
  SEARCH_DEBOUNCE_MS,
  type SortByOption,
  type SortDirection,
  stableKey,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import {
  cellAttributes,
  headerCellAttributes,
  headerRowAttributes,
  rowAttributes,
  searchInputAttributes,
  sortButtonAttributes,
  tableAttributes,
} from "@adapttable/core/binding";
import {
  createElement,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";

import type { ColumnDef } from "../columnDef";
import { visibleReactColumns } from "../columns/reactColumns";
import { resolveColumns } from "../columns/resolveColumns";
import {
  type ActiveFilterChip,
  type ChipLabelResolver,
} from "../filters/useActiveFilterChips";
import { useExtraChips } from "../filters/useExtraChips";
import { type SelectionState, useSelection } from "../selection/useSelection";
import { useSearchInput } from "./useSearchInput";

const EMPTY_LABELS: Readonly<Record<string, ChipLabelResolver>> = {};

/**
 * Options for {@link useDataTable}.
 *
 * @public
 */
export interface UseDataTableOptions<TRow> {
  /** The data + state contract, from `useFrontendData` / `useQuerySource`. */
  source: TableSource<TRow>;
  /** Column definitions. */
  columns: ColumnDef<TRow>[];
  /**
   * Make the columns share the container's width instead of overflowing it.
   * Columns with `flex` take that share; columns with a `width` keep it.
   */
  fitColumns?: boolean;
  /** User widths from the column layout, which win over everything else. */
  columnWidths?: Readonly<Record<string, number>>;
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
  /**
   * Accepted and ignored.
   *
   * @deprecated A card shows every column without `hideOnMobile`, so
   * `hideOnMobile` decides what a card shows. Removed in v4.
   */
  mobileIdentityColumns?: number;
  /** Search debounce in ms. Defaults to 300. */
  searchDebounceMs?: number;
  /** Bulk actions — enabling these turns on selection. */
  bulkActions?: BulkAction[];
  /** Selection id extractor; defaults to `rowKey` when bulk actions exist. */
  selectionGetId?: (row: TRow) => string;
  /** Controlled selection value (see `BaseDataTableProps.selectedIds`). */
  selectedIds?: readonly string[];
  /** Change handler for the controlled selection. */
  onSelectedIdsChange?: (selectedIds: string[]) => void;
  /** Per-filter-key chip label resolvers (drives the chip strip). */
  filterLabels?: Readonly<Record<string, ChipLabelResolver>>;
  /** Enable shift-click multi-column sorting (see BaseDataTableProps). */
  multiSort?: boolean;
}

/**
 * Everything a headless consumer needs to render a table.
 *
 * @public
 */
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
  /** Props for the `<table>` element, its role and accessible name included. */
  getTableProps: (props?: Props) => TableElementProps;
  /** Props for the header row. */
  getHeaderRowProps: (props?: Props) => Props;
  /** Props for one header cell, `scope` and sort state included. */
  getHeaderCellProps: (
    column: ColumnDef<TRow>,
    props?: Props
  ) => CellElementProps;
  /** Props for a column's sort control, its accessible name included. */
  getSortButtonProps: (
    column: ColumnDef<TRow>,
    props?: Props
  ) => SortButtonElementProps;
  /** Props for a body row. Spread-clean: never carries a React `key`. */
  getRowProps: (row: TRow, index: number, props?: Props) => RowElementProps;
  /** Props for a body cell. */
  getCellProps: (column: ColumnDef<TRow>, props?: Props) => CellElementProps;
  /** Props for the search box. */
  getSearchInputProps: (props?: Props) => SearchInputElementProps;
  /**
   * The row's stable React key. Kept OUT of `getRowProps` so its
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

/**
 * Props from `UseDataTableResult.getTableProps`.
 *
 * @public
 */
export interface TableElementProps extends Props {
  /**
   * `table`. The headless hook draws a plain table; a grid role belongs to
   * the kit that wires cell navigation onto it.
   */
  role: string;
  /** Writing direction, present only when the table sets it. */
  dir?: Direction;
  /** The table's accessible name. */
  "aria-label": string;
}

/**
 * Props from `UseDataTableResult.getRowProps`. Spread-clean by
 * contract: never contains `key` — read `UseDataTableResult.getRowKey`
 * for the React key.
 *
 * @public
 */
export interface RowElementProps extends Props {
  /** `row`. */
  role: string;
  /** The structural part name every kit's body row carries. */
  "data-adapttable-part": "row";
  /** The row's id, so an event can be traced back to the row it happened in. */
  "data-row-id": string;
  /** The row's position in the rendered window. */
  "data-index": number;
  /** Selection state, present only while selection is on. */
  "aria-selected"?: boolean;
}

/**
 * Props from `UseDataTableResult.getSortButtonProps`.
 *
 * @public
 */
export interface SortButtonElementProps extends Props {
  /** Always `button`, so the control never submits a form. */
  type: "button";
  /** Whether the control is offered but not available. */
  disabled: boolean;
  /** Called when pressed. */
  onClick: (event?: { shiftKey?: boolean }) => void;
  /** 1-based place in a multi-column sort, present only while sorted. */
  "data-sort-index"?: number;
  /** The sort control's accessible name. */
  "aria-label": string;
}

/**
 * Props from `UseDataTableResult.getCellProps` / `getHeaderCellProps`.
 *
 * @public
 */
export interface CellElementProps extends Props {
  /** `gridcell` or `columnheader` inside a grid, `cell` otherwise. */
  role: string;
  /** Inline style for the element. */
  style?: CSSProperties;
  /** 1-based place in a multi-column sort, present only while sorted. */
  "data-sort-index"?: number;
}

/**
 * Props from `UseDataTableResult.getSearchInputProps`.
 *
 * @public
 */
export interface SearchInputElementProps extends Props {
  /** `search`. */
  type: string;
  /** `searchbox`. */
  role: string;
  /** Current value. */
  value: string;
  /** Placeholder text. */
  placeholder: string;
  /** The search box's accessible name. */
  "aria-label": string;
  /** Called with the new value. */
  onChange: (event: { currentTarget: { value: string } }) => void;
}

/**
 * The headless entry point. Combines a {@link TableSource} with columns,
 * sorting, a debounced search input, selection, and filter chips, and
 * returns derived state plus accessible prop-getters so consumers can
 * render any markup with any UI kit.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseDataTableOptions}.
 * @returns Derived state and prop-getters — see `UseDataTableResult`.
 *
 * @public
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
    searchDebounceMs = SEARCH_DEBOUNCE_MS,
    bulkActions,
    selectionGetId,
    selectedIds,
    onSelectedIdsChange,
    filterLabels = EMPTY_LABELS,
    multiSort = false,
    locale,
    fitColumns = false,
    columnWidths,
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
    () => visibleReactColumns(allColumns, isMobile ? "mobile" : "desktop"),
    [allColumns, isMobile]
  );

  // Each flexible column's share of the leftover width, recomputed only when
  // the column set or the user's widths change.
  const flexShares = useMemo(
    () => columnFlexShares({ columns, fitColumns, widths: columnWidths }),
    [columns, fitColumns, columnWidths]
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
      mergeProps(tableAttributes(dir, tableLabel ?? labels.table), props),
    [dir, tableLabel, labels.table]
  );

  const getHeaderRowProps = useCallback(
    (props?: Props) => mergeProps(headerRowAttributes(), props),
    []
  );

  const getHeaderCellProps = useCallback(
    (column: ColumnDef<TRow>, props?: Props) =>
      mergeProps(
        headerCellAttributes(
          column,
          {
            sortBy: source.sortBy,
            sortDir: source.sortDir,
            sortLevels: source.sortLevels,
          },
          { flexShares, columnWidths }
        ),
        props
      ),
    [source.sortBy, source.sortDir, source.sortLevels, flexShares, columnWidths]
  );

  const getSortButtonProps = useCallback(
    (column: ColumnDef<TRow>, props?: Props) =>
      mergeProps<SortButtonElementProps>(
        sortButtonAttributes(column, {
          sortLevels: source.sortLevels,
          sortByLabel: labels.sortBy,
          multiSort,
          toggleSort,
          toggleSortLevel: source.toggleSortLevel,
        }),
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
      // antd, whose <Table> builds its own <tr>, carries the part name and
      // row id through `onRow` instead.
      return mergeProps<RowElementProps>(
        rowAttributes(id, index, hasBulk ? selected : undefined),
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
      mergeProps(cellAttributes(column, { flexShares, columnWidths }), props),
    [flexShares, columnWidths]
  );

  const getSearchInputProps = useCallback(
    (props?: Props) =>
      mergeProps(
        searchInputAttributes(searchValue, labels, setSearchValue),
        props
      ),
    [searchValue, setSearchValue, labels]
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

export { defaultLabels } from "@adapttable/core";
