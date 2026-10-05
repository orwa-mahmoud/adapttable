/** Scope-owned find state. Core owns query, URL debounce and match walking. */
import {
  clampMatchIndex,
  type ColumnMetadata,
  createFindController,
  createFindShortcutScope,
  findMatches,
  matchKeySet,
  scrollCurrentMatchIntoView,
  type UrlStateAdapter,
} from "@adapttable/core";
import type { FindInTableState } from "@adapttable/core/binding";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
  watch,
} from "vue";

import {
  type ExternalStoreOptions,
  requireScope,
  useExternalStore,
  useScopeActivity,
} from "../store";
export interface FindInTableOptions<TRow> {
  readonly enabled?: boolean;
  readonly rows: readonly TRow[];
  readonly columns: readonly ColumnMetadata<TRow>[];
  readonly firstRowIndex?: number;
  readonly urlAdapter: UrlStateAdapter;
  readonly urlKey?: string;
  readonly root?: HTMLElement | null;
  readonly gridNavigation?: boolean;
  readonly scrollToColumn?: (columnIndex: number) => void;
  readonly scrollToRow?: (row: number) => void;
}
export function useFindInTable<TRow>(
  input: MaybeRefOrGetter<FindInTableOptions<TRow>>,
  activity: ExternalStoreOptions = {}
) {
  requireScope("useFindInTable");
  const options = computed(() => toValue(input));
  const owner = useScopeActivity();
  let disposed = false;
  const active = computed(
    () =>
      !disposed &&
      owner.value &&
      (toValue(activity.active) ?? true) &&
      options.value.enabled !== false
  );
  const config = computed(() => ({
    enabled: options.value.enabled !== false,
    adapter: options.value.urlAdapter,
    urlKey: options.value.urlKey,
  }));
  const controller = createFindController(config.value);
  watch(config, (next) => controller.configure(next), { flush: "sync" });
  const snapshot = useExternalStore(controller, { active });
  const search = useExternalStore(
    () => ({
      getSnapshot: () => options.value.urlAdapter.getSearch(),
      subscribe: (listener) => options.value.urlAdapter.subscribe(listener),
    }),
    { active }
  );
  watch([config, search, active], () => controller.syncFromUrl(), {
    immediate: true,
    flush: "sync",
  });
  watch(
    active,
    (on, _previous, cleanup) => {
      if (on) cleanup(controller.connect());
    },
    { immediate: true, flush: "sync" }
  );
  const run = (action: () => void): void => {
    if (active.value && !disposed) action();
  };
  const openBar = (): void => run(controller.openBar);
  const state = computed((): FindInTableState => {
    const { open, query, index } = snapshot.value;
    const enabled = options.value.enabled !== false;
    const matches =
      enabled && open
        ? findMatches({
            query,
            rows: options.value.rows,
            columns: options.value.columns,
            firstRowIndex: options.value.firstRowIndex,
          })
        : [];
    const safe = clampMatchIndex(index, matches.length);
    return {
      open: enabled && open,
      query,
      matches,
      matchKeys: matchKeySet(matches),
      index: safe,
      current: matches[safe] ?? null,
      setOpen: (next) => run(() => controller.setOpen(next)),
      setQuery: (next) => run(() => controller.setQuery(next)),
      next: () => run(() => controller.step(1, state.value.matches.length)),
      previous: () =>
        run(() => controller.step(-1, state.value.matches.length)),
      openBar: enabled ? openBar : undefined,
    };
  });
  watch(
    [active, () => options.value.root],
    ([on, root], _previous, cleanup) => {
      if (!on || !root) return;
      const scope = createFindShortcutScope({
        contains: (target) => target instanceof Node && root.contains(target),
        openBar,
      });
      const pointer = (event: Event) => scope.pointerDown(event.target);
      const focus = (event: Event) => scope.focusIn(event.target);
      const key = (event: KeyboardEvent) => {
        if (!event.defaultPrevented) scope.keyDown(event);
      };
      const document = root.ownerDocument;
      document.addEventListener("pointerdown", pointer, true);
      document.addEventListener("focusin", focus, true);
      document.addEventListener("keydown", key, true);
      cleanup(() => {
        document.removeEventListener("pointerdown", pointer, true);
        document.removeEventListener("focusin", focus, true);
        document.removeEventListener("keydown", key, true);
      });
    },
    { immediate: true, flush: "sync" }
  );
  watch(
    () =>
      state.value.current
        ? `${state.value.current.row}:${state.value.current.col}`
        : "",
    () => {
      if (!active.value || !state.value.current) return;
      options.value.scrollToRow?.(state.value.current.row);
      options.value.scrollToColumn?.(state.value.current.col);
      if (!options.value.gridNavigation)
        scrollCurrentMatchIntoView(options.value.root ?? null);
    },
    { flush: "post" }
  );
  onScopeDispose(() => {
    disposed = true;
    controller.flush();
  });
  return { state, flush: controller.flush };
}
