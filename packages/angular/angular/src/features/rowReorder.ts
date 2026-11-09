/**
 * Row reorder feature factory for Angular.
 */
import {
  type AdaptTableFeature,
  FEATURE_IMPLEMENTATIONS,
  type RowReorderImplementation,
  withFeatureImplementation,
} from "@adapttable/angular";
import {
  createRowReorderController,
  isRowMovePending,
  type RowReorderHandler,
  type RowReorderOptions,
  rowReorderRowAttributes,
  rowReorderRuntimeOptions,
} from "@adapttable/core";

import type { RowReorderFeature } from "./rowReorderContracts";

/** The reorder state machine and its row helpers, filed by {@link rowReorder}. */
const ROW_REORDER_IMPLEMENTATION: RowReorderImplementation = {
  controller: createRowReorderController,
  runtimeOptions: rowReorderRuntimeOptions,
  rowAttributes: rowReorderRowAttributes,
  isMovePending: isRowMovePending,
};

/**
 * Let rows be dragged, or moved with the keyboard, into a new order.
 *
 * ```ts
 * import { rowReorder } from "@adapttable/angular-unstyled/row-reorder";
 *
 * features: [rowReorder((from, to) => reorder(from, to))]
 * ```
 *
 * The table never writes to your rows: the handler is told what moved where
 * and the new order is yours to apply.
 *
 * @param onRowReorder - The host's write for a reorder.
 * @param options - Move policy and cross-boundary handlers.
 * @returns The feature.
 *
 * @public
 */
export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
): AdaptTableFeature {
  return withFeatureImplementation(
    {
      id: "row-reorder",
      onRowReorder,
      options,
    } satisfies RowReorderFeature<TRow>,
    FEATURE_IMPLEMENTATIONS.rowReorder,
    ROW_REORDER_IMPLEMENTATION
  );
}
