/**
 * Saved views — named captures of one table's URL state, the stateful half
 * shared by every binding.
 *
 * The controller owns the list. Once a binding connects it, the list loads
 * from browser storage or from a host's store; `save` captures the table's
 * own URL params under a name, `apply` lays them back over the URL without
 * touching other tables sharing it, and the list can be renamed, reordered,
 * trimmed and given a default. Every change reaches the screen at once and is
 * written through behind it: the whole list to storage, or only the stale
 * views to a store.
 *
 * **The list starts empty and loads on connect.** Reading storage while the
 * controller is created would make a client's first render differ from the
 * server's whenever views are saved, so nothing is read until
 * {@link SavedViewsController.connect}.
 *
 * **A store's answer can arrive late.** A `list()` reply that lands after a
 * newer load, or after teardown, is ignored rather than allowed to overwrite
 * the list the table has moved on to.
 */
import type { LayoutStorage } from "../state/tableStores";
import { safeLocalStorage } from "../utils/env";
import { createMemoryAdapter, resolveUrlAdapter } from "./historyAdapter";
import type { UrlStateAdapter } from "./urlStateAdapter";
import { applyTableUrlState, captureTableUrlState } from "./urlStateCodec";

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
 * @public
 */
export const SAVED_VIEW_VERSION = 2;

/**
 * Bring one stored view up to date, or return `null` to drop it.
 *
 * Called for every view whose `version` is behind `SAVED_VIEW_VERSION`,
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
 * What a saved-views controller is configured with.
 *
 * @public
 */
export interface SavedViewsControllerOptions {
  /** Storage key for the view list, e.g. `"people-table-views"`. */
  storageKey: string;
  /**
   * Storage backend. Omitted, it is `localStorage`, or memory only where
   * there is none (SSR, blocked storage); `null` keeps the list in memory
   * only.
   */
  storage?: LayoutStorage | null;
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
 * The saved-views list at one moment.
 *
 * @public
 */
export interface SavedViewsSnapshot {
  /** The saved views, in list order. */
  readonly views: readonly SavedView[];
  /** The default view, when one is set. */
  readonly defaultView: SavedView | undefined;
}

/**
 * The saved views of one table: the list, its persistence, and the
 * operations on it.
 *
 * @public
 */
export interface SavedViewsController {
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => SavedViewsSnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: SavedViewsControllerOptions) => void;
  /**
   * Load the list and keep loads live. Returns the teardown, after which a
   * store reply still in flight is ignored and `reload` does nothing. A
   * binding reconnects when the storage key changes.
   */
  readonly connect: () => () => void;
  /**
   * Read the list again — after someone else has changed a shared view, say.
   * Does nothing while disconnected.
   */
  readonly reload: () => void;
  /** Capture the table's CURRENT state under a name (replaces same-name). */
  readonly save: (name: string) => void;
  /** Apply a saved view to the table (other tables' params untouched). */
  readonly apply: (name: string) => void;
  /** Remove a saved view. A read-only view stays. */
  readonly remove: (name: string) => void;
  /**
   * Rename a view, keeping its place in the list. A no-op when the name is
   * unknown, the view is read-only, or the new name is empty or taken.
   */
  readonly rename: (from: string, to: string) => void;
  /**
   * Move a view one step through the list. Past either end does nothing
   * rather than wrapping, and a read-only view does not move.
   */
  readonly move: (name: string, delta: -1 | 1) => void;
  /**
   * Make a view the default, or clear the default by passing its own name
   * again. Only one view can hold it; a read-only view cannot take it.
   */
  readonly setDefault: (name: string) => void;
}

/**
 * What one operation changed, in a store's terms.
 *
 * Storage takes the whole array in a single write and needs none of this. A
 * store owns one view at a time, so an operation names every view whose
 * stored copy is stale — and a default switch makes TWO stale: the view that
 * gains the flag and the view that loses it. A cleared flag that never
 * reaches the store comes back set at the next `list()`, and then two views
 * claim a field that allows one.
 */
interface StoreWrites {
  /** Views whose stored copy is stale, each written through `save`. */
  readonly saved?: readonly SavedView[];
  /** A name whose stored copy must go. */
  readonly removed?: string;
  /** Whether the list order changed, which `reorder` persists. */
  readonly reordered?: boolean;
}

/** One operation's result: the list to show, and what the store must hear. */
interface ListChange {
  readonly next: readonly SavedView[];
  readonly writes: StoreWrites;
}

/** A store that can persist the list's order. */
type ReorderingStore = SavedViewsStore &
  Required<Pick<SavedViewsStore, "reorder">>;

const EMPTY: SavedViewsSnapshot = { views: [], defaultView: undefined };

