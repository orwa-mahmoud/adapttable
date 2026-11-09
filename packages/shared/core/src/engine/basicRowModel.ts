/**
 * The row models a table engine evaluates with: one evaluator, with or
 * without the stage after the query.
 *
 * The basic model filters, sorts and searches. It installs no groups and
 * totals stage, so a table that never groups loads none of that code. A
 * patch evaluates only the rows it inserted or changed.
 */
import {
  applyPatchLog,
  type DerivedStage,
  evaluateRows,
  reconfigureView,
} from "../rows/evaluator";
import type { RowModel } from "./rowModelContract";

/** The evaluator as a row model, with `stage` after the query. */
export function createRowModel<TRow>(
  stage?: DerivedStage<TRow>
): RowModel<TRow> {
  return {
    create: (rows, config) => evaluateRows(rows, config, stage),
    reconfigure: (view, patch, cleared) =>
      reconfigureView(view, patch, cleared, "new record"),
    applyPatch: applyPatchLog,
  };
}

/** Filter, sort, and search. No grouping and no aggregates. */
export function createBasicRowModel<TRow>(): RowModel<TRow> {
  return createRowModel<TRow>();
}
