/**
 * Which rows are pinned, kept in the URL.
 */
import { rowPinningSlice } from "@adapttable/core";
import type { RowPinState } from "@adapttable/core/binding";
import type { Signal } from "@angular/core";

import { injectUrlSlice, type UrlSliceOptions } from "./urlSlice";

/** The pinned-rows slice takes no configuration. */
const NO_CONFIG = {};

/**
 * The pinned rows in the URL.
 *
 * @public
 */
export interface RowPinningUrlState {
  /** The pinned rows, by side. */
  readonly pinnedRowIds: Signal<RowPinState>;
  /** Write the pinned rows. */
  readonly onPinnedRowIdsChange: (pinned: RowPinState) => void;
}

/**
 * Keep a table's pinned rows in the URL.
 *
 * @param options - See {@link UrlSliceOptions}.
 * @returns See {@link RowPinningUrlState}.
 *
 * @public
 */
export function injectRowPinningUrlState(
  options: UrlSliceOptions = {}
): RowPinningUrlState {
  const slice = injectUrlSlice(options, rowPinningSlice, NO_CONFIG);
  return { pinnedRowIds: slice.value, onPinnedRowIdsChange: slice.set };
}
