/**
 * Pinned rows, in the URL.
 *
 * Which rows stay put is part of what a shared link means — "look at these
 * two, they stay on screen". Pair it with `<DataTable pinnedRowIds
 * onPinnedRowIdsChange>` and the lists travel with the address. The
 * batteries-included shell also writes this when pinning is armed and the
 * host has not taken control.
 */

import {
  rowPinningSlice,
  type UseRowPinningUrlStateResult,
} from "@adapttable/core/binding";

import type { UrlStateAdapter } from "./adapter";
import { useUrlSlice } from "./useUrlSlice";
export type { UseRowPinningUrlStateResult } from "@adapttable/core/binding";

/** Pinned rows take no configuration. */
const NO_CONFIG = {};

/**
 * What {@link useRowPinningUrlState} needs.
 *
 * @public
 */
export interface UseRowPinningUrlStateOptions {
  /** URL backend; defaults to the History API. */
  urlAdapter?: UrlStateAdapter;
  /** Sync to the URL at all. Defaults to `true`. */
  urlSync?: boolean;
  /** Namespace, when several tables share a page. */
  urlKey?: string;
}

/**
 * Keep pinned rows in the URL.
 *
 * @param options - See {@link UseRowPinningUrlStateOptions}.
 * @returns The controlled pair to spread onto the table.
 *
 * @public
 */
export function useRowPinningUrlState(
  options: UseRowPinningUrlStateOptions = {}
): UseRowPinningUrlStateResult {
  const [pinnedRowIds, onPinnedRowIdsChange] = useUrlSlice(
    options,
    rowPinningSlice,
    NO_CONFIG
  );
  return { pinnedRowIds, onPinnedRowIdsChange };
}
