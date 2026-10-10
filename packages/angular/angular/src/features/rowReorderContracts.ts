import type { AdaptTableFeature } from "@adapttable/angular";
import type { RowReorderHandler, RowReorderOptions } from "@adapttable/core";

/**
 * A row-reorder feature that also carries the host's write and options.
 */
export interface RowReorderFeature<TRow> extends AdaptTableFeature {
  readonly onRowReorder: RowReorderHandler<TRow>;
  readonly options?: RowReorderOptions<TRow>;
}
