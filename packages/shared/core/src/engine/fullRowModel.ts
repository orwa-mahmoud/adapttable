/**
 * The full evaluator: filter, sort, search, grouping and aggregates. The
 * convenience engine injects this.
 */
import { groupsAndTotals } from "../rows/groupsAndTotals";
import { createRowModel } from "./basicRowModel";
import type { RowModel } from "./rowModelContract";

/** The row evaluator with its groups and totals stage. */
export function createFullRowModel<TRow>(): RowModel<TRow> {
  return createRowModel(groupsAndTotals<TRow>());
}
