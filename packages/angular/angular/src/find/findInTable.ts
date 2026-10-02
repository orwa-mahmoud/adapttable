/**
 * Find-in-table state — the Angular binding.
 *
 * Core's find controller owns whether the bar is open, the query and the
 * walk, and writes the query to the URL through a debounce. This injector
 * follows it, derives the hits over the rows it is given, and leaves focus
 * to the table.
 */
import {
  clampMatchIndex,
  createFindController,
  findMatches,
  matchKeySet,
  type UrlStateAdapter,
} from "@adapttable/core";
import type { FindInTableState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
  type WritableSignal,
} from "@angular/core";

import type { ColumnDef } from "../columnDef";
import { fromStore, type MaybeSignal, readMaybe } from "../store";
import { urlAdapterFor } from "../url/tableUrlState";
import { ADAPTTABLE_FIND_STATE } from "./findState";

export { FIND_URL_WRITE_DEBOUNCE_MS } from "@adapttable/core";
export type { FindInTableState };

/**
 * What {@link injectFindInTable} needs.
 *
 * @public
 */
export interface FindInTableOptions<TRow> {
  /** Off unless the host asked for it. Defaults to on. */
  readonly enabled?: MaybeSignal<boolean>;
  /** The rows the browser holds, in table order. */
  readonly rows: Signal<readonly TRow[]>;
  /** The columns as rendered. */
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  /** Where the rendered window starts in the dataset. Zero unless paged. */
  readonly firstRowIndex?: Signal<number>;
  /** URL-state backend. Defaults to the table's adapter. */
  readonly urlAdapter?: UrlStateAdapter;
  /** When `false`, keep the query in a local memory store. Defaults `true`. */
  readonly urlSync?: boolean;
  /** Namespace, when several tables share one URL (`lab.find`). */
  readonly urlKey?: string;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * Find state over the loaded rows.
 *
 * A table that provides {@link ADAPTTABLE_FIND_STATE} also receives the
 * state there, so a toolbar control drawn in another slot can open the bar.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link FindInTableOptions}.
 * @returns The state; inert with `enabled` false.
 *
 * @public
 */
export function injectFindInTable<TRow>(
  options: FindInTableOptions<TRow>
): Signal<FindInTableState> {
  if (!options.injector) assertInInjectionContext(injectFindInTable);
  const injector = options.injector ?? inject(Injector);
  const enabled = computed(() => readMaybe(options.enabled ?? true));
  const adapter =
    options.urlAdapter ?? urlAdapterFor({ urlSync: options.urlSync }, injector);
  const controller = createFindController({
    enabled: untracked(enabled),
    adapter,
    urlKey: options.urlKey,
  });
  const search = fromStore(
    {
      getSnapshot: () => adapter.getSearch(),
      subscribe: (listener) => adapter.subscribe(listener),
    },
    { injector }
  );
  effect(
    () => {
      controller.configure({
        enabled: enabled(),
        adapter,
        urlKey: options.urlKey,
      });
    },
    { injector }
  );
  effect(
    (onCleanup) => {
      onCleanup(controller.connect());
    },
    { injector }
  );
  effect(
    () => {
      search();
      enabled();
      controller.syncFromUrl();
    },
    { injector }
  );
  const snapshot = fromStore(controller, { injector });
  const state = computed((): FindInTableState => {
    const on = enabled();
    const { open, query, index } = snapshot();
    const matches =
      on && open
        ? findMatches({
            query,
            rows: options.rows(),
            columns: options.columns(),
            firstRowIndex: options.firstRowIndex?.() ?? 0,
          })
        : [];
    const safeIndex = clampMatchIndex(index, matches.length);
    return {
      open: on && open,
      setOpen: controller.setOpen,
      query,
      setQuery: controller.setQuery,
      matches,
      matchKeys: matchKeySet(matches),
      index: safeIndex,
      current: safeIndex === -1 ? null : (matches[safeIndex] ?? null),
      next: () => {
        controller.step(1, matches.length);
      },
      previous: () => {
        controller.step(-1, matches.length);
      },
      openBar: on ? controller.openBar : undefined,
    };
  });
  const box = injector.get(ADAPTTABLE_FIND_STATE, null, { optional: true });
  publishFindState(box, state, injector);
  return state;
}

/** Mirror the live state into the token a toolbar control reads. */
function publishFindState(
  box: WritableSignal<FindInTableState | null> | null,
  state: Signal<FindInTableState>,
  injector: Injector
): void {
  if (!box) return;
  effect(
    () => {
      box.set(state());
    },
    { injector }
  );
}
