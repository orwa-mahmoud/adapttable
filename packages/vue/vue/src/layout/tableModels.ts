/** The same semantic models drive every Vue kit's desktop and card layouts. */
import {
  type ChromeBodySlot,
  type ChromeExtraSlot,
  type ChromeGroupSlot,
  type ColumnGroupToggleProps,
  columnHeaderControllerFor,
  type CssProperties,
  desktopTableStyle,
  type HeaderGroupCell,
  type HtmlGroupedHeaderCell,
  sortIndexOf,
  sortLevelOf,
} from "@adapttable/core/binding";
import { computed, type ComputedRef, type VNodeChild } from "vue";

import { type Attrs, toVueAttrs } from "../attrs";
import type { CellContext, ColumnDef, HeaderContext } from "../columnDef";
import type {
  GroupRowModel,
  RowDetailModel,
  TreeCellModel,
} from "../hierarchy/models";
import type { SelectionCheckboxAttrs } from "../selection/checkboxControl";
import type { RowSelection } from "../selection/selection";
import type { UseDataTableResult } from "../useDataTable";
import type { RowActionControl } from "./modelChannels";
import type { TableSummaryModel } from "./tableSummaryModel";
export type TableBodySlot<TRow> = (
  | Exclude<
      ChromeBodySlot<TRow, TableRowModel<TRow>, VNodeChild, CssProperties>,
      ChromeExtraSlot<VNodeChild, CssProperties> | ChromeGroupSlot<TRow>
    >
  | (ChromeGroupSlot<TRow> & { readonly model?: GroupRowModel<TRow> })
  | (ChromeExtraSlot<VNodeChild, CssProperties> & {
      readonly coveredSlots?: ReadonlySet<number>;
    })
) & { readonly attrs?: Attrs };
export interface TableCellModel<TRow> {
  readonly key: string;
  readonly attrs: Attrs;
  readonly context: CellContext<TRow>;
  readonly render?: (display: VNodeChild) => VNodeChild;
  readonly tree?: TreeCellModel<TRow>;
  readonly addon?: (className?: string) => VNodeChild;
}
export interface TableRowModel<TRow> {
  readonly key: string;
  readonly row: TRow;
  readonly summary?: boolean;
  readonly reorder?: (mobile: boolean) => VNodeChild;
  readonly detail?: RowDetailModel;
  readonly expandCellAttrs?: Attrs;
  readonly actionControls?: readonly RowActionControl<TRow>[];
  readonly editActions?: () => VNodeChild;
  readonly index: number;
  readonly attrs: Attrs;
  readonly checkboxAttrs?: SelectionCheckboxAttrs;
  readonly cells: readonly TableCellModel<TRow>[];
}
export interface TableHeaderModel<TRow> {
  readonly key: string;
  readonly column: ColumnDef<TRow>;
  readonly attrs: Attrs;
  readonly sortAttrs?: Attrs;
  readonly resizeAttrs?: Attrs;
  readonly selection?: (className?: string) => VNodeChild;
  readonly rename?: (
    content: VNodeChild,
    classNames?: Readonly<Record<string, string | undefined>>
  ) => VNodeChild;
  readonly filter?: (className?: string) => VNodeChild;
  readonly context: HeaderContext<TRow>;
}
export interface DesktopTableModel<TRow> {
  readonly summary?: TableSummaryModel<TRow>;
  readonly attrs: Attrs;
  readonly headerRowAttrs: Attrs;
  readonly headers: readonly TableHeaderModel<TRow>[];
  readonly rows: readonly TableRowModel<TRow>[];
  readonly bodySlots?: readonly TableBodySlot<TRow>[];
  readonly headerCheckboxAttrs?: SelectionCheckboxAttrs;
  readonly columnCount: number;
  readonly actionsLabel?: string;
  readonly reorderLabel?: string;
  readonly expandLabel?: string;
  readonly columnSpacers?: { readonly start: number; readonly end: number };
  readonly groupToggleProps: (
    cell: HeaderGroupCell
  ) => ColumnGroupToggleProps | undefined;
  readonly headerPlan: HtmlGroupedHeaderCell[][] | null;
}
export interface MobileCardsModel<TRow> {
  readonly summary?: TableSummaryModel<TRow>;
  readonly attrs: Attrs;
  readonly rows: readonly TableRowModel<TRow>[];
  readonly bodySlots?: readonly TableBodySlot<TRow>[];
}
/**
 * A row's cells, built the first time they are read and current after that.
 *
 * A row model is created for every row of the table, but a windowed body
 * renders only the rows on screen. Building each row's cells — a value and
 * attributes per column — on first read means a large dataset builds cells for
 * the rows that are drawn, not for every row. The cells are a computed, so a
 * host accessor or layout change still reaches the rows that were read.
 */
