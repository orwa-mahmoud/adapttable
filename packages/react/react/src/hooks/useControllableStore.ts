/**
 * The React side of `@adapttable/core`'s controllable store: hold one per
 * component, hand it the host's value and callback every render, and read
 * the value it resolves.
 */

import type { RowPatchLog } from "@adapttable/core";
import {
  type ControllableControl,
  type ControllableStore,
  type ControllableStoreOptions,
  createControllableStore,
  onRowRekeys,
} from "@adapttable/core/binding";
import {
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { TableStoreContext } from "../state/tableStoreContext";

/** No host value: the store holds the state itself. */
export const UNCONTROLLED = { value: undefined } as const;

/**
 * One controllable store for this component.
 *
 * @param initial - The uncontrolled starting value, read on the first render.
 * @param control - The host's value and change callback, this render.
 * @param options - Module-stable store options.
 * @param rekey - How the value follows a rekey, when it is kept by row id.
 * @returns The resolved value and the store its mutators commit through.
 */
export function useControllableStore<T>(
  initial: () => T,
  control: ControllableControl<T>,
  options?: ControllableStoreOptions<T>,
  rekey?: (value: T, log: RowPatchLog<unknown>) => T
): readonly [value: T, store: ControllableStore<T>] {
  // Inside a table the value is a slice of the table's store.
  const table = useContext(TableStoreContext);
  const [store] = useState(() =>
    createControllableStore(initial(), { ...options, store: table })
  );
  store.control(control);
  // A value kept by row id follows a rekey in the commit that made it.
  useLayoutEffect(() => {
    if (!table || !rekey) return undefined;
    return onRowRekeys(table, (log) => {
      store.update((current) => rekey(current, log));
    });
  }, [table, store, rekey]);
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return [value, store] as const;
}
