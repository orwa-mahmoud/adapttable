/**
 * The Angular face of core's `aggregate` helper.
 */
import {
  aggregate as neutralAggregate,
  type AggregateOptions,
  type AggregateSpec,
  type SummaryRowFn,
} from "@adapttable/core";

export type {
  AggregateOptions,
  AggregateSpec,
  SummaryRowFn,
} from "@adapttable/core";

/**
 * Build a summary mapper from a per-column aggregate spec — what the table's
 * `summaryRow` and a grouping's `groupAggregates` take:
 * `aggregate({ budget: "sum", name: "count" })`.
 *
 * @param spec - The aggregate for each column key.
 * @param options - Columns, formatting and the live host's aggregators.
 * @returns The mapper from rows to one value per column.
 *
 * @public
 */
export function aggregate<TRow>(
  spec: AggregateSpec,
  options: AggregateOptions<TRow> = {}
): SummaryRowFn<TRow> {
  return neutralAggregate<TRow>(spec, options);
}
