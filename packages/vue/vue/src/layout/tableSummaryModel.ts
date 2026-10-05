/** Footer values and effective columns, shared by every Vue adapter. */
import { incrementalViewOf } from "@adapttable/core";
import { computed, type ComputedRef } from "vue";

import type { SummaryRowFn } from "../aggregate/aggregate";
import type { Attrs } from "../attrs";
import type { ColumnDef, FooterContext } from "../columnDef";
import type { UseDataTableResult } from "../useDataTable";

/** Values returned by a summary mapper, indexed by column key. */
export type SummaryCells = Readonly<Partial<Record<string, unknown>>>;

/** A footer cell shares its column's sizing and pinning, without row actions. */
export interface TableSummaryCellModel<TRow> {
  readonly key: string;
  readonly attrs: Attrs;
  readonly label: string;
  readonly context: FooterContext<TRow>;
}

/** Column-aligned summary content before a kit renders its table or cards. */
export interface TableSummaryModel<TRow> {
  readonly cells: readonly TableSummaryCellModel<TRow>[];
}

/**
 * Use the neutral incremental view's aggregates when present, otherwise run
 * the host mapper against the source's current row scope. Vue dependencies
 * read by a mapper remain reactive, including when the row array is unchanged.
 */
export function useSummaryCells<TRow>(
  rows: () => readonly TRow[],
  summaryRow: () => SummaryRowFn<TRow> | undefined
): ComputedRef<SummaryCells | undefined> {
  const builder = computed(summaryRow);
  const currentRows = computed(rows);
  const aggregates = computed(() => incrementalViewOf(rows())?.aggregates);
  return computed(() => aggregates.value ?? builder.value?.(currentRows.value));
}

/**
 * Build against the effective columns, after visibility, grouping and windowing.
 * Missing values keep their desktop cell; cards omit fields with no content.
 */
export function useTableSummaryModel<TRow>(
  table: UseDataTableResult<TRow>,
  columns: () => readonly ColumnDef<TRow>[],
  values: () => SummaryCells | undefined,
  hasFooterSlot: () => boolean
): ComputedRef<TableSummaryModel<TRow> | undefined> {
  return computed(() => {
    const current = columns();
    const summary = values();
    if (
      summary === undefined &&
      !hasFooterSlot() &&
      !current.some((column) => column.footer !== undefined)
    )
      return undefined;
    return {
      cells: current.map((column) => ({
        key: column.key,
        attrs: table.cellAttrs(column),
        label: column.mobileLabel ?? column.header ?? column.key,
        context: { column, value: summary?.[column.key] },
      })),
    };
  });
}
