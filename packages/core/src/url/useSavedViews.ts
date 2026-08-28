import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LayoutStorage } from "../columns/useColumnLayoutStorageState";
import { safeLocalStorage } from "../utils/env";
import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";
import {
  FILTER_PREFIX,
  PARAM_COL_GROUPS,
  PARAM_COL_HIDDEN,
  PARAM_COL_ORDER,
  PARAM_COL_PINNED,
  PARAM_COL_WIDTHS,
  PARAM_DENSITY,
  PARAM_FILTER_TREE,
  PARAM_FORMULA,
  PARAM_GROUP_BY,
  PARAM_GROUP_CLOSED,
  PARAM_LIMIT,
  PARAM_PAGE,
  PARAM_PIVOT,
  PARAM_ROW_PIN,
  PARAM_SEARCH,
  PARAM_SORT,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
} from "./serialize";

/**
 * One captured view: a name plus the table's own URL params.
 *
 * @public
 */
export interface SavedView {
  /** The view's name. */
  name: string;
  /** The table-scoped query string (only this table's params). */
  search: string;
  /**
   * Whether this is the view the table opens with. At most one view carries
   * it — setting it on another clears the first, because "default" that can
   * be true twice is not a default.
   */
  isDefault?: boolean;
  /**
   * Who the view is for. `"private"` is the default and needs no storage
   * beyond this browser; `"team"` is one a store shares with other people.
   */
  visibility?: SavedViewVisibility;
  /**
   * The schema this view was written at. Absent means version 1 — the shape
   * that predates versioning.
   */
  version?: number;
  /**
   * Whether this reader may change it. A team view someone else owns arrives
   * read-only, and the panel must show it as such rather than offering
   * controls that will fail — a disabled control is information; a control
   * that silently does nothing is a bug the user is blamed for.
   */
  readOnly?: boolean;
}

/**
 * Who a saved view is for.
 *
 * @public
 */
export type SavedViewVisibility = "private" | "team";

/**
 * The schema a view is written at today.
 *
 * A saved view outlives the code that saved it — that is the whole point of
 * saving one — so it carries the version it was written at and the table
 * upgrades what it reads. Views stored before versioning existed have no
 * number and are treated as version 1, which is what they are.
 *
 * @internal
 */
export const SAVED_VIEW_VERSION = 2;

/**
 * Bring one stored view up to date, or return `null` to drop it.
 *
 * Called for every view whose `version` is behind {@link SAVED_VIEW_VERSION},
 * oldest first, after the built-in migration has run. Dropping is a real
 * answer: a view whose columns no longer exist restores a table nobody asked
 * for, and silently applying it is worse than losing it.
 *
 * @public
 */
export type SavedViewMigration = (
  view: SavedView,
  from: number
) => SavedView | null;

/**
 * Somewhere to keep views other than this browser.
 *
 * Async on purpose: the whole point is a server, and a synchronous interface
 * would have to be faked by every implementation. `localStorage` remains the
 * zero-config default, so a table that never passes a store keeps working
 * offline with no server at all.
 *
 * @public
 */
export interface SavedViewsStore {
  /** Every view this reader can see, in the order to show them. */
  list: () => Promise<readonly SavedView[]>;
  /** Create or replace one. */
  save: (view: SavedView) => Promise<void>;
  /** Delete one by name. */
  remove: (name: string) => Promise<void>;
  /**
   * Persist the ORDER of the list — names only, in the order a later
   * {@link SavedViewsStore.list} should answer with.
   *
   * Order belongs to the list, not to any one view, so it has nowhere to go
   * through `save`. It travels as names rather than views for the same reason
   * `save` takes one view at a time: a whole-list write would carry every
   * view's contents with it and overwrite whatever someone else changed
   * meanwhile. Names carry the ordering and nothing else.
   *
   * Optional, so a store written before this existed keeps compiling and
   * keeps working — saving, renaming, removing and switching the default all
   * go through `save` and `remove` as before. What such a store cannot do is
   * remember an order: `move` reorders the list on screen for the session,
   * and the next `list()` decides the order again. Implement this when
   * reordering has to survive a reload.
   *
   * Called after the `save` and `remove` writes of the same operation have
   * settled, so a rename's new name is already known by the time its place in
   * the list arrives.
   */
  reorder?: (names: readonly string[]) => Promise<void>;
}

