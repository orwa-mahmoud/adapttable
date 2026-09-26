/**
 * The pivot's slice of view state: its configuration and its folded subtotal
 * lines, in one URL param. A spec for `createUrlSliceStore`.
 */
import { PARAM_PIVOT } from "../url/serialize";
import { URL_SLICE_WRITE_DEBOUNCE_MS } from "../url/viewStateSlices";
import type { UrlSliceSpec } from "../url/viewStateStore";
import { memoLast } from "../utils/memoLast";
import { EMPTY_PIVOT_CONFIG } from "./pivotConfigModel";
import type { PivotConfig } from "./pivotModel";
import {
  deserializePivotState,
  type PivotUrlState,
  serializePivotState,
} from "./pivotUrlCodec";

/** Nothing folded, with a stable identity so a read cannot churn a memo. */
const NOTHING_COLLAPSED: readonly string[] = [];

/** The pivot a URL without one reads as, cached per default. */
const pivotFallback = memoLast((config: PivotConfig): PivotUrlState => ({
  config,
  collapsed: NOTHING_COLLAPSED,
}));

/**
 * The pivot: its configuration and its folded subtotal lines, in one param.
 * An empty pivot writes no parameter.
 *
 * @public
 */
export const pivotSlice: UrlSliceSpec<
  PivotUrlState,
  { readonly defaultConfig?: PivotConfig }
> = {
  read(params, ns, { defaultConfig }) {
    const raw = params.get(`${ns}${PARAM_PIVOT}`);
    if (raw === null) {
      return pivotFallback(defaultConfig ?? EMPTY_PIVOT_CONFIG);
    }
    return deserializePivotState(raw);
  },
  write(params, value, ns) {
    const encoded = serializePivotState(value);
    if (encoded === "") params.delete(`${ns}${PARAM_PIVOT}`);
    else params.set(`${ns}${PARAM_PIVOT}`, encoded);
  },
  writeDebounceMs: URL_SLICE_WRITE_DEBOUNCE_MS,
};
