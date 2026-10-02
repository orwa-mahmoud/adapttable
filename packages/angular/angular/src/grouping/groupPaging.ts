/**
 * How much of a paged group model is showing — core's group paging
 * controller as a signal.
 */
import { createGroupPagingController } from "@adapttable/core";
import type { GroupPagingState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore } from "../store";

export type { GroupPagingState } from "@adapttable/core/binding";

/**
 * Options for {@link injectGroupPaging}.
 *
 * @public
 */
export interface GroupPagingOptions {
  /** The injector whose lifetime the state follows. */
  readonly injector?: Injector;
}

/**
 * Track how much of a paged group model is showing.
 *
 * @param options - See {@link GroupPagingOptions}.
 * @returns The state, inert until something calls `showMore`.
 *
 * @public
 */
export function injectGroupPaging(
  options: GroupPagingOptions = {}
): Signal<GroupPagingState> {
  if (!options.injector) assertInInjectionContext(injectGroupPaging);
  const injector = options.injector ?? inject(Injector);
  const controller = createGroupPagingController();
  const paging = fromStore(controller, { injector });
  const { showMore, reset } = controller;
  return computed(() => ({ paging: paging(), showMore, reset }));
}
