import {
  createLocalTableViewStore,
  type UseTableUrlStateResult,
} from "@adapttable/core/binding";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { UseTableUrlStateOptions } from "./useTableUrlState";
import { viewStateResult } from "./viewStateResult";

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
 * @param options - Defaults, the extra keys read as numbers or arrays, and
 *   the table's store.
 * @returns The view and its mutators.
 *
 * @public
 */
export function useLocalTableViewState(
  options: UseLocalTableViewStateOptions = {}
): UseTableUrlStateResult {
  const {
    defaults,
    numberExtraKeys,
    arrayExtraKeys,
    store: tableStore,
  } = options;
  const config = { defaults, numberExtraKeys, arrayExtraKeys };
  // The store is created once per table store; later configuration reaches
  // it through `configure`, which keeps every unchanged value's identity.
  const [initialConfig] = useState(config);
  const store = useMemo(
    () => createLocalTableViewStore(initialConfig, { store: tableStore }),
    [initialConfig, tableStore]
  );
  store.configure(config);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
  return viewStateResult(state, store);
}
