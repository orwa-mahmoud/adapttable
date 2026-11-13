/**
 * The server tier, loaded on demand.
 *
 * A table switches to the server tier with `mode="server"` or an
 * `onQueryChange` handler and no extra import, so the bindings hold a server
 * tier for every table. The engine behind it — building and keying the query,
 * the cursor trail, appended pages and the aggregate operations — is fetched
 * the first time a table is actually on that tier, and every later table
 * creates it synchronously.
 *
 * The engine's request starts while the table first renders, so it travels
 * beside the table's first fetch. Until it lands the facade shows what the
 * engine's first frame shows (the host's rows, the first-load flag, whether a
 * next page exists), keeps the reader's page moves, and sends the first query
 * itself whenever that query asks for no aggregates — building one that does
 * needs the engine's aggregate resolution, so such a query follows the engine.
 * When the engine lands, the facade hands it the sender and the first-load
 * latch, replays the last update and the page moves into it, and tells its
 * subscribers; a query already sent is not sent again.
 * A failed load is thrown from every later `update` of that table, where the
 * binding's own error handling sees it; a table created after the failure
 * loads again.
 */

import type { TableQuery } from "../contracts/query";
import { createQuerySender } from "./dataTier";
import {
  createFirstLoadLatch,
  type FirstLoadLatch,
  requestsAggregates,
  serverQuery,
} from "./serverRequest";
import type {
  createServerSourceWith,
  ServerSource,
  ServerSourceConfig,
  ServerSourceFrame,
  ServerSourceViewState,
} from "./serverSource";
import { createSourceSignal } from "./sourceState";

/**
 * What a lazily loaded server tier shows for one update: the engine's frame
 * without the query, which exists only once the engine has loaded.
 *
 * @public
 */
export type ServerTierFrame<TRow> = Omit<
  ServerSourceFrame<TRow>,
  "query" | "queryKey"
>;

/**
 * One table's server tier, whose engine loads the first time it is used.
 *
 * @public
 */
export interface LazyServerSource<TRow> extends Omit<
  ServerSource<TRow>,
  "update"
> {
  /** See {@link ServerSource.update}; the frame before the engine loads. */
  readonly update: (
    config: ServerSourceConfig<TRow>,
    view: ServerSourceViewState
  ) => ServerTierFrame<TRow>;
  /**
   * Start loading the engine. Call it while the table is on the server tier;
   * a table on another tier never loads it. Repeat calls do nothing.
   */
  readonly load: () => void;
  /**
   * Where the engine is: `"pending"` before it lands, `"ready"` once it is in
   * place, `"failed"` when it could not load. A frame belongs to one phase.
   */
  readonly phase: () => ServerEnginePhase;
  /**
   * Throw the error the engine failed to load with, if it did. `update`
   * throws it too; a binding whose reads must not throw calls this where its
   * framework reports errors instead.
   */
  readonly throwIfFailed: () => void;
}

/**
 * Where a lazily loaded server tier's engine is.
 *
 * @public
 */
export type ServerEnginePhase = "pending" | "ready" | "failed";

/** The module the engine lives in. */
interface ServerEngineModule {
  readonly createServerSourceWith: typeof createServerSourceWith;
}

/**
 * Loads the engine module once and remembers it, so every table after the
 * first creates its engine synchronously.
 *
 * @internal
 */
export interface ServerEngineLoader {
  /** The module, once it has loaded. */
  readonly ready: () => ServerEngineModule | undefined;
  /** The load in flight or done. A failure clears it, so the next call retries. */
  readonly load: () => Promise<ServerEngineModule>;
}

/**
 * A loader over one module import.
 *
 * @internal
 */
export function createServerEngineLoader(
  importEngine: () => Promise<ServerEngineModule>
): ServerEngineLoader {
  let module: ServerEngineModule | undefined;
  let loading: Promise<ServerEngineModule> | undefined;
  return {
    ready: () => module,
    load() {
      loading ??= importEngine().then(
        (loaded) => {
          module = loaded;
          return loaded;
        },
        (error: unknown) => {
          loading = undefined;
          throw error;
        }
      );
      return loading;
    },
  };
}

/** The engine module, imported on demand. */
const importServerEngine = () => import("./serverSource");

/** The loader every table shares, created with the first lazy server tier. */
let engineLoader: ServerEngineLoader | undefined;

/**
 * What the engine shows for its first update, before it has seen a load, a
 * cursor or an appended page.
 *
 * @public
 */
