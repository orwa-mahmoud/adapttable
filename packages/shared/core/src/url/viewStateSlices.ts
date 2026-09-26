/**
 * The opt-in slices of view state that live in the URL beside the table's
 * query state: column layout, density, collapsed groups and pinned rows.
 * Each is a spec for `createUrlSliceStore`.
 */
import {
  type ColumnLayoutState,
  EMPTY_COLUMN_LAYOUT,
} from "../columns/columnLayoutModel";
import { EMPTY_ROW_PIN_STATE, type RowPinState } from "../rows/rowPinModel";
import { memoLast } from "../utils/memoLast";
import { stableKey } from "../utils/stableKey";
import {
  PARAM_COL_HIDDEN,
  PARAM_DENSITY,
  PARAM_GROUP_CLOSED,
  readCollapsedGroups,
  readColumnLayout,
  readRowPins,
  writeCollapsedGroups,
  writeColumnLayout,
  writeRowPins,
} from "./serialize";
import type { UrlSliceSpec } from "./viewStateStore";

/**
 * Trailing debounce for a slice a reader changes continuously — a resize
 * drag commits one layout per frame, a formula bar one list per keystroke —
 * and `history.replaceState` at that rate trips Safari's limit (~100 calls
 * per 30s, then it throws). Reads stay instant through the optimistic
 * overlay; the write waits, which also bridges a router whose navigation
 * lands a tick later.
 *
 * @public
 */
export const URL_SLICE_WRITE_DEBOUNCE_MS = 150;

/** The layout a URL without one reads as, cached per default. */
const columnLayoutFallback = memoLast(
  (defaultColumnLayout: Partial<ColumnLayoutState> | undefined) => ({
    ...EMPTY_COLUMN_LAYOUT,
    ...defaultColumnLayout,
  })
);

/**
 * Column layout: which columns are hidden, pinned, reordered or resized.
 *
 * The default applies only while the URL carries no layout. An explicitly
 * emptied layout writes an empty `colHide=` marker so the default does not
 * resurrect; a change back to the exact default clears the params instead.
 *
 * @public
 */
export const columnLayoutSlice: UrlSliceSpec<
  ColumnLayoutState,
  { readonly defaultColumnLayout?: Partial<ColumnLayoutState> }
> = {
  read(params, ns, { defaultColumnLayout }) {
    return (
      readColumnLayout(params, ns) ?? columnLayoutFallback(defaultColumnLayout)
    );
  },
  write(params, value, ns, { defaultColumnLayout }) {
    const fallback = columnLayoutFallback(defaultColumnLayout);
    const isDefault = stableKey(value) === stableKey(fallback);
    const isEmpty = stableKey(value) === stableKey(EMPTY_COLUMN_LAYOUT);
    writeColumnLayout(params, isDefault ? EMPTY_COLUMN_LAYOUT : value, ns);
    // An all-empty layout writes no params, which reads back as "use the
    // default" — stamp a marker so an explicitly emptied layout sticks.
    if (isEmpty && !isDefault) params.set(ns + PARAM_COL_HIDDEN, "");
  },
  writeDebounceMs: URL_SLICE_WRITE_DEBOUNCE_MS,
};

/**
 * The two row densities a table has.
 *
 * @public
 */
export type TableDensity = "comfortable" | "compact";

/**
 * Row density. The default writes no parameter: a URL carries what someone
 * chose, not what the table would have done anyway.
 *
 * @public
 */
export const densitySlice: UrlSliceSpec<
  TableDensity,
  { readonly defaultDensity?: TableDensity }
> = {
  read(params, ns, { defaultDensity }) {
    const raw = params.get(`${ns}${PARAM_DENSITY}`);
    return raw === "compact" || raw === "comfortable"
      ? raw
      : (defaultDensity ?? "comfortable");
  },
  write(params, value, ns, { defaultDensity }) {
    if (value === (defaultDensity ?? "comfortable")) {
      params.delete(`${ns}${PARAM_DENSITY}`);
    } else {
      params.set(`${ns}${PARAM_DENSITY}`, value);
    }
  },
  writeDebounceMs: URL_SLICE_WRITE_DEBOUNCE_MS,
};

/**
 * Collapsed groups. An emptied set stamps an empty marker when there is a
 * default to displace, or the default would re-apply.
 *
 * @public
 */
export const groupCollapseSlice: UrlSliceSpec<
  string[],
  { readonly defaultCollapsedGroupIds?: readonly string[] }
> = {
  read(params, ns, { defaultCollapsedGroupIds }) {
    return (
      readCollapsedGroups(params, ns) ?? [...(defaultCollapsedGroupIds ?? [])]
    );
  },
  write(params, value, ns, { defaultCollapsedGroupIds }) {
    writeCollapsedGroups(params, value, ns);
    if (value.length === 0 && (defaultCollapsedGroupIds?.length ?? 0) > 0) {
      params.set(ns + PARAM_GROUP_CLOSED, "");
    }
  },
};

/**
 * Pinned rows: the lists kept above and below the scrolled body.
 *
 * @public
 */
export const rowPinningSlice: UrlSliceSpec<RowPinState, object> = {
  read: (params, ns) => readRowPins(params, ns) ?? EMPTY_ROW_PIN_STATE,
  write: (params, value, ns) => writeRowPins(params, value, ns),
};
