/**
 * Collapsed groups, in the URL.
 *
 * Which groups are folded is part of what someone means when they send a link
 * to a table: "look at this, the other regions are in the way". So it belongs
 * in the address bar for the same reason sorting and filtering do — and it is
 * opt-in for the same reason column layout is, because a table with twenty
 * collapsed groups would otherwise write a long URL nobody asked for.
 *
 * Pair it with `<DataTable collapsedGroupIds onCollapsedGroupIdsChange>` and
 * grouping's state travels with the link.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";
import { readCollapsedGroups, writeCollapsedGroups } from "./serialize";

/**
 * What {@link useGroupCollapseUrlState} needs.
 *
 * @public
 */
export interface UseGroupCollapseUrlStateOptions {
  /** URL backend; defaults to the History API. */
  urlAdapter?: UrlStateAdapter;
  /** Sync to the URL at all. Defaults to `true`. */
  urlSync?: boolean;
  /** Namespace, when several tables share a page. */
  urlKey?: string;
  /** Groups collapsed before the URL says otherwise. */
  defaultCollapsedGroupIds?: readonly string[];
}

/**
 * The controlled pair `<DataTable>` takes.
 *
 * @public
 */
export interface UseGroupCollapseUrlStateResult {
  /** The collapsed group keys. */
  collapsedGroupIds: string[];
  /** Hand this to `onCollapsedGroupIdsChange`. */
  onCollapsedGroupIdsChange: (ids: string[]) => void;
}

/**
 * Keep collapsed groups in the URL.
 *
 * @param options - See {@link UseGroupCollapseUrlStateOptions}.
 * @returns The controlled pair to spread onto the table.
 *
 * @public
 */
export function useGroupCollapseUrlState(
  options: UseGroupCollapseUrlStateOptions = {}
): UseGroupCollapseUrlStateResult {
  const { urlAdapter, urlSync, urlKey, defaultCollapsedGroupIds } = options;
  const ns = urlKey ? `${urlKey}.` : "";
  const resolved = useResolvedAdapter(urlAdapter, urlSync ?? true);
  // Same SSR rule as the other URL hooks: only an explicit adapter is trusted
  // to be hydration-consistent; the default history adapter hydrates from "".
  const search = useSyncExternalStore(
    (onChange) => resolved.subscribe(onChange),
    () => resolved.getSearch(),
    () => (urlAdapter ? urlAdapter.getSearch() : "")
  );
  // Optimistic overlay: the click that has not reached the URL yet.
  const [pending, setPending] = useState<string[] | null>(null);

  const collapsedGroupIds = useMemo(() => {
    if (pending) return pending;
    const fromUrl = readCollapsedGroups(new URLSearchParams(search), ns);
    return fromUrl ?? [...(defaultCollapsedGroupIds ?? [])];
  }, [pending, search, ns, defaultCollapsedGroupIds]);

  const onCollapsedGroupIdsChange = useCallback(
    (ids: string[]) => {
      setPending(ids);
      const params = new URLSearchParams(resolved.getSearch());
      writeCollapsedGroups(params, ids, ns);
      // An emptied set writes no parameter, which reads back as "nothing has
      // been said" — so the default would re-apply. Stamp it empty instead.
      if (ids.length === 0 && (defaultCollapsedGroupIds?.length ?? 0) > 0) {
        params.set(`${ns}groupClosed`, "");
      }
      resolved.setSearch(params.toString());
      setPending(null);
    },
    [resolved, ns, defaultCollapsedGroupIds]
  );

  return { collapsedGroupIds, onCollapsedGroupIdsChange };
}