/**
 * Options for {@link useSavedViews}.
 *
 * @public
 */
export interface UseSavedViewsOptions {
  /** Storage key for the view list, e.g. `"people-table-views"`. */
  storageKey: string;
  /** Storage backend. Defaults to `localStorage`; memory-only under SSR. */
  storage?: LayoutStorage;
  /**
   * Keep views somewhere other than this browser — a server, usually. Given
   * one, it replaces `storage` entirely: two sources of truth for the same
   * list is how a view comes back after being deleted.
   */
  store?: SavedViewsStore;
  /** What `save` marks a new view as. Defaults to `"private"`. */
  visibility?: SavedViewVisibility;
  /**
   * Upgrade views saved by an older version of your table — renamed columns,
   * retired filters. Runs after the built-in migration; return `null` to drop
   * a view rather than restore a table nobody asked for.
   */
  migrate?: SavedViewMigration;
  /** The table's URL-state backend (same one the table uses). */
  urlAdapter?: UrlStateAdapter;
  /** The table's URL namespace — must match the table's `urlKey`. */
  urlKey?: string;
  /**
   * Mirror of the table's URL-sync switch. When `false` (and no explicit
   * `urlAdapter` is given) views capture and apply against an in-memory
   * backend instead of the address bar — matching a table mounted with
   * URL sync off.
   * @defaultValue true
   */
  urlSync?: boolean;
}

/**
 * Result of {@link useSavedViews}.
 *
 * @public
 */
export interface UseSavedViewsResult {
  /** The saved views, in save order. */
  views: readonly SavedView[];
  /** Capture the table's CURRENT state under a name (replaces same-name). */
  save: (name: string) => void;
  /** Apply a saved view to the table (other tables' params untouched). */
  apply: (name: string) => void;
  /** Remove a saved view. */
  remove: (name: string) => void;
  /**
   * Rename a view, keeping its place in the list. A no-op when the name is
   * unknown or the new name is taken — silently merging two views is how a
   * rename loses one.
   */
  rename: (from: string, to: string) => void;
  /**
   * Move a view one step through the list. Past either end does nothing
   * rather than wrapping, and a view this reader may not change does not move
   * at all. With a `store`, the new order reaches it through
   * {@link SavedViewsStore.reorder}; a store without that member reorders for
   * the session only.
   */
  move: (name: string, delta: -1 | 1) => void;
  /**
   * Make a view the default, or clear the default by passing its own name
   * again. Only one view can hold it.
   */
  setDefault: (name: string) => void;
  /** The default view, when one is set. */
  defaultView: SavedView | undefined;
  /**
   * Read the list again — after someone else has changed a shared view, say.
   * Loading happens on mount and when `storageKey` changes; a `store` or a
   * `migrate` written inline changes identity on every render, so neither can
   * be allowed to trigger it. Refreshing is therefore something the host asks
   * for rather than something identity accidentally causes.
   */
  reload: () => void;
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
  PARAM_COL_GROUPS,
  PARAM_ROW_PIN,
  // The advanced filter tree, collapsed groups, density, the pivot and the
  // typed formula columns. A view that captured everything EXCEPT these looked
  // like it worked and then quietly dropped the most laboriously built parts of
  // the state — and a formula is the one part nobody can rebuild from memory,
  // because the table never offered it: someone wrote it.
  PARAM_FILTER_TREE,
  PARAM_GROUP_CLOSED,
  PARAM_DENSITY,
  PARAM_PIVOT,
  PARAM_FORMULA,
];

/**
 * Bring a view up to today's schema.
 *
 * Version 1 is everything saved before versioning existed. Its `search` is
 * already the shape the table reads, so the built-in step is only the stamp —
 * but the step exists so the NEXT change has somewhere to go, and so a host's
 * `migrate` is handed a view whose version it can trust.
 *
 * @param view - The stored view, as it came off the wire or out of storage.
 * @param migrate - The host's own upgrade, run after the built-in one.
 * @returns The upgraded view, or `null` when it should be dropped.
 */