/**
 * Bring a view up to today's schema.
 *
 * Version 1 is everything saved before versioning existed. Its `search` is
 * already the shape the table reads, so the built-in step is only the stamp —
 * but the step exists so the NEXT change has somewhere to go, and so a host's
 * `migrate` is handed a view whose version it can trust.
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
 * One view upgraded, or `null` to drop it. A view whose migration throws is
 * dropped: one bad view in storage costs that view, not every view.
 */
function tryMigrateView(
  view: SavedView,
  migrate: SavedViewMigration | undefined
): SavedView | null {
  try {
    return migrateView(view, migrate);
  } catch {
    return null;
  }
}

/** Every stored view, upgraded, with the ones the host dropped removed. */
function migrateAll(
  views: readonly SavedView[],
  migrate: SavedViewMigration | undefined
): SavedView[] {
  const out: SavedView[] = [];
  for (const view of views) {
    const upgraded = tryMigrateView(view, migrate);
    if (upgraded) out.push(upgraded);
  }
  return out;
}

/** Whether a stored entry has the two fields every view needs. */
function isSavedView(value: unknown): value is SavedView {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "search" in value &&
    typeof value.search === "string"
  );
}

/**
 * The views stored under `key`. Missing, unreadable or corrupt storage reads
 * as no views, and entries that are not views are skipped.
 */
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
    return parsed.filter(isSavedView);
  } catch {
    return [];
  }
}

/**
 * Write the whole list to storage, answering whether storage took it. Full
 * or denied storage leaves the list in memory working, so a refused write is
 * an answer rather than an error.
 */
function writeStored(
  storage: LayoutStorage,
  key: string,
  views: readonly SavedView[]
): boolean {
  try {
    storage.setItem(key, JSON.stringify(views));
    return true;
  } catch {
    return false;
  }
}

/** The storage a configuration names: `null` is none, omitted is the default. */
function resolveStorage(
  storage: LayoutStorage | null | undefined
): LayoutStorage | undefined {
  if (storage === null) return undefined;
  return storage ?? safeLocalStorage();
}

/**
 * Whether a store accepted one write. The list on screen stays as the user
 * left it either way, and a rejection becomes `false` rather than an
 * unhandled rejection that takes the page down over one failed save.
 */
function accepted(write: Promise<unknown>): Promise<boolean> {
  return write.then(
    () => true,
    () => false
  );
}

function canReorder(store: SavedViewsStore): store is ReorderingStore {
  return store.reorder !== undefined;
}

/**
 * Send one operation to a store. Every stale view is written on its own —
 * sending the whole list back would overwrite what other people changed
 * meanwhile — and the order goes last, as names, once the writes it describes
 * have settled: a rename reaches a store as a delete plus a save, and a store
 * hearing the new name first in a reorder has nothing to order yet.
 */
function writeToStore(store: SavedViewsStore, change: ListChange): void {
  const { next, writes } = change;
  const written: Promise<boolean>[] = [];
  if (writes.removed !== undefined) {
    written.push(accepted(store.remove(writes.removed)));
  }
  for (const view of writes.saved ?? []) {
    written.push(accepted(store.save(view)));
  }
  if (!writes.reordered || !canReorder(store)) return;
  const order = next.map((view) => view.name);
  void accepted(Promise.all(written).then(() => store.reorder(order)));
}

/** Whether two lists hold the very same views in the same order. */
function sameViews(a: readonly SavedView[], b: readonly SavedView[]): boolean {
  return a.length === b.length && a.every((view, index) => view === b[index]);
}

/** Whether a view exists and this reader may change it. */
function isChangeable(view: SavedView | undefined): view is SavedView {
  return view !== undefined && view.readOnly !== true;
}

/** A view without its default flag, so the stored shape stays minimal. */
function omitDefault(view: SavedView): SavedView {
  if (view.isDefault === undefined) return view;
  const next = { ...view };
  delete next.isDefault;
  return next;
}

function saveChange(views: readonly SavedView[], view: SavedView): ListChange {
  return {
    next: [...views.filter((v) => v.name !== view.name), view],
    writes: { saved: [view] },
  };
}

function renameChange(
  views: readonly SavedView[],
  from: string,
  to: string
): ListChange | undefined {
  const trimmed = to.trim();
  if (trimmed === "" || from === trimmed) return undefined;
  // Renaming onto an existing name would merge two views into one and lose
  // whichever lost the race.
  if (views.some((view) => view.name === trimmed)) return undefined;
  const target = views.find((view) => view.name === from);
  if (!isChangeable(target)) return undefined;
  return {
    next: views.map((view) =>
      view.name === from ? { ...view, name: trimmed } : view
    ),
    writes: {
      saved: [{ ...target, name: trimmed }],
      removed: from,
      // A rename keeps the view's place, and to a store that place is new
      // information: the view arrives there as a delete plus a save under a
      // name the store has never seen, which it would otherwise file wherever
      // new views go.
      reordered: true,
    },
  };
}

