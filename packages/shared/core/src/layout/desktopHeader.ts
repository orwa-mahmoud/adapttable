/**
 * Header leaves: sort, filter, pin, resize and column selection.
 *
 * Filter definitions and the column-select label come from the lean assembly.
 * Resize-handle props are injected by the caller.
 */

import { columnHeaderLabel } from "../columns/columnHeader";
import type { PinOffset } from "../columns/columnLayoutModel";
import type { ColumnMetadata } from "../contracts/columns";
import type { FilterDef } from "../filters/filterDefs";
import type { CssProperties } from "../style/cssProperties";
import type { ColumnHeaderController } from "../types";
import { columnSelectLabel, filterDefForColumn } from "./leanAssembly";

/* ── Header leaves ─────────────────────────────────────────────────── */

/**
 * A custom header's controller: the caption, and the sort it can drive.
 *
 * @public
 */
export function columnHeaderControllerFor(
  column: { readonly header?: unknown } & ColumnMetadata<never>,
  extras: {
    sortDir?: "asc" | "desc";
    sortIndex?: number;
    toggleSort?: (event?: { shiftKey?: boolean }) => void;
  } = {}
): ColumnHeaderController {
  return {
    label: column.header ?? columnHeaderLabel(column),
    sortDir: extras.sortDir,
    sortIndex: extras.sortIndex,
    toggleSort: extras.toggleSort ?? (() => undefined),
  };
}

/** Sort-button props as a header leaf reads them. */
export interface LeafSortProps {
  readonly onClick?: (event?: { shiftKey?: boolean }) => void;
  readonly "data-sort-index"?: unknown;
}

/** A column as a header leaf reads it. */
export interface LeafColumn {
  readonly key: string;
  readonly header?: unknown;
  readonly width?: number | string;
  readonly sortable?: boolean;
  readonly groupable?: boolean;
}

/**
 * What every header leaf of one table shares.
 *
 * @public
 */
export interface DesktopHeaderLeafContext<
  TRow,
  TColumn extends LeafColumn,
  THeaderProps extends { style?: object } = { style?: CssProperties },
  TSortProps extends LeafSortProps = LeafSortProps,
> {
  /** The table's prop-getters and sort state. */
  readonly table: {
    readonly columns: readonly { readonly key: string }[];
    readonly sortBy?: string;
    readonly sortDir?: "asc" | "desc";
    readonly source: {
      readonly sortLevels: readonly { key: string; dir: "asc" | "desc" }[];
    };
    getHeaderCellProps(
      column: TColumn,
      extra?: { style: object }
    ): THeaderProps;
    getSortButtonProps(column: TColumn): TSortProps;
  };
  /** A header cell's own style. */
  readonly headStyle: (column: TColumn) => object | undefined;
  /** Grouping strip drag, when the panel is composed. */
  readonly groupingPanel: { headerDragProps(key: string): object } | undefined;
  /** Grid focus, when composed. */
  readonly gridFocus:
    | {
        readonly columnCheckbox: boolean;
        getColumnHeaderProps(
          index: number,
          options: { sortable?: boolean }
        ): object;
        isColumnSelected(index: number): boolean;
        toggleColumn(index: number): void;
      }
    | undefined;
  /** Whether header filters render. */
  readonly headerFilters: boolean | undefined;
  /** Declarative filter definitions. */
  readonly filterDefs: readonly FilterDef<TRow>[] | undefined;
  /** Pin lookup. */
  readonly pinOffset: ((key: string) => PinOffset | undefined) | undefined;
  /** Resize setter, when columns resize. */
  readonly setWidth: ((key: string, width: number) => void) | undefined;
  /** The resize handle's label prefix. */
  readonly resizeLabel: string;
  /** Build the neutral resize-handle props. */
  readonly columnResizeHandleProps: (
    key: string,
    setWidth: (key: string, width: number) => void,
    label: string
  ) => unknown;
  /** Resolved labels. */
  readonly labels: { readonly selectColumn?: string };
}

/**
 * A header cell's sort direction: its place in a multi-sort chain, else the
 * single sort when it is the sorted column.
 *
 * @public
 */
export function headerSortDir(
  table: Pick<
    DesktopHeaderLeafContext<unknown, LeafColumn>["table"],
    "sortBy" | "sortDir" | "source"
  >,
  key: string
): "asc" | "desc" | undefined {
  const chainDir = table.source.sortLevels.find(
    (level) => level.key === key
  )?.dir;
  return chainDir ?? (table.sortBy === key ? table.sortDir : undefined);
}