function migrateView(
  view: SavedView,
  migrate: SavedViewMigration | undefined
): SavedView | null {
  const from = view.version ?? 1;
  if (from >= SAVED_VIEW_VERSION) return view;
  const upgraded: SavedView = { ...view, version: SAVED_VIEW_VERSION };
  if (!migrate) return upgraded;
  return migrate(upgraded, from);
}

/**
 * Every stored view, upgraded, with the ones the host dropped removed.
 *
 * A view that throws during migration is dropped rather than allowed to take
 * the list down with it: one bad view in storage should cost that view, not
 * every view.
 */
function migrateAll(
  views: readonly SavedView[],
  migrate: SavedViewMigration | undefined
): SavedView[] {
  const out: SavedView[] = [];
  for (const view of views) {
    try {
      const upgraded = migrateView(view, migrate);
      if (upgraded) out.push(upgraded);
    } catch {
      // Dropped: see above.
    }
  }
  return out;
}

/**
 * A store that rejects leaves the list as the user last saw it rather than
 * throwing into a render. The alternative — an unhandled rejection — takes
 * the page down over a failed view save.
 */
function swallow(): void {
  return undefined;
}

/**
 * What one operation changed, in a store's terms.
 *
 * `localStorage` takes the whole array in a single write and needs none of
 * this. A store owns one view at a time, so an operation has to name every
 * view whose stored copy is stale — and a default switch makes TWO stale: the
 * view that gains the flag and the view that loses it. A cleared flag that
 * never reaches the store comes back set at the next `list()`, and then two
 * views claim a field that allows one.
 */
interface StoreWrites {
  /** Views whose stored copy is stale, each written through `save`. */
  readonly saved?: readonly SavedView[];
  /** A name whose stored copy must go. */
  readonly removed?: string;
  /** Whether the list order changed, which `reorder` persists. */
  readonly reordered?: boolean;
}

/** A view without its default flag, so the stored shape stays minimal. */
function omitDefault(view: SavedView): SavedView {
  if (view.isDefault === undefined) return view;
  const next = { ...view };
  delete next.isDefault;
  return next;
}

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
 *
 * @public
 */