export function lazyCells<TRow>(
  build: () => readonly TableCellModel<TRow>[]
): () => readonly TableCellModel<TRow>[] {
  let cells: ComputedRef<readonly TableCellModel<TRow>[]> | undefined;
  return () => {
    cells ??= computed(build);
    return cells.value;
  };
}

/** One desktop row's cells: each column's value and cell attributes. */
function desktopCells<TRow>(
  table: UseDataTableResult<TRow>,
  row: TRow,
  index: number
): readonly TableCellModel<TRow>[] {
  return table.columns.value.map((column) => ({
    key: column.key,
    attrs: {
      ...table.cellAttrs(column),
      "data-flash": table.isCellFlashing(row, column.key) ? "" : undefined,
    },
    context: {
      row,
      rowIndex: index,
      column,
      value: table.cellValue(column, row),
    },
  }));
}

/** A card's cells: the desktop row's, addressed by column key. */
function cardCells<TRow>(
  row: TableRowModel<TRow>
): readonly TableCellModel<TRow>[] {
  return row.cells.map((cell) => ({
    ...cell,
    attrs: {
      "data-column-key": cell.key,
      "data-flash": cell.attrs["data-flash"],
    },
  }));
}
/**
 * A desktop row's model, kept while its row object, position and selection
 * are unchanged: a change to other rows' data, or a recompute of the table
 * model, hands an unchanged row the same model, so it does not redraw. What
 * the row draws from the table's state (attributes, checkbox, cells) is read
 * when the row is drawn, so a kept model stays current.
 */
/**
 * A computed whose value keeps the previous object while the next one has
 * the same entries: attributes are rebuilt as new objects on every read.
 */
export function keptAttrs<T extends object | undefined>(
  read: () => T
): ComputedRef<T> {
  return computed<T>((previous) => {
    const next = read();
    if (!previous || !next) return next;
    return sameAttrs(
      previous as Readonly<Record<string, unknown>>,
      next as Readonly<Record<string, unknown>>
    )
      ? previous
      : next;
  });
}

/**
 * Whether two attribute objects draw the same: the same keys, each value the
 * same, and a `style` object compared by its entries, since styles are
 * rebuilt as new objects.
 */
export function sameAttrs(
  previous: Readonly<Record<string, unknown>>,
  next: Readonly<Record<string, unknown>>
): boolean {
  const keys = Object.keys(next);
  return (
    keys.length === Object.keys(previous).length &&
    keys.every((key) =>
      key === "style"
        ? sameEntries(previous[key], next[key])
        : Object.is(previous[key], next[key])
    )
  );
}

/** Whether two values are the same, or plain objects with the same entries. */
function sameEntries(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true;
  if (!isKeyable(previous) || !isKeyable(next)) return false;
  const before = previous as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const keys = Object.keys(after);
  return (
    keys.length === Object.keys(before).length &&
    keys.every((key) => Object.is(before[key], after[key]))
  );
}

