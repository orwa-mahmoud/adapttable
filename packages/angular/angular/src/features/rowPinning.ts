import {
  type AdaptTableFeature,
  FEATURE_IMPLEMENTATIONS,
  injectRowPinning,
  injectRowPinningUrlState,
  type MaybeSignal,
  type RowPinningImplementation,
  withFeatureImplementation,
} from "@adapttable/angular";
import {
  partitionPinnedRows,
  rowPinningControl,
  type RowPinState,
} from "@adapttable/core";

/** Pinning's code, filed by {@link rowPinning}. */
const ROW_PINNING_IMPLEMENTATION: RowPinningImplementation = {
  url: injectRowPinningUrlState,
  control: rowPinningControl,
  state: injectRowPinning,
  partition: partitionPinnedRows,
};
import { coreRowPinning } from "@adapttable/core/binding";

/**
 * Options for {@link rowPinning}.
 *
 * @public
 */
export interface RowPinningFeatureOptions {
  /**
   * The host's pin lists. Pass a signal to follow changes; clear both lists
   * to unpin all.
   */
  readonly pinnedRowIds?: MaybeSignal<RowPinState>;
  /** Told the next lists whenever a row is pinned or unpinned. */
  readonly onPinnedRowIdsChange?: (next: RowPinState) => void;
}

/**
 * Let rows be pinned to the top or bottom. A bare `rowPinning()` runs
 * uncontrolled: the table holds the lists and writes them to the URL as
 * `rowPin` unless the table does not sync the URL. Pass `pinnedRowIds` to
 * hold them, or `onPinnedRowIdsChange` to observe them.
 *
 * @param options - See {@link RowPinningFeatureOptions}.
 * @returns The feature.
 *
 * @public
 */
export function rowPinning(
  options: RowPinningFeatureOptions = {}
): AdaptTableFeature {
  return withFeatureImplementation(
    coreRowPinning({ ...options }),
    FEATURE_IMPLEMENTATIONS.rowPinning,
    ROW_PINNING_IMPLEMENTATION
  );
}