export function useSavedViews({
  storageKey,
  storage,
  store,
  visibility = "private",
  migrate,
  urlAdapter,
  urlKey,
  urlSync = true,
}: UseSavedViewsOptions): UseSavedViewsResult {
  const resolved = useResolvedAdapter(urlAdapter, urlSync);
  const ns = urlKey ? `${urlKey}.` : "";
  const backend = useMemo<LayoutStorage | undefined>(() => {
    if (storage) return storage;
    return safeLocalStorage();
  }, [storage]);

  // Start empty and hydrate from storage AFTER mount: reading storage in
  // the initializer made the client's first render differ from the
  // server's whenever views were saved (hydration mismatch).
  const [views, setViews] = useState<SavedView[]>([]);
  // The store and the migration are held rather than depended on: both are
  // routinely written inline, and an effect keyed on their identity would
  // re-run every render — a load loop the host has no way to see coming.
  const latest = useRef({ store, migrate, backend, storageKey });
  latest.current = { store, migrate, backend, storageKey };
  const [reloads, setReloads] = useState(0);
  const reload = useCallback(() => {
    setReloads((n) => n + 1);
  }, []);

  useEffect(() => {
    const { store: s, migrate: m, backend: b, storageKey: k } = latest.current;
    if (s) return undefined;
    setViews(migrateAll(readStored(b, k), m));
    return undefined;
  }, [storageKey, reloads]);

  useEffect(() => {
    const { store, migrate } = latest.current;
    if (!store) return undefined;
    // A store's answer can arrive after the table has moved on; ignore a
    // reply that is no longer the one being waited for.
    let current = true;
    void store.list().then(
      (remote) => {
        if (current) setViews(migrateAll(remote, migrate));
      },
      () => {
        // A store that cannot be reached leaves the list empty rather than
        // throwing into a render. The table still works; the views do not.
        if (current) setViews([]);
      }
    );
    return () => {
      current = false;
    };
  }, [storageKey, reloads]);

  const persist = useCallback(
    (next: SavedView[], writes: StoreWrites = {}) => {
      setViews(next);
      if (store) {
        // The store owns one view at a time, not the list: sending the whole
        // list back would overwrite what other people changed meanwhile. So
        // every stale view is written on its own, and the list's own property
        // — its order — goes through `reorder` as names, carrying no view
        // contents with it.
        const written: Promise<void>[] = [];
        if (writes.removed !== undefined) {
          written.push(store.remove(writes.removed).catch(swallow));
        }
        for (const view of writes.saved ?? []) {
          written.push(store.save(view).catch(swallow));
        }
        if (writes.reordered && store.reorder) {
          const order = next.map((view) => view.name);
          // Order goes last, once the writes it describes have settled: a
          // rename reaches a store as a delete plus a save, and a store hearing
          // the new name first in a reorder has nothing to order yet.
          void Promise.all(written)
            .then(() => store.reorder?.(order))
            .catch(swallow);
        }
        return;
      }
      try {
        backend?.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Storage may be full or denied — the in-memory list still works.
      }
    },
    [backend, storageKey, store]
  );

  const save = useCallback(
    (name: string) => {
      const view: SavedView = {
        name,
        search: captureTableParams(resolved.getSearch(), ns),
        version: SAVED_VIEW_VERSION,
        ...(visibility === "private" ? {} : { visibility }),
      };
      persist([...views.filter((v) => v.name !== name), view], {
        saved: [view],
      });
    },
    [views, persist, resolved, ns, visibility]
  );

  const rename = useCallback(
    (from: string, to: string) => {
      const trimmed = to.trim();
      if (trimmed === "" || from === trimmed) return;
      // Renaming onto an existing name would merge two views into one and
      // lose whichever lost the race. Refuse instead.
      if (views.some((view) => view.name === trimmed)) return;
      const target = views.find((view) => view.name === from);
      // A read-only view belongs to someone else. Refusing here means the
      // panel's disabled controls and the hook agree, rather than the hook
      // quietly accepting what the UI said was impossible.
      if (!target || target.readOnly === true) return;
      persist(
        views.map((view) =>
          view.name === from ? { ...view, name: trimmed } : view
        ),
        {
          saved: [{ ...target, name: trimmed }],
          removed: from,
          // A rename keeps the view's place, and to a store that place is new
          // information: the view arrives there as a delete plus a save under
          // a name the store has never seen, which it would otherwise file
          // wherever new views go.
          reordered: true,
        }
      );
    },
    [views, persist]
  );

  const move = useCallback(
    (name: string, delta: -1 | 1) => {
      const index = views.findIndex((view) => view.name === name);
      const moved = views[index];
      // Read-only is refused here for the same reason rename, setDefault and
      // remove refuse it: the panel disables a read-only row's move controls,
      // and a hook that accepted the move anyway would let code do what the
      // UI said was impossible.
      if (!moved || moved.readOnly === true) return;
      const target = index + delta;
      if (target < 0 || target >= views.length) return;
      const next = [...views];
      next.splice(index, 1);
      next.splice(target, 0, moved);
      // Nothing about either view changed — only where they sit — so this is
      // the one operation with no per-view write at all.
      persist(next, { reordered: true });
    },
    [views, persist]
  );

  const setDefault = useCallback(
    (name: string) => {
      const target = views.find((view) => view.name === name);
      if (!target || target.readOnly === true) return;
      // Toggling: naming the current default again clears it.
      const already = views.find((view) => view.isDefault)?.name === name;
      const next: SavedView[] = views.map((view) => {
        const isDefault = !already && view.name === name;
        return isDefault ? { ...view, isDefault } : omitDefault(view);
      });
      // Every view the switch touches has to reach the store, not only the one
      // that gains the flag: a cleared flag that never gets written comes back
      // set at the next `list()`, and then two views claim to be the default.
      // `omitDefault` hands back the very same object when there is nothing to
      // clear, so a changed identity is exactly the set of stale views — which
      // also settles a store already holding more than one default.
      persist(next, {
        saved: next.filter((view, index) => view !== views[index]),
      });
    },
    [views, persist]
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
    (name: string) => {
      const target = views.find((view) => view.name === name);
      if (!target || target.readOnly === true) return;
      persist(
        views.filter((v) => v.name !== name),
        { removed: name }
      );
    },
    [views, persist]
  );

  return {
    views,
    save,
    apply,
    remove,
    rename,
    move,
    setDefault,
    defaultView: views.find((view) => view.isDefault),
    reload,
  };
}
