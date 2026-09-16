/**
 * The React face of the neutral `aggregate` helper.
 */
import {
  aggregate as neutralAggregate,
  type AggregateOptions,
  type AggregateSpec,
} from "@adapttable/core";

import type { SummaryRowFn } from "../props";

/**
 * Build a summary mapper from a per-column aggregate spec.
 *
 * `@adapttable/core` exports the same helper typed with its neutral
 * `DisplayValue` (`unknown`), because a non-React binding may store whatever
 * it renders. Here the cells are React's, so the mapper is a
 * {@link SummaryRowFn} and drops straight into `summaryRow` or
 * `groupAggregates`.
 *
 * @public
 */
export function aggregate<TRow>(
  spec: AggregateSpec,
  options: AggregateOptions<TRow> = {}
): SummaryRowFn<TRow> {
  // Same object, one narrower declaration: every value the neutral helper
  // produces is a string, a number or whatever a custom aggregator returned,
  // and React renders all of those.
  return neutralAggregate<TRow>(spec, options) as SummaryRowFn<TRow>;
}