export function pendingServerFrame<TRow>(
  config: ServerSourceConfig<TRow>,
  view: Pick<ServerSourceViewState, "page" | "limit">,
  firstLoad: FirstLoadLatch = createFirstLoadLatch()
): ServerTierFrame<TRow> {
  const loading = config.loading ?? false;
  // Offset mode knows the end from the count. Cursor mode only knows there is
  // more once the server has handed out a token, and none has been recorded.
  const moreToLoad =
    config.supports?.cursor !== true && view.page * view.limit < config.total;
  return {
    rows: config.rows,
    isLoading: firstLoad.isLoading(loading, config.rows.length > 0),
    isFetchingNextPage: false,
    hasNextPage: config.paginationMode !== "paged" && moreToLoad,
    groupAggregations: undefined,
  };
}

/**
 * Create one table's server tier over `loader`.
 *
 * @internal
 */
export function createLazyServerSourceWith<TRow>(
  loader: ServerEngineLoader
): LazyServerSource<TRow> {
  const signal = createSourceSignal();
  const { notify } = signal;
  let engine: ServerSource<TRow> | undefined;
  let last:
    [config: ServerSourceConfig<TRow>, view: ServerSourceViewState] | undefined;
  let moves: ((source: ServerSource<TRow>) => void)[] = [];
  let failure: { readonly error: unknown } | undefined;
  // What the engine continues: the request sent before it existed, and what
  // the first-load latch has seen of the host.
  const sender = createQuerySender();
  const firstLoad = createFirstLoadLatch();
  let early:
    { readonly query: TableQuery; readonly queryKey: string } | undefined;
  // Refetches asked for before the engine; it continues the count.
  let generation = 0;

  function attach(module: ServerEngineModule): void {
    const created = module.createServerSourceWith<TRow>({
      sender,
      firstLoad,
      generation,
    });
    engine = created;
    created.subscribe(notify);
    if (last) created.update(...last);
    const queued = moves;
    moves = [];
    for (const move of queued) move(created);
    notify();
  }

  const ready = loader.ready();
  if (ready) attach(ready);

  /** Run `move` on the engine, or keep it for when the engine lands. */
  function onEngine(move: (source: ServerSource<TRow>) => void): void {
    if (engine) move(engine);
    else moves.push(move);
  }

  function throwIfFailed(): void {
    if (failure) throw failure.error;
  }

  return {
    update(config, view) {
      throwIfFailed();
      if (engine) return engine.update(config, view);
      last = [config, view];
      early = requestsAggregates(
        config.aggregates,
        view.groupAggregateOverrides,
        config.columns
      )
        ? undefined
        : serverQuery({
            view,
            supports: config.supports,
            expandedIds: config.expandedIds,
            facetKeys: config.facetKeys,
            aggregates: undefined,
            // No cursor has been handed out before the engine exists.
            cursor: undefined,
          });
      return pendingServerFrame(config, view, firstLoad);
    },
    load() {
      if (engine || failure) return;
      loader.load().then(
        (module) => {
          if (!engine) attach(module);
        },
        (error: unknown) => {
          failure = { error };
          notify();
        }
      );
    },
    throwIfFailed,
    phase() {
      if (engine) return "ready";
      return failure ? "failed" : "pending";
    },
    commit() {
      if (engine) {
        engine.commit();
        return;
      }
      if (!last) return;
      const [config] = last;
      if (early) {
        sender.send(
          config.onQueryChange,
          early.query,
          early.queryKey,
          generation
        );
      }
      firstLoad.observe(config.loading ?? false, config.rows.length > 0);
    },
    setPage(page) {
      onEngine((source) => source.setPage(page));
    },
    fetchNextPage() {
      onEngine((source) => source.fetchNextPage());
    },
    refetch() {
      // The query sent before the engine is sent again at once; anything
      // else waits for the engine.
      if (!engine && early && last?.[0].onQueryChange) {
        generation += 1;
        notify();
        return;
      }
      onEngine((source) => source.refetch());
    },
    subscribe: signal.subscribe,
    revision: signal.revision,
    dispose() {
      if (engine) engine.dispose();
      else sender.dispose();
    },
  };
}

/**
 * Create one table's server tier, whose engine loads on first use.
 *
 * @returns The tier; call {@link LazyServerSource.load} once the table is on
 * the server tier, and {@link LazyServerSource.update} before the rest.
 *
 * @public
 */
export function createLazyServerSource<TRow>(): LazyServerSource<TRow> {
  engineLoader ??= createServerEngineLoader(importServerEngine);
  return createLazyServerSourceWith<TRow>(engineLoader);
}
