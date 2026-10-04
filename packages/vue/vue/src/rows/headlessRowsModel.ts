/** Optional body assembly shared by data-row features, never adapter orchestration. */
import {
  buildBodyCells,
  type CellSpanAppearance,
  type CssProperties,
  type ExtraRow as NeutralExtraRow,
  type GetCellSpan,
  partitionPinnedRows,
  type PinnedRows,
  pinnedSummaryPart,
  resolvePinnedRows,
  type RowHeight,
  type RowStyle,
} from "@adapttable/core";
import {
  type BodyCell,
  cellSpanMark,
  desktopBodySlots,
  type DesktopRowWiringArgs,
  extraCoveredTableSlots,
  extraHostFillStyle,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
  mergedCellStyle,
  pinnedRowCellStyle,
  pinnedRowPart,
  resolveCellSpan,
  resolveRowStyle,
} from "@adapttable/core/binding";
import { toValue, type VNodeChild } from "vue";

import { mergeVueAttrs } from "../attrs";
import type { ColumnDef } from "../columnDef";
import {
  hierarchyCell,
  hierarchyDetail,
  hierarchyRowAttrs,
} from "../hierarchy/rowControls";
import { tableRowInventory } from "../hierarchy/rowInventory";
import type {
  TableBodyProjection,
  TableBodyProjectionInput,
} from "../layout/modelChannels";
import type { TableBodySlot, TableRowModel } from "../layout/tableModels";
import type { ExtraRow } from "./extraRows";
export interface HeadlessRowsOptions<TRow> {
  readonly getCellSpan?: GetCellSpan<TRow>;
  readonly cellSpanAppearance?: CellSpanAppearance;
  readonly extraRows?: readonly ExtraRow[];
  readonly pinnedRows?: PinnedRows<TRow>;
  readonly rowClassName?: (row: TRow, index: number) => string | undefined;
  readonly rowStyle?: RowStyle<TRow>;
  readonly rowHeight?: RowHeight<TRow>;
  readonly rowPinOffset?: number;
}
/** A body slot keeps native-to-Vue content without rendering controls. @public */
export type HeadlessBodySlot<TRow> = TableBodySlot<TRow>;
/** Geometry, extras and presentation use the existing neutral body assembler. @public */
export function projectHeadlessRows<TRow>(
  input: TableBodyProjectionInput<TRow>
): TableBodyProjection<TRow> {
  const { table, desktop, mobile, grouping, tree, detail, selection } = input;
  const pinning = grouping || tree ? undefined : input.pinning;
  const options = input.options as HeadlessRowsOptions<TRow>;
  const rows = table.rows.value;
  const columns = table.columns.value;
  const base = new Map(desktop.rows.map((row) => [row.key, row]));
  const cardBase = new Map(mobile.rows.map((row) => [row.key, row]));
  const partition = pinning
    ? partitionPinnedRows(rows, pinning.state, table.rowKey)
    : { top: [], scroll: rows, bottom: [] };
  const visual = (
    input.rowInventory ??
    tableRowInventory({
      rows,
      rowKey: table.rowKey,
      grouping,
      tree,
      pinning,
    })
  ).visibleRows;
  const visualIds = visual.map(table.rowKey);
  const summary = resolvePinnedRows(toValue(options.pinnedRows));
  const extras = options.extraRows as readonly NeutralExtraRow[] | undefined;
  // A data-cell span cannot cross a structural group or open detail row.
  // Core still resolves, clamps and clips the actual geometry.
  const groupFor = new Map(
    grouping?.entries.flatMap((entry) =>
      entry.kind === "row" ? [[entry.key, entry.groupKey] as const] : []
    )
  );
  const runs: number[] = [];
  for (let index = visual.length - 1; index >= 0; index--) {
    const id = visualIds[index];
    const nextId = visualIds[index + 1];
    if (id === undefined) continue;
    runs[index] =
      index + 1 < visual.length &&
      !detail?.expansion.isExpanded(id) &&
      (!grouping ||
        (nextId !== undefined && groupFor.get(id) === groupFor.get(nextId)))
        ? 1 + (runs[index + 1] ?? 0)
        : 1;
  }
  const rawCells = buildBodyCells({
    rows: visual,
    columns,
    getRowId: table.rowKey,
    getCellSpan:
      grouping || detail
        ? (args) =>
            resolveCellSpan(
              args,
              options.getCellSpan,
              columns.length - args.columnIndex,
              runs[args.sectionRowIndex] ?? 1
            )
        : options.getCellSpan,
    firstRowIndex: table.windowStart.value,
    pinOffset: table.layout.value.pinOffset,
  });
  const cells = inflateBodyCellRowSpans(rawCells, visualIds, extras);
  const dataIndex = new Map(
    rows.map((row, index) => [table.rowKey(row), index])
  );
  const make = (
    args: DesktopRowWiringArgs<TRow>,
    card: boolean
  ): TableRowModel<TRow> => {
    const { row, id, summary: isSummary, rowPinSide, treeEntry } = args;
    const index = isSummary
      ? args.index
      : table.windowStart.value + (dataIndex.get(id) ?? args.index);
    const previousRows = card ? cardBase : base;
    const prior = isSummary ? undefined : previousRows.get(id);
    const rowCells: readonly BodyCell<TRow>[] =
      card || isSummary
        ? columns.map((column, columnIndex) => ({
            column,
            columnIndex,
            colSpan: 1,
            rowSpan: 1,
          }))
        : (cells.get(id) ?? []);
    const part = isSummary
      ? pinnedSummaryPart(rowPinSide ?? "top")
      : pinnedRowPart(rowPinSide);
    let rowAttrs = card
      ? { ...table.cardAttrs(row, args.index), role: "listitem" }
      : (prior?.attrs ?? table.rowAttrs(row, args.index));
    if (isSummary)
      rowAttrs = {
        "data-adapttable-part": part,
        "data-row-id": id,
        ...(card ? { role: "listitem" } : {}),
      };
    return {
      key: id,
      row,
      index,
      summary: isSummary,
      checkboxAttrs: isSummary
        ? undefined
        : (prior?.checkboxAttrs ?? selection?.rowCheckboxAttrs(id)),
      detail: hierarchyDetail(
        row,
        id,
        isSummary ? undefined : detail,
        table.labels.value
      ),
      attrs: mergeVueAttrs(rowAttrs, {
        class: options.rowClassName?.(row, index),
        ...hierarchyRowAttrs(treeEntry, card),
        style: {
          ...resolveRowStyle(options.rowStyle, options.rowHeight, row, index),
          ...(hierarchyRowAttrs(treeEntry, card).style as object | undefined),
        },
        ...(part ? { "data-adapttable-part": part } : {}),
      }),
      cells: rowCells.map((cell) => {
        const column = cell.column as ColumnDef<TRow>;
        const span = !card
          ? cellSpanMark(cell.colSpan, cell.rowSpan)
          : undefined;
        const spanAttrs = !card
          ? {
              colspan: cell.colSpan,
              rowspan: cell.rowSpan,
              "data-cell-span": span,
              "data-cell-span-appearance": span
                ? (options.cellSpanAppearance ?? "merged")
                : undefined,
            }
          : {};
        return {
          key: column.key,
          tree: hierarchyCell({
            columnKey: column.key,
            entry: treeEntry,
            tree,
            labels: table.labels.value,
            dir: () => table.dir.value,
            card,
          }),
          context: {
            row,
            rowIndex: index,
            column,
            value: table.cellValue(column, row),
          },
          attrs: mergeVueAttrs(
            card ? { "data-column-key": column.key } : table.cellAttrs(column),
            {
              ...spanAttrs,
              ...(!card && tree && !grouping ? { role: "gridcell" } : {}),
              style: card
                ? undefined
                : {
                    ...pinnedRowCellStyle(
                      rowPinSide,
                      options.rowPinOffset ?? 0,
                      table.layout.value.pinOffset(column.key) !== undefined
                    ),
                    ...mergedCellStyle(
                      cell.colSpan,
                      cell.rowSpan,
                      options.cellSpanAppearance
                    ),
                  },
            }
          ),
        };
      }),
    };
  };
  const slots = (card: boolean): readonly HeadlessBodySlot<TRow>[] =>
    desktopBodySlots<TRow, TableRowModel<TRow>, VNodeChild, CssProperties>({
      rows,
      getRowId: table.rowKey,
      pinnedTopRows: partition.top,
      pinnedBottomRows: partition.bottom,
      pinnedSummaryTop: summary.top,
      pinnedSummaryBottom: summary.bottom,
      extraRows: extras,
      extraFill: (key) =>
        extraHostFillStyle(key, extras, rows, table.rowKey, options.rowStyle),
      insertExtraRows,
      insertExtrasBeforeRows,
      paddingTop: 0,
      paddingBottom: 0,
      grouping,
      tree: grouping ? undefined : tree,
      entries: partition.scroll.map((row) => ({
        row,
        key: table.rowKey(row),
        index: dataIndex.get(table.rowKey(row)) ?? 0,
      })),
      columnSpan: desktop.columnCount,
      wiring: (args) => make(args, card),
    }).map((slot) => {
      if (slot.kind === "group" && grouping)
        return {
          ...slot,
          model: {
            columns,
            labels: table.labels.value,
            leadingColumns: desktop.headerCheckboxAttrs ? 1 : 0,
            trailingColumns: desktop.actionsLabel ? 1 : 0,
            selection: selection?.state.value,
            onToggle: grouping.collapsed.toggle,
            onShowMore: grouping.showMore,
          },
        };
      if (slot.kind !== "extra" || card) return slot;
      const beforeId = options.extraRows?.find(
        (extra) => extra.key === slot.key
      )?.beforeRowId;
      return beforeId
        ? {
            ...slot,
            coveredSlots: extraCoveredTableSlots(beforeId, {
              visualIds,
              cellsByRow: cells,
              extraRows: extras,
              leadingCells: desktop.headerCheckboxAttrs ? 1 : 0,
            }),
          }
        : slot;
    });
  return {
    desktop: {
      ...desktop,
      attrs:
        tree && !grouping
          ? {
              ...desktop.attrs,
              role: "treegrid",
              "aria-rowcount": tree.entries.length + 1,
            }
          : desktop.attrs,
      bodySlots: slots(false),
    },
    mobile: { ...mobile, bodySlots: slots(true) },
  };
}