/** Whether a value can key a weak map. */
function isKeyable(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/**
 * A desktop row's model, kept while its row object and position are
 * unchanged: a change to other rows' data, or a recompute of the table model,
 * hands an unchanged row the same model, so it does not redraw. What the row
 * draws from the table's state (attributes, checkbox, cells) is read when the
 * row is drawn, through the current selection, so a kept model stays current.
 */
function keptRowModels<TRow>(
  table: UseDataTableResult<TRow>,
  selection: () => RowSelection | undefined
): (row: TRow, index: number) => TableRowModel<TRow> {
  const kept = new WeakMap<
    object,
    { readonly index: number; readonly model: TableRowModel<TRow> }
  >();
  const build = (row: TRow, index: number): TableRowModel<TRow> => {
    const key = table.rowKey(row);
    const cells = lazyCells(() => desktopCells(table, row, index));
    const attrs = keptAttrs(() => table.rowAttrs(row, index, {}));
    const checkboxAttrs = keptAttrs(() => selection()?.rowCheckboxAttrs(key));
    return {
      key,
      row,
      index,
      get attrs() {
        return attrs.value;
      },
      get checkboxAttrs() {
        return checkboxAttrs.value;
      },
      get cells() {
        return cells();
      },
    };
  };
  return (row, index) => {
    if (!isKeyable(row)) return build(row, index);
    const previous = kept.get(row);
    if (previous?.index === index) return previous.model;
    const model = build(row, index);
    kept.set(row, { index, model });
    return model;
  };
}

export function useDesktopTableModel<TRow>(
  table: UseDataTableResult<TRow>,
  selection?: () => RowSelection | undefined,
  fitColumns?: () => boolean,
  expandLabel?: () => string | undefined
): ComputedRef<DesktopTableModel<TRow>> {
  const rowModel = keptRowModels(table, () => selection?.());
  return computed(() => {
    const selected = selection?.();
    const expansion = expandLabel?.();
    const headers = table.columns.value.map((column) => {
      const source = table.source.value;
      const sortLevel = sortLevelOf(source.sortLevels, column.key);
      const controller = columnHeaderControllerFor(column, {
        sortDir: sortLevel?.dir,
        sortIndex: sortIndexOf(source.sortLevels, column.key),
        toggleSort: (event) => table.toggleSort(column.key, event),
      });
      return {
        key: column.key,
        column,
        attrs: table.headerCellAttrs(column),
        sortAttrs: column.sortable ? table.sortButtonAttrs(column) : undefined,
        context: {
          column,
          label:
            typeof controller.label === "string"
              ? controller.label
              : column.key,
          sortDir: controller.sortDir,
          sortIndex: controller.sortIndex,
          toggleSort: controller.toggleSort,
        },
      };
    });
    return {
      attrs: toVueAttrs({
        ...table.tableAttrs(),
        style: desktopTableStyle(table.columns.value, {
          columnWidths: table.columnWidths.value,
          extraMinWidth: (selected ? 40 : 0) + (expansion ? 40 : 0),
          fitColumns: fitColumns?.(),
        }),
      }),
      headerRowAttrs: table.headerRowAttrs(),
      headers,
      headerPlan: table.headerPlan.value,
      groupToggleProps: (cell) =>
        cell.collapsible && cell.id !== null
          ? {
              cell,
              labels: table.labels.value,
              onToggle: table.layout.value.toggleColumnGroup,
            }
          : undefined,
      headerCheckboxAttrs: selected?.headerCheckboxAttrs(),
      expandLabel: expansion,
      columnCount: headers.length + (selected ? 1 : 0) + (expansion ? 1 : 0),
      rows: table.rows.value.map((row, index) => rowModel(row, index)),
    };
  });
}
export function useMobileCardsModel<TRow>(
  table: UseDataTableResult<TRow>,
  desktop: ComputedRef<DesktopTableModel<TRow>>
): ComputedRef<MobileCardsModel<TRow>> {
  return computed(() => ({
    attrs: {
      ...table.tableAttrs(),
      role: "list",
      "aria-rowcount": undefined,
      "aria-colcount": undefined,
      "data-adapttable-part": "cards",
    },
    rows: desktop.value.rows.map((row) => {
      const cells = lazyCells(() => cardCells(row));
      return {
        key: row.key,
        row: row.row,
        index: row.index,
        checkboxAttrs: row.checkboxAttrs,
        attrs: { ...table.cardAttrs(row.row, row.index, {}), role: "listitem" },
        get cells() {
          return cells();
        },
      };
    }),
  }));
}
export { renderCell, renderHeader } from "../columnDef";
