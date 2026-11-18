/**
 * View state held in the table's store alone: page, page size, search, sort,
 * grouping and filters, with no URL to read or write.
 */
import type { TableViewStateConfig } from "@adapttable/core";
import { createLocalTableViewStore } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
} from "@angular/core";

import { readMaybe } from "../store";
import { tableStoreOf } from "../tableStore";
import type { TableUrlState, TableUrlStateOptions } from "./tableUrlState";
import { viewStateMutators } from "./viewStateMutators";

/**
 * Options for `injectLocalTableViewState`.
 *
 * @public
 */
export type LocalTableViewStateOptions = Pick<
  TableUrlStateOptions,
  "defaults" | "numberExtraKeys" | "arrayExtraKeys" | "injector"
>;

/**
 * Table view state that lives in memory for an Angular component or
 * service. It reads and writes no URL and carries no URL code.
 *
 * @param options - See {@link LocalTableViewStateOptions}.
 * @returns The state signal and its mutators.
 *
 * @public
 */
export function injectLocalTableViewState(
  options: LocalTableViewStateOptions = {}
): TableUrlState {
  if (!options.injector) assertInInjectionContext(injectLocalTableViewState);
  const injector = options.injector ?? inject(Injector);
  const config = computed((): TableViewStateConfig => ({
    defaults: readMaybe(options.defaults),
    numberExtraKeys: readMaybe(options.numberExtraKeys),
    arrayExtraKeys: readMaybe(options.arrayExtraKeys),
  }));
  const store = createLocalTableViewStore(
    {},
    { store: tableStoreOf(injector) }
  );
  const revision = signal(0);
  const unsubscribe = store.subscribe(() => {
    revision.update((value) => value + 1);
  });
  injector.get(DestroyRef).onDestroy(unsubscribe);

  return {
    state: computed(() => {
      revision();
      store.configure(config());
      return store.getSnapshot();
    }),
    ...viewStateMutators(() => store),
  };
}
