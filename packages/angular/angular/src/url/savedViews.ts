/**
 * Named snapshots of the table's URL state — its search, sort, filters,
 * paging and layout — kept in storage, as signals over core's controller.
 */
import {
  createSavedViewsController,
  safeLocalStorage,
  type SavedView,
  type SavedViewsControllerOptions,
} from "@adapttable/core";
import type { UseSavedViewsResult } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  isSignal,
  type Signal,
  untracked,
} from "@angular/core";

import { fromStore, type MaybeSignal, readMaybe } from "../store";

/**
 * Options for {@link injectSavedViews}.
 *
 * @public
 */
export interface SavedViewsOptions extends SavedViewsControllerOptions {
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * A table's saved views: the list and the default as signals, and what can
 * be done to them.
 *
 * @public
 */
export interface SavedViewsState extends Omit<
  UseSavedViewsResult,
  "views" | "defaultView"
> {
  /** The saved views, in list order. */
  readonly views: Signal<readonly SavedView[]>;
  /** The default view, when one is set. */
  readonly defaultView: Signal<SavedView | undefined>;
}

/**
 * Saved views for a table.
 *
 * @param options - Where the views are kept and the URL backend, or a live
 * signal of that configuration. Persistence destination changes reload the
 * list; URL and callback changes preserve the current views.
 * @returns See {@link SavedViewsState}.
 *
 * @public
 */
export function injectSavedViews(
  options: MaybeSignal<SavedViewsOptions>
): SavedViewsState {
  const initial = untracked(() => readMaybe(options));
  if (!initial.injector) assertInInjectionContext(injectSavedViews);
  const injector = initial.injector ?? inject(Injector);
  // No backend at all — the server, blocked storage — keeps them in memory.
  const resolve = (next: SavedViewsOptions): SavedViewsControllerOptions => ({
    ...next,
    storage:
      next.storage === undefined ? (safeLocalStorage() ?? null) : next.storage,
  });
  let configured = resolve(initial);
  const controller = createSavedViewsController(configured);
  let disconnect = controller.connect();
  injector.get(DestroyRef).onDestroy(() => disconnect());
  const snapshot = fromStore(controller, { injector });
  if (isSignal(options)) {
    effect(
      () => {
        const next = resolve(options());
        untracked(() => {
          controller.configure(next);
          // A new persistence destination loads its own list. URL and
          // callback changes configure operations without losing local edits.
          if (
            next.storageKey !== configured.storageKey ||
            next.storage !== configured.storage ||
            next.store !== configured.store
          ) {
            disconnect();
            disconnect = controller.connect();
          }
          configured = next;
        });
      },
      { injector }
    );
  }
  return {
    views: computed(() => snapshot().views),
    defaultView: computed(() => snapshot().defaultView),
    save: controller.save,
    apply: controller.apply,
    remove: controller.remove,
    rename: controller.rename,
    move: controller.move,
    setDefault: controller.setDefault,
    reload: controller.reload,
  };
}
