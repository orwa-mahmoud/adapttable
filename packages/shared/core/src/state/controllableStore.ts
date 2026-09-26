/**
 * A controllable store: one piece of table state that either the table holds
 * (uncontrolled) or the host holds (controlled), behind one set of reads and
 * writes.
 *
 * Selection, expansion, collapsed groups, pinned rows and column layout all
 * work this way. Given a controlled value, the store reads it and reports
 * every change through the change callback instead of keeping its own copy;
 * without one, it keeps the state itself. Every mutator a domain builds on
 * top goes through {@link ControllableStore.commit}, so the split is decided
 * in one place and the mutators never need to know which mode they are in.
 */

/**
 * What the host passes to take control: a value, and where changes go.
 *
 * @public
 */
export interface ControllableControl<T> {
  /** The host's value. `undefined` leaves the store uncontrolled. */
  readonly value: T | undefined;
  /** Where every change goes — the change request (controlled) or an observer. */
  readonly onChange?: (next: T) => void;
}

/**
 * How a controllable store behaves.
 *
 * @public
 */
export interface ControllableStoreOptions<T> {
  /**
   * Tell `onChange` about uncontrolled changes too, as an observer. Off by
   * default: most domains only report through `onChange` when controlled.
   */
  readonly observeUncontrolled?: boolean;
  /** Skip a commit equal to the current value. Omit to commit every change. */
  readonly equals?: (current: T, next: T) => boolean;
  /**
   * While controlled, let {@link ControllableStore.current} read the store's
   * own last commit until the host hands over its value again — so two
   * changes made in one event compose instead of the second overwriting
   * the first. Off by default: most domains compute from the value rendered.
   */
  readonly readsOwnCommits?: boolean;
}

/**
 * One piece of controllable table state.
 *
 * @public
 */
export interface ControllableStore<T> {
  /** The controlled value when there is one, else the store's own. */
  readonly getSnapshot: () => T;
  /** Listen for changes to the store's own value. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Hand over the host's current value and change callback. */
  readonly control: (control: ControllableControl<T>) => void;
  /** Whether the host holds the value. */
  readonly isControlled: () => boolean;
  /**
   * The value a mutator computes from: the snapshot, or — with
   * `readsOwnCommits` — the store's own last commit since the host last
   * handed over its value.
   */
  readonly current: () => T;
  /**
   * Change the value: a change request to the host when controlled, the
   * store's own value otherwise.
   */
  readonly commit: (next: T) => void;
  /** Commit what `recipe` makes of {@link ControllableStore.current}. */
  readonly update: (recipe: (current: T) => T) => void;
}

/**
 * Create a controllable store.
 *
 * @param initial - The uncontrolled value to start from.
 * @param options - Observer mode and change detection.
 * @returns The store.
 *
 * @public
 */
export function createControllableStore<T>(
  initial: T,
  options: ControllableStoreOptions<T> = {}
): ControllableStore<T> {
  let own = initial;
  let control: ControllableControl<T> = { value: undefined };
  // The last controlled commit, while the host has not handed over a value.
  let committed: { value: T } | undefined;
  const listeners = new Set<() => void>();

  const snapshot = (): T => {
    const { value } = control;
    if (value === undefined) return own;
    return value;
  };
  const current = (): T => (committed ? committed.value : snapshot());

  const commit = (next: T): void => {
    if (options.equals?.(current(), next) === true) return;
    if (control.value !== undefined) {
      if (options.readsOwnCommits === true) committed = { value: next };
      control.onChange?.(next);
      return;
    }
    own = next;
    for (const listener of listeners) listener();
    if (options.observeUncontrolled === true) control.onChange?.(next);
  };

  return {
    getSnapshot: snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    control(next) {
      control = next;
      committed = undefined;
    },
    isControlled: () => control.value !== undefined,
    current,
    commit,
    update: (recipe) => commit(recipe(current())),
  };
}