/**
 * Assembled sort, filter, pin, resize and selection state for one leaf
 * header cell. The binding builds its caption from the sort state (see
 * {@link columnHeaderControllerFor}) and turns the resize props into its own
 * handler shape.
 *
 * @public
 */
export function desktopHeaderLeaf<
  TRow,
  TColumn extends LeafColumn,
  THeaderProps extends { style?: object } = { style?: CssProperties },
  TSortProps extends LeafSortProps = LeafSortProps,
>(
  ctx: DesktopHeaderLeafContext<TRow, TColumn, THeaderProps, TSortProps>,
  column: TColumn,
  headerIndex: number,
  rowSpan: number,
  absoluteIndex: ReadonlyMap<string, number>
): {
  column: TColumn;
  headerIndex: number;
  rowSpan: number;
  headerProps: THeaderProps;
  columnHeaderProps: Record<string, unknown>;
  style: CssProperties;
  sortDir: "asc" | "desc" | undefined;
  sortActive: boolean;
  sortButtonProps: TSortProps;
  sortIndex: number | undefined;
  headerDef: FilterDef<TRow> | undefined;
  pinSide: PinOffset["side"] | undefined;
  resizeHandleProps: unknown;
  columnName: string;
  showColumnCheckbox: boolean;
  columnCheckboxChecked: boolean;
  onToggleColumn: (() => void) | undefined;
  columnSelectAriaLabel: string;
} {
  const { table, gridFocus, setWidth } = ctx;
  const localStyle = ctx.headStyle(column);
  const pinSide = ctx.pinOffset?.(column.key)?.side;
  const headerProps = {
    ...table.getHeaderCellProps(column, localStyle && { style: localStyle }),
    // Pinned header cells say which edge they hold, as body cells do.
    ...(pinSide ? { "data-pinned": pinSide } : {}),
    // A column the host closed to grouping offers no drag: the reader is
    // never handed a gesture the panel would refuse.
    ...(column.groupable === false
      ? {}
      : ctx.groupingPanel?.headerDragProps(column.key)),
  };
  const sortDir = headerSortDir(table, column.key);
  const sortButtonProps = table.getSortButtonProps(column);
  const rawIndex = sortButtonProps["data-sort-index"];
  const sortIndex = typeof rawIndex === "number" ? rawIndex : undefined;
  // A windowed header is handed its position within the rendered slice, so
  // the absolute index is what column selection, the header checkbox and
  // `aria-colindex` all have to name — windowed or not.
  const focusIndex = absoluteIndex.get(column.key) ?? headerIndex;
  const columnName =
    typeof column.header === "string" ? column.header : column.key;
  return {
    column,
    headerIndex,
    rowSpan,
    headerProps,
    columnHeaderProps:
      (gridFocus?.getColumnHeaderProps(focusIndex, {
        sortable: column.sortable,
      }) as Record<string, unknown> | undefined) ?? {},
    style: {
      ...headerProps.style,
      ...(rowSpan > 1 ? { verticalAlign: "middle" } : {}),
    },
    sortDir,
    sortActive: sortDir !== undefined,
    sortButtonProps,
    sortIndex,
    headerDef:
      ctx.headerFilters === true
        ? filterDefForColumn(ctx.filterDefs ?? [], column.key)
        : undefined,
    pinSide,
    resizeHandleProps: setWidth
      ? ctx.columnResizeHandleProps(
          column.key,
          setWidth,
          `${ctx.resizeLabel}: ${columnName}`
        )
      : undefined,
    columnName,
    showColumnCheckbox: gridFocus?.columnCheckbox === true,
    columnCheckboxChecked: gridFocus?.isColumnSelected(focusIndex) ?? false,
    onToggleColumn: gridFocus
      ? () => gridFocus.toggleColumn(focusIndex)
      : undefined,
    columnSelectAriaLabel: columnSelectLabel(ctx.labels.selectColumn, {
      key: column.key,
      header: column.header as string | undefined,
    }),
  };
}

/**
 * Each visible column's position in the FULL visible list, built once per
 * render rather than searched per header cell.
 *
 * @public
 */
export function absoluteColumnIndex(
  columns: readonly { readonly key: string }[]
): ReadonlyMap<string, number> {
  return new Map(columns.map((column, index) => [column.key, index]));
}
