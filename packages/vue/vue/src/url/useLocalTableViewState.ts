import { createLocalTableViewStore } from "@adapttable/core/binding";
import { computed, type MaybeRefOrGetter, shallowRef, toValue } from "vue";

import { requireScope } from "../store";
import { injectTableStore } from "../tableStore";
import type {
  TableUrlState,
  UseTableUrlStateOptions,
} from "./useTableUrlState";
import { projectViewStore } from "./viewStateProjection";

/**
 * Options for `useLocalTableViewState`: the view's defaults and the table's
 * store, without a URL.
 *
 * @public
 */
export type UseLocalTableViewStateOptions = Pick<
  UseTableUrlStateOptions,
  "defaults" | "numberExtraKeys" | "arrayExtraKeys" | "store"
>;

/**
 * A table's view state — page, sort, search, grouping and filters — held in
 * memory, with no URL to read or write. A table that uses it carries no URL
 * code; `useTableUrlState` is the same state shared through the address bar.
 *
 * @param input - Defaults, the extra keys read as numbers or arrays, and the
 *   table's store.
 * @returns The view and its mutators.
 * @public
 */
export function useLocalTableViewState(
  input: MaybeRefOrGetter<UseLocalTableViewStateOptions> = {}
): TableUrlState {
  requireScope("useLocalTableViewState");
  const options = computed(() => toValue(input));
  const store = createLocalTableViewStore(
    {},
    { store: options.value.store ?? injectTableStore() }
  );
  return projectViewStore(shallowRef(store), options);
}
