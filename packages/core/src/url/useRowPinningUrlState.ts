/**
 * Pinned rows, in the URL.
 *
 * Which rows stay put is part of what a shared link means — "look at these
 * two, they stay on screen". Pair it with `<DataTable pinnedRowIds
 * onPinnedRowIdsChange>` and the lists travel with the address. The
 * batteries-included shell also writes this when pinning is armed and the
 * host has not taken control.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { EMPTY_ROW_PIN_STATE, type RowPinState } from "../rows/rowPinning";
import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";
import { readRowPins, writeRowPins } from "./serialize";

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
 * The controlled pair `<DataTable>` takes.
 *
 * @public
 */
export interface UseRowPinningUrlStateResult {
  /** The pin lists. */
  pinnedRowIds: RowPinState;
  /** Hand this to `onPinnedRowIdsChange`. */
  onPinnedRowIdsChange: (next: RowPinState) => void;
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
  const { urlAdapter, urlSync, urlKey } = options;
  const ns = urlKey ? `${urlKey}.` : "";
  const resolved = useResolvedAdapter(urlAdapter, urlSync ?? true);
  const search = useSyncExternalStore(
    (onChange) => resolved.subscribe(onChange),
    () => resolved.getSearch(),
    () => (urlAdapter ? urlAdapter.getSearch() : "")
  );
  const [pending, setPending] = useState<RowPinState | null>(null);

  const pinnedRowIds = useMemo(() => {
    if (pending) return pending;
    return readRowPins(new URLSearchParams(search), ns) ?? EMPTY_ROW_PIN_STATE;
  }, [ns, pending, search]);

  const onPinnedRowIdsChange = useCallback(
    (next: RowPinState) => {
      setPending(next);
      const params = new URLSearchParams(resolved.getSearch());
      writeRowPins(params, next, ns);
      resolved.setSearch(params.toString());
      setPending(null);
    },
    [ns, resolved]
  );

  return { pinnedRowIds, onPinnedRowIdsChange };
}
