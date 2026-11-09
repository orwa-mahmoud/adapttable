/**
 * The full evaluator: filter, sort, search, grouping, aggregates, and the
 * patch-index path. The convenience engine injects this.
 */
import {
  applyRowPatchLogToView,
  createIncrementalView,
  forkIncrementalView,
  reconfigureIncrementalView,
} from "../rows/incremental";
import type { RowModel } from "./rowModelContract";

/** The incremental row model, including grouping and aggregates. */
export function createFullRowModel<TRow>(): RowModel<TRow> {
  return {
    create: (rows, config) => createIncrementalView(rows, config),
    reconfigure: (view, patch, cleared) =>
      reconfigureIncrementalView(view, patch, cleared),
    applyPatch: (view, log) => applyRowPatchLogToView(view, log),
    fork: (view) => forkIncrementalView(view),
  };
}
