/**
 * The find bar's state: whether it is open, the query, and which hit the walk
 * is on.
 *
 * It knows nothing about focus or about the rows: the hits come from
 * {@link findMatches} over whatever rows a binding holds, and the binding moves
 * focus to the current one through its grid. That keeps "where the table is
 * looking" owned by one piece of code.
 *
 * The query is shareable table state: a `find` URL param (beside `q`) reopens
 * the bar and restarts the walk at the first hit. Typing writes it through a
 * trailing debounce, never pushing history; the walk's position stays
 * ephemeral, since the receiving page's data may differ.
 */
import { PARAM_FIND } from "../url/serialize";
import type { UrlStateAdapter } from "../url/urlStateAdapter";
import { parseTableUrlState, updateTableUrlState } from "../url/urlStateCodec";
import { stepMatch } from "./findMatches";

/**
 * Trailing debounce for writing the find query to the URL. Typing must not
 * spam `history.replaceState` (Safari caps ~100 calls / 30s); the bar itself
 * stays instant because the query lives in the controller.
 *
 * @public
 */
export const FIND_URL_WRITE_DEBOUNCE_MS = 150;

/**
 * The find query a URL carries for one table, trimmed; empty when there is
 * none.
 *
 * @param search - The query string, without `"?"`.
 * @param urlKey - The table's URL namespace, when several share one URL.
 * @returns The query.
 *
 * @public
 */
export function readFindQuery(search: string, urlKey?: string): string {
  const namespace = urlKey ? `${urlKey}.` : "";
  const raw = parseTableUrlState(search, namespace).get(
    `${namespace}${PARAM_FIND}`
  );
  return raw == null ? "" : raw.trim();
}

/**
 * The walk's position clamped to the hits there are: typing narrows them and
 * a row can leave the window, so the walk points at the last hit rather than
 * at nothing. `-1` when there are none.
 *
 * @param index - The walk's position.
 * @param total - How many hits there are.
 * @returns The clamped position.
 *
 * @public
 */
export function clampMatchIndex(index: number, total: number): number {
  return total === 0 ? -1 : Math.min(Math.max(index, 0), total - 1);
}

/**
 * What a find controller is configured with.
 *
 * @public
 */
export interface FindControllerOptions {
  /** Off unless the host asked for it; when false the URL is never read. */
  enabled: boolean;
  /** Where the query is stored — the browser URL or a memory store. */
  adapter: UrlStateAdapter;
  /** Namespace, when several tables share one URL (`lab.find`). */
  urlKey?: string;
}

/**
 * The find bar's state at one moment.
 *
 * @public
 */
export interface FindSnapshot {
  /** Whether the bar is showing. */
  readonly open: boolean;
  /** The current query. */
  readonly query: string;
  /** Which hit the walk is on, from zero; `-1` for none. Not yet clamped. */
  readonly index: number;
  /** The trimmed query waiting on the debounce, or `null` when none is. */
  readonly pending: string | null;
}

/**
 * The find bar's controller.
 *
 * @public
 */
export interface FindController {
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => FindSnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: FindControllerOptions) => void;
  /**
   * Mark the bar mounted. Returns the teardown, which writes a query still
   * waiting on the debounce rather than dropping it.
   */
  readonly connect: () => () => void;
  /** Show or hide the bar. Hiding clears the query, as a find bar does. */
  readonly setOpen: (open: boolean) => void;
  /** Open the bar — what Ctrl/Cmd+F and a host's own button call. */
  readonly openBar: () => void;
  /** Type into the bar. A new query restarts the walk at the first hit. */
  readonly setQuery: (query: string) => void;
  /** Step the walk by `by` hits over `total`, wrapping at either end. */
  readonly step: (by: number, total: number) => void;
  /**
   * Adopt the URL's query — Saved Views, back/forward, a shared link — unless
   * a typed query is still waiting to be written. A binding calls this after
   * every render that sees the URL change.
   */
  readonly syncFromUrl: () => void;
}

/**
 * Create the find bar's controller.
 *
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createFindController(
  initial: FindControllerOptions
): FindController {
  let options = initial;
  const urlQuery = (): string =>
    options.enabled
      ? readFindQuery(options.adapter.getSearch(), options.urlKey)
      : "";
  const first = urlQuery();
  let snapshot: FindSnapshot = {
    open: first !== "",
    query: first,
    index: first === "" ? -1 : 0,
    pending: null,
  };
  // The last URL value already reacted to, so a query typed while the bar is
  // closed does not read as an external URL change.
  let seenUrlQuery = first;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let batchDepth = 0;
  let changed = false;
  const listeners = new Set<() => void>();

  const flush = (): void => {
    if (batchDepth > 0 || !changed) return;
    changed = false;
    for (const listener of listeners) listener();
  };

  const write = (patch: Partial<FindSnapshot>): void => {
    const next = { ...snapshot, ...patch };
    if (
      next.open === snapshot.open &&
      next.query === snapshot.query &&
      next.index === snapshot.index &&
      next.pending === snapshot.pending
    ) {
      return;
    }
    snapshot = next;
    changed = true;
    flush();
  };

  const batch = (run: () => void): void => {
    batchDepth += 1;
    try {
      run();
    } finally {
      batchDepth -= 1;
      flush();
    }
  };

  const persist = (next: string): void => {
    const trimmed = next.trim();
    seenUrlQuery = trimmed;
    const { adapter, urlKey } = options;
    const namespace = urlKey ? `${urlKey}.` : "";
    const param = `${namespace}${PARAM_FIND}`;
    adapter.setSearch(
      updateTableUrlState(adapter.getSearch(), namespace, (params) => {
        if (trimmed === "") params.delete(param);
        else params.set(param, trimmed);
      }),
      // Typing must never push history. The adapter default is replace;
      // passing it keeps a custom adapter from treating silence as push.
      { push: false }
    );
  };

  const schedulePersist = (next: string): void => {
    write({ pending: next.trim() });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      persist(next);
      write({ pending: null });
    }, FIND_URL_WRITE_DEBOUNCE_MS);
  };

  const setQuery = (next: string): void => {
    batch(() => {
      // A new query starts the walk again: staying on hit 9 of the last
      // search would land the reader somewhere unrelated.
      write({ query: next, index: next.trim() === "" ? -1 : 0 });
      if (!options.enabled) return;
      // Persist while the bar is open, or when clearing (closing drops the
      // param). A closed bar that receives keystrokes must not reopen itself
      // through the URL.
      if (snapshot.open || next.trim() === "") schedulePersist(next);
    });
  };

  const setOpen = (next: boolean): void => {
    batch(() => {
      write({ open: next });
      // Closing clears the query, so reopening starts clean and no cell stays
      // marked behind a bar that is no longer on screen.
      if (!next) setQuery("");
    });
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
      return () => {
        if (!timer) return;
        clearTimeout(timer);
        timer = null;
        persist(snapshot.pending ?? "");
      };
    },
    setOpen,
    openBar() {
      setOpen(true);
    },
    setQuery,
    step(by, total) {
      write({ index: stepMatch(snapshot.index, total, by) });
    },
    syncFromUrl() {
      if (!options.enabled || snapshot.pending !== null) return;
      const fromUrl = urlQuery();
      const { open, query } = snapshot;
      if (fromUrl === seenUrlQuery || fromUrl === query.trim()) {
        seenUrlQuery = fromUrl;
        if (fromUrl !== "" && !open) write({ open: true });
        return;
      }
      seenUrlQuery = fromUrl;
      write({
        query: fromUrl,
        open: fromUrl !== "",
        index: fromUrl === "" ? -1 : 0,
      });
    },
  };
}
