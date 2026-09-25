/**
 * The React side of `@adapttable/core`'s controllable store: hold one per
 * component, hand it the host's value and callback every render, and read
 * the value it resolves.
 */
import {
  type ControllableControl,
  type ControllableStore,
  type ControllableStoreOptions,
  createControllableStore,
} from "@adapttable/core";
import { useState, useSyncExternalStore } from "react";

/** No host value: the store holds the state itself. */
export const UNCONTROLLED = { value: undefined } as const;

/**
 * One controllable store for this component.
 *
 * @param initial - The uncontrolled starting value, read on the first render.
 * @param control - The host's value and change callback, this render.
 * @param options - Module-stable store options.
 * @returns The resolved value and the store its mutators commit through.
 */
export function useControllableStore<T>(
  initial: () => T,
  control: ControllableControl<T>,
  options?: ControllableStoreOptions<T>
): readonly [value: T, store: ControllableStore<T>] {
  const [store] = useState(() => createControllableStore(initial(), options));
  store.control(control);
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return [value, store] as const;
}
