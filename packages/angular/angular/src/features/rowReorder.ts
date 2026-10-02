/**
 * Row reorder feature factory for Angular.
 */
import type { RowReorderHandler, RowReorderOptions } from "@adapttable/core";

import type { AdaptTableFeature } from "../featureHost";

/**
 * A row-reorder feature that also carries the host's write and options.
 */
interface RowReorderFeature<TRow> extends AdaptTableFeature {
  readonly onRowReorder: RowReorderHandler<TRow>;
  readonly options?: RowReorderOptions<TRow>;
}

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
  return {
    id: "row-reorder",
    onRowReorder,
    options,
  } as RowReorderFeature<TRow>;
}

export type { RowReorderFeature };