function moveChange(
  views: readonly SavedView[],
  name: string,
  delta: -1 | 1
): ListChange | undefined {
  const index = views.findIndex((view) => view.name === name);
  const moved = views[index];
  if (!isChangeable(moved)) return undefined;
  const target = index + delta;
  if (target < 0 || target >= views.length) return undefined;
  const next = [...views];
  next.splice(index, 1);
  next.splice(target, 0, moved);
  // Nothing about either view changed — only where they sit — so this is the
  // one operation with no per-view write at all.
  return { next, writes: { reordered: true } };
}

function defaultChange(
  views: readonly SavedView[],
  name: string
): ListChange | undefined {
  const target = views.find((view) => view.name === name);
  if (!isChangeable(target)) return undefined;
  // Toggling: naming the current default again clears it.
  const already = views.find((view) => view.isDefault)?.name === name;
  const next = views.map((view) => {
    const isDefault = !already && view.name === name;
    return isDefault ? { ...view, isDefault } : omitDefault(view);
  });
  // Every view the switch touches reaches the store, not only the one that
  // gains the flag. `omitDefault` hands back the very same object when there
  // is nothing to clear, so a changed identity is exactly the set of stale
  // views — which also settles a store already holding more than one default.
  return {
    next,
    writes: { saved: next.filter((view, index) => view !== views[index]) },
  };
}

function removeChange(
  views: readonly SavedView[],
  name: string
): ListChange | undefined {
  const target = views.find((view) => view.name === name);
  if (!isChangeable(target)) return undefined;
  return {
    next: views.filter((view) => view.name !== name),
    writes: { removed: name },
  };
}

/**
 * Create the saved-views controller for one table.
 *
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createSavedViewsController(
  initial: SavedViewsControllerOptions
): SavedViewsController {
  let options = initial;
  let snapshot = EMPTY;
  let connected = false;
  // Every load takes a ticket, and a teardown takes one too; a store reply
  // whose ticket is no longer the latest is ignored.
  let ticket = 0;
  const listeners = new Set<() => void>();
  // The URL backend when URL sync is off, or under SSR: one per table.
  const memory = createMemoryAdapter();

  const urlAdapter = (): UrlStateAdapter =>
    resolveUrlAdapter(options.urlAdapter, options.urlSync ?? true, memory);
  const namespace = (): string => (options.urlKey ? `${options.urlKey}.` : "");

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const publish = (views: readonly SavedView[]): void => {
    snapshot = { views, defaultView: views.find((view) => view.isDefault) };
  };

  /** Show a loaded list, unless it is the list already shown. */
  const show = (views: readonly SavedView[]): void => {
    if (sameViews(views, snapshot.views)) return;
    publish(views);
    notify();
  };

  const load = (): void => {
    ticket += 1;
    const current = ticket;
    const { store, migrate } = options;
    if (!store) {
      show(
        migrateAll(
          readStored(resolveStorage(options.storage), options.storageKey),
          migrate
        )
      );
      return;
    }
    void store.list().then(
      (remote) => {
        if (current === ticket) show(migrateAll(remote, migrate));
      },
      () => {
        // A store that cannot be reached leaves the list empty: the table
        // still works; the views do not.
        if (current === ticket) show([]);
      }
    );
  };

  /** Show an operation's list at once, then write it through. */
  const commit = (change: ListChange | undefined): void => {
    if (!change) return;
    publish(change.next);
    try {
      const { store } = options;
      if (store) {
        writeToStore(store, change);
        return;
      }
      const storage = resolveStorage(options.storage);
      if (storage) writeStored(storage, options.storageKey, change.next);
    } finally {
      notify();
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      options = next;
    },
    connect() {
      connected = true;
      load();
      return () => {
        connected = false;
        ticket += 1;
      };
    },
    reload() {
      if (connected) load();
    },
    save(name) {
      const visibility = options.visibility ?? "private";
      const view: SavedView = {
        name,
        search: captureTableUrlState(urlAdapter().getSearch(), namespace()),
        version: SAVED_VIEW_VERSION,
        ...(visibility === "private" ? {} : { visibility }),
      };
      commit(saveChange(snapshot.views, view));
    },
    apply(name) {
      const view = snapshot.views.find((v) => v.name === name);
      if (!view) return;
      const adapter = urlAdapter();
      adapter.setSearch(
        applyTableUrlState(adapter.getSearch(), view.search, namespace())
      );
    },
    remove(name) {
      commit(removeChange(snapshot.views, name));
    },
    rename(from, to) {
      commit(renameChange(snapshot.views, from, to));
    },
    move(name, delta) {
      commit(moveChange(snapshot.views, name, delta));
    },
    setDefault(name) {
      commit(defaultChange(snapshot.views, name));
    },
  };
}
