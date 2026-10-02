/**
 * Which rows have their detail panel open, as a signal. Several rows may be
 * open at once, keyed by row id, so an open panel survives sorting and
 * paging: a row that leaves the page re-opens when it returns.
 */
import { createControllableStore, toggleId } from "@adapttable/core";
import type { RowExpansionState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore } from "../store";

export type { RowExpansionState } from "@adapttable/core/binding";

/**
 * Options for {@link injectRowExpansion}.
 *
 * @public
 */
export interface RowExpansionOptions {
  /** Row ids whose panel starts open. */
  readonly defaultExpandedIds?: readonly string[];
  /** The injector whose lifetime the state follows. */
  readonly injector?: Injector;
}

/**
 * Row-expansion state for a detail panel or a nested table.
 *
 * @param options - See {@link RowExpansionOptions}.
 * @returns The state, as a signal.
 *
 * @public
 */
export function injectRowExpansion(
  options: RowExpansionOptions = {}
): Signal<RowExpansionState> {
  if (!options.injector) assertInInjectionContext(injectRowExpansion);
  const injector = options.injector ?? inject(Injector);
  const store = createControllableStore<ReadonlySet<string>>(
    new Set(options.defaultExpandedIds)
  );
  const own = fromStore(store, { injector });
  const toggle = (id: string): void => {
    store.update((prev) => toggleId(prev, id));
  };
  return computed((): RowExpansionState => {
    const expandedIds = own();
    return {
      expandedIds,
      isExpanded: (id) => expandedIds.has(id),
      toggle,
    };
  });
}
