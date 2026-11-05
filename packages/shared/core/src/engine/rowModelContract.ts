/**
 * The three operations a row model owes the session.
 *
 * `create`, `reconfigure`, and `applyPatch` evaluate rows. `fork` copies the
 * model's private cache so a candidate can write without touching the
 * committed handle. It is not a fourth derivation stage.
 */
import type { RowPatchLog } from "../contracts/rows";
import type {
  IncrementalView,
  IncrementalViewConfig,
} from "../rows/incremental";

/**
 * One evaluator the session can run. The session owns staging, commit,
 * discard, revisions, and subscriptions.
 *
 * @typeParam TRow - The row type.
 */
export interface RowModel<TRow> {
  /** Evaluate `rows` under `config`. */
  readonly create: (
    rows: readonly TRow[],
    config: IncrementalViewConfig<TRow>
  ) => IncrementalView<TRow>;
  /**
   * Merge `patch` into the view. `undefined` entries are ignored. `cleared`
   * names fields to remove. A callback-only change returns the same view.
   */
  readonly reconfigure: (
    view: IncrementalView<TRow>,
    patch: Partial<IncrementalViewConfig<TRow>>,
    cleared: readonly (keyof IncrementalViewConfig<TRow>)[]
  ) => IncrementalView<TRow>;
  /** Continue `view` from a patch log whose rows are already updated. */
  readonly applyPatch: (
    view: IncrementalView<TRow>,
    log: RowPatchLog<TRow>
  ) => IncrementalView<TRow>;
  /** A second view over the same row objects. */
  readonly fork: (view: IncrementalView<TRow>) => IncrementalView<TRow>;
}
