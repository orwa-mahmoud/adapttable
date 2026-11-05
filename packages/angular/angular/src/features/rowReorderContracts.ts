import type { RowReorderHandler, RowReorderOptions } from "@adapttable/core";

import type { AdaptTableFeature } from "../featureHost";

/**
 * A row-reorder feature that also carries the host's write and options.
 */
export interface RowReorderFeature<TRow> extends AdaptTableFeature {
  readonly onRowReorder: RowReorderHandler<TRow>;
  readonly options?: RowReorderOptions<TRow>;
}
