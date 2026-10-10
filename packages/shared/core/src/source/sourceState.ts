/**
 * The two pieces every data-tier controller is built from: a subscription a
 * binding re-renders through, and an identity memo for derived inputs.
 */

/** Listeners told when a controller's own state moved, with a revision. */
export interface SourceSignal {
  readonly subscribe: (listener: () => void) => () => void;
  readonly revision: () => number;
  readonly notify: () => void;
}

/** Create a signal a binding subscribes to. */
export function createSourceSignal(): SourceSignal {
  const listeners = new Set<() => void>();
  let revision = 0;
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    revision: () => revision,
    notify() {
      revision += 1;
      for (const listener of listeners) listener();
    },
  };
}

/** Share the same identity and argument-count contract as the view-state stores. */
export { memoLast as memoOne } from "../utils/memoLast";
