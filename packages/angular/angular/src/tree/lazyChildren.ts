/**
 * Children fetched when a tree node is opened — core's lazy-children
 * controller as a signal. The controller owns the loading and failed sets
 * and the fetch-once rule.
 */
import {
  createLazyChildrenController,
  type LazyChildrenOptions,
} from "@adapttable/core";
import type { LazyChildrenState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore } from "../store";

export type { LazyChildrenState } from "@adapttable/core/binding";

/**
 * Options for {@link injectLazyChildren}: core's lazy-children options and
 * the injector the state follows.
 *
 * @public
 */
export interface LazyChildrenInjectOptions<
  TRow,
> extends LazyChildrenOptions<TRow> {
  /** The injector whose lifetime the state follows. */
  readonly injector?: Injector;
}

/**
 * Track which nodes are fetching their children, and fetch on demand. A fetch
 * that settles after the injector is destroyed changes nothing.
 *
 * @param options - See {@link LazyChildrenInjectOptions}.
 * @returns The state, as a signal; inert while no `onLoadChildren` is given.
 *
 * @public
 */
export function injectLazyChildren<TRow>(
  options: LazyChildrenInjectOptions<TRow>
): Signal<LazyChildrenState<TRow>> {
  if (!options.injector) assertInInjectionContext(injectLazyChildren);
  const injector = options.injector ?? inject(Injector);
  const controller = createLazyChildrenController(options);
  const disconnect = controller.connect();
  injector.get(DestroyRef).onDestroy(disconnect);
  const snapshot = fromStore(controller, { injector });
  return computed(() => {
    const { loadingIds, failedIds } = snapshot();
    return { loadingIds, failedIds, loadIfNeeded: controller.loadIfNeeded };
  });
}
