import { useCallback, useMemo, useState } from "react";

import type { LayoutStorage } from "../columns/useColumnLayoutStorageState";
import { isBrowser } from "../utils/env";
import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";
import {
  FILTER_PREFIX,
  PARAM_COL_HIDDEN,
  PARAM_COL_ORDER,
  PARAM_COL_PINNED,
  PARAM_COL_WIDTHS,
  PARAM_GROUP_BY,
  PARAM_LIMIT,
  PARAM_PAGE,
  PARAM_SEARCH,
  PARAM_SORT,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
} from "./serialize";

/** One captured view: a name plus the table's own URL params. */
export interface SavedView {
  name: string;
  /** The table-scoped query string (only this table's params). */
  search: string;
}

/** Options for {@link useSavedViews}. */
export interface UseSavedViewsOptions {
  /** Storage key for the view list, e.g. `"people-table-views"`. */
  storageKey: string;
  /** Storage backend. Defaults to `localStorage`; memory-only under SSR. */
  storage?: LayoutStorage;
  /** The table's URL-state backend (same one the table uses). */
  adapter?: UrlStateAdapter;
  /** The table's URL namespace — must match the table's `urlKey`. */
  urlKey?: string;
  /**
   * Mirror of the table's URL-sync switch. When `false` (and no explicit
   * `adapter` is given) views capture and apply against an in-memory
   * backend instead of the address bar — matching a table mounted with
   * URL sync off.
   * @defaultValue true
   */
  enabled?: boolean;
}

/** Result of {@link useSavedViews}. */
export interface UseSavedViewsResult {
  /** The saved views, in save order. */
  views: readonly SavedView[];
  /** Capture the table's CURRENT state under a name (replaces same-name). */
  save: (name: string) => void;
  /** Apply a saved view to the table (other tables' params untouched). */
  apply: (name: string) => void;
  /** Remove a saved view. */
  remove: (name: string) => void;
}

const BARE_PARAMS = [
  PARAM_PAGE,
  PARAM_LIMIT,
  PARAM_SEARCH,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
  // The multi-sort chain — it supersedes sortBy/sortDir, so a view that
  // missed it could neither capture nor displace an active chain.
  PARAM_SORT,
  PARAM_GROUP_BY,
  PARAM_COL_HIDDEN,
  PARAM_COL_PINNED,
  PARAM_COL_ORDER,
  PARAM_COL_WIDTHS,
];

/** Whether a param key belongs to the table at namespace `ns`. */
function ownsParam(key: string, ns: string): boolean {
  return (
    BARE_PARAMS.some((p) => key === ns + p) ||
    key.startsWith(ns + FILTER_PREFIX)
  );
}

/** The table-scoped subset of a full query string. */
function captureTableParams(search: string, ns: string): string {
  const all = new URLSearchParams(search);
  const own = new URLSearchParams();
  all.forEach((value, key) => {
    if (ownsParam(key, ns)) own.set(key, value);
  });
  return own.toString();
}

function readStored(
  storage: LayoutStorage | undefined,
  key: string
): SavedView[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is SavedView =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as SavedView).name === "string" &&
        typeof (v as SavedView).search === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Headless saved views: capture the table's current URL state (search,
 * sort, page, filters, column layout — ONLY this table's params) under a
 * name, persist the list, and re-apply on demand without touching other
 * tables sharing the URL. Wire it to any menu in the `toolbar` slot.
 */
export function useSavedViews({
  storageKey,
  storage,
  adapter,
  urlKey,
  enabled = true,
}: UseSavedViewsOptions): UseSavedViewsResult {
  const resolved = useResolvedAdapter(adapter, enabled);
  const ns = urlKey ? `${urlKey}.` : "";
  const backend = useMemo<LayoutStorage | undefined>(() => {
    if (storage) return storage;
    return isBrowser() ? globalThis.localStorage : undefined;
  }, [storage]);

  const [views, setViews] = useState<SavedView[]>(() =>
    readStored(backend, storageKey)
  );

  const persist = useCallback(
    (next: SavedView[]) => {
      setViews(next);
      try {
        backend?.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Storage may be full or denied — the in-memory list still works.
      }
    },
    [backend, storageKey]
  );

  const save = useCallback(
    (name: string) => {
      const view: SavedView = {
        name,
        search: captureTableParams(resolved.getSearch(), ns),
      };
      persist([...views.filter((v) => v.name !== name), view]);
    },
    [views, persist, resolved, ns]
  );

  const apply = useCallback(
    (name: string) => {
      const view = views.find((v) => v.name === name);
      if (!view) return;
      const next = new URLSearchParams(resolved.getSearch());
      // Drop this table's current params, then lay the view's over.
      const stale: string[] = [];
      next.forEach((_, key) => {
        if (ownsParam(key, ns)) stale.push(key);
      });
      for (const key of stale) next.delete(key);
      // Write owned params ONLY — a stored view is external input (old
      // versions, hand-edited storage) and must never touch params that
      // belong to other tables or the surrounding app.
      new URLSearchParams(view.search).forEach((value, key) => {
        if (ownsParam(key, ns)) next.set(key, value);
      });
      resolved.setSearch(next.toString());
    },
    [views, resolved, ns]
  );

  const remove = useCallback(
    (name: string) => persist(views.filter((v) => v.name !== name)),
    [views, persist]
  );

  return { views, save, apply, remove };
}
