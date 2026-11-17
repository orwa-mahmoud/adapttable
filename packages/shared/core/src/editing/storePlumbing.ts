/**
 * What every editing store shares: a value held in the table's store, and a
 * thenable check for the host's `onCellEdit` result.
 */

import { defineSlice, type TableStore } from "../state/tableStore";

/** Whether a host's return value is a promise the table should watch. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** A value, its readers, and one change at a time. */
export interface StateCell<T> {
  /** The value, including a write the change in progress made. */
  readonly get: () => T;
  /** Replace it; its readers hear when the change ends. */
  readonly set: (next: T) => void;
  /** Listen for a change. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Run `run` as one change. */
  readonly batch: (run: () => void) => void;
}

/**
 * One value a store keeps. In a table it is a slice of the table's store:
 * its writer reads a write at once, and its readers hear of it when the
 * table's change ends, with every other slice that change wrote. Outside a
 * table it is a cell of its own, with the same contract.
 *
 * @param name - What the value is, for debugging.
 * @param initial - Its starting value.
 * @param store - The table's store, when the value belongs to a table.
 * @returns The value's reader, writer, subscription and batch.
 */
export function stateCell<T>(
  name: string,
  initial: T,
  store: TableStore | undefined
): StateCell<T> {
  return store ? sliceCell(name, initial, store) : ownCell(initial);
}

/** A value held as a slice of a table's store. */
function sliceCell<T>(
  name: string,
  initial: T,
  store: TableStore
): StateCell<T> {
  const key = defineSlice<T>(name, () => initial);
  return {
    get: () => store.read(key),
    set: (next) => {
      store.batch((writer) => writer.write(key, next));
    },
    subscribe: store.slice(key).subscribe,
    batch: (run) => {
      store.batch(() => run());
    },
  };
}

/** A value of its own, outside a table. */
function ownCell<T>(initial: T): StateCell<T> {
  let value = initial;
  let depth = 0;
  let changed = false;
  const listeners = new Set<() => void>();
  const publish = (): void => {
    if (depth > 0 || !changed) return;
    changed = false;
    for (const listener of listeners) listener();
  };
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(value, next)) return;
      value = next;
      changed = true;
      publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    batch(run) {
      depth += 1;
      try {
        run();
      } finally {
        depth -= 1;
        publish();
      }
    },
  };
}
