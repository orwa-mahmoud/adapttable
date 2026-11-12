/**
 * One store per table: every piece of the table's state is a slice of it.
 *
 * A slice is a value under a typed key — the view state, the column layout,
 * the selection, the rows the evaluator derived. Changes go in as named
 * actions; an action's reducer writes the slices it changes, and each reader
 * hears about a change only when the slices it reads moved and what it
 * selects from them is different. Writes inside one action or one
 * {@link TableStore.batch} reach readers and listeners together when it ends,
 * and not at all when it throws, so nothing ever sees half an action.
 *
 * The store holds no framework code. A binding reads it through one adapter
 * — a hook, a ref, a signal — and writes it only from events and effects.
 */

/**
 * Where one store keeps one slice's value and who listens to it. Read and
 * written through the store, never directly.
 *
 * @public
 */
export interface SliceCell<T> {
  value: T;
  /** The value an action in progress wrote, until the action ends. */
  staged: { value: T } | undefined;
  readonly listeners: Set<() => void>;
}

/** A slice's key: its name and, in the type, its value. */
export interface SliceKey<T> {
  readonly name: string;
  /** The slice's starting value. */
  readonly initial: () => T;
  /**
   * Whether two values of the slice are the same; `Object.is` by default.
   * A method, so a map of slices may hold slices of any value type.
   */
  equals(a: T, b: T): boolean;
  /** Each store's cell for this slice, by the store's private token. */
  readonly cells: WeakMap<object, SliceCell<T>>;
}

/**
 * Define a slice: the key a store holds its value under.
 *
 * @param name - Unique within a table; features prefix their own.
 * @param initial - The value a store starts the slice with.
 * @param equals - When a write changes nothing; `Object.is` by default.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function defineSlice<T>(
  name: string,
  initial: () => T,
  equals: (a: T, b: T) => boolean = Object.is
): SliceKey<T> {
  return { name, initial, equals, cells: new WeakMap() };
}

/** Something a binding can read and listen to. */
export interface StoreReader<T> {
  readonly getSnapshot: () => T;
  readonly subscribe: (listener: () => void) => () => void;
}

/** Read slices by key. */
export type SliceRead = <T>(key: SliceKey<T>) => T;

/** What an action's reducer may do: read and write slices. */
export interface StoreWriter {
  readonly read: SliceRead;
  readonly write: <T>(key: SliceKey<T>, value: T) => void;
  readonly update: <T>(key: SliceKey<T>, recipe: (current: T) => T) => void;
}

/** A named change: its type, its payload, and the reducer that applies it. */
export interface TableAction<TPayload> {
  readonly type: string;
  readonly payload: TPayload;
  readonly reduce: (store: StoreWriter, payload: TPayload) => void;
}

/** A named action, called to make one. */
export interface ActionDefinition<TPayload> {
  (payload: TPayload): TableAction<TPayload>;
  readonly type: string;
}

/**
 * Define a named action.
 *
 * @param type - Unique within a table; features prefix their own.
 * @param reduce - Writes the slices the action changes.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function defineAction<TPayload>(
  type: string,
  reduce: (store: StoreWriter, payload: TPayload) => void
): ActionDefinition<TPayload> {
  const create = (payload: TPayload): TableAction<TPayload> => ({
    type,
    payload,
    reduce,
  });
  return Object.assign(create, { type });
}

/** One table's state. */
export interface TableStore {
  /** The current value of a slice; its initial value until it is written. */
  readonly read: SliceRead;
  /** A reader of one slice. */
  readonly slice: <T>(key: SliceKey<T>) => StoreReader<T>;
  /** Apply a named action. */
  readonly dispatch: <TPayload>(action: TableAction<TPayload>) => void;
  /** Apply `run`'s writes as one change. */
  readonly batch: (run: (store: StoreWriter) => void) => void;
  /**
   * A part of this store with slices of its own: its writes publish with
   * this store's, in one change when an action or batch ends, and `seed`
   * writes its starting state, which nobody can read before it exists.
   */
  readonly scope: (seed?: (store: StoreWriter) => void) => TableStore;
}

/** What a store notifies when a slice changes. */
interface Listened {
  readonly listeners: Set<() => void>;
}

/** A cell an action wrote: publish or drop its staged value. */
interface StagedCell extends Listened {
  /** Make the staged value the value; whether it changed. */
  readonly publish: () => boolean;
  readonly drop: () => void;
}

/**
 * Create a table's store.
 *
 * @param seed - Writes the store's starting state. It runs before the store
 *   is returned, when nothing can listen yet, so creating a store with state
 *   changes nothing anyone reads.
 *
 * @public
 */
export function createTableStore(
  seed?: (store: StoreWriter) => void
): TableStore {
  return storeIn({ depth: 0, staged: new Map() }, seed);
}

/** What a store and its scopes share: one change in progress at a time. */
interface Changes {
  /** How deep the actions and batches in progress are nested. */
  depth: number;
  /** The cells written in the change in progress. */
  readonly staged: Map<Listened, StagedCell>;
}

/** A store, or one of its scopes, over `changes`. */
function storeIn(
  changes: Changes,
  seed: ((store: StoreWriter) => void) | undefined
): TableStore {
  /** This store's identity in every slice key's cells. */
  const token = {};
  const { staged } = changes;

  function cellOf<T>(key: SliceKey<T>): SliceCell<T> {
    let cell = key.cells.get(token);
    if (!cell) {
      cell = { value: key.initial(), staged: undefined, listeners: new Set() };
      key.cells.set(token, cell);
    }
    return cell;
  }

  /** A slice's value, with the writes of an action in progress. */
  const read: SliceRead = (key) => {
    const cell = cellOf(key);
    return cell.staged ? cell.staged.value : cell.value;
  };

  function publish(): void {
    const heard = new Set<() => void>();
    for (const cell of staged.values()) {
      if (!cell.publish()) continue;
      for (const listener of cell.listeners) heard.add(listener);
    }
    staged.clear();
    for (const listener of heard) listener();
  }

  function run(apply: (store: StoreWriter) => void): void {
    changes.depth += 1;
    try {
      apply(writer);
    } catch (error) {
      if (changes.depth === 1) {
        for (const cell of staged.values()) cell.drop();
        staged.clear();
      }
      throw error;
    } finally {
      changes.depth -= 1;
    }
    if (changes.depth === 0) publish();
  }

  const writer: StoreWriter = {
    read,
    write(key, value) {
      const cell = cellOf(key);
      if (key.equals(read(key), value)) return;
      cell.staged = { value };
      if (staged.has(cell)) return;
      staged.set(cell, {
        listeners: cell.listeners,
        publish() {
          const next = cell.staged;
          cell.staged = undefined;
          if (!next || key.equals(cell.value, next.value)) return false;
          cell.value = next.value;
          return true;
        },
        drop() {
          cell.staged = undefined;
        },
      });
    },
    update(key, recipe) {
      writer.write(key, recipe(read(key)));
    },
  };

  if (seed) run(seed);

  return {
    read,
    slice(key) {
      return {
        getSnapshot: () => read(key),
        subscribe(listener) {
          const { listeners } = cellOf(key);
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      };
    },
    dispatch(action) {
      run((store) => action.reduce(store, action.payload));
    },
    batch: run,
    scope: (scopeSeed) => storeIn(changes, scopeSeed),
  };
}

/**
 * A reader of what `selector` makes of a store's slices, told only when the
 * slices it read change and the selected value with them. The slices it
 * reads may differ from one evaluation to the next; it follows them.
 *
 * @param store - The table's store.
 * @param selector - Reads slices and returns what the reader needs.
 * @param equals - When two selected values are the same; `Object.is` by
 *   default.
 *
 * @public
 */
export function selectFrom<T>(
  store: TableStore,
  selector: (read: SliceRead) => T,
  equals: (a: T, b: T) => boolean = Object.is
): StoreReader<T> {
  /** The slices the last evaluation read, each with how to listen to it. */
  let reads = new Map<object, (listener: () => void) => () => void>();
  let value: T;
  let fresh = false;
  const tracking: SliceRead = (key) => {
    reads.set(key, (listener) => store.slice(key).subscribe(listener));
    return store.read(key);
  };
  const evaluate = (): T => {
    reads = new Map();
    return selector(tracking);
  };
  /** Evaluate, keeping the last value when the selection is the same. */
  const refresh = (): void => {
    const next = evaluate();
    if (!fresh || !equals(value, next)) value = next;
    fresh = true;
  };
  const listeners = new Set<() => void>();
  const unsubscribers = new Map<object, () => void>();
  const onChange = (): void => {
    const next = evaluate();
    watch();
    if (fresh && equals(value, next)) return;
    value = next;
    fresh = true;
    for (const listener of [...listeners]) listener();
  };
  // Listen to exactly the slices the last evaluation read. One listener for
  // every slice, so a change to several in one action is heard once.
  const watch = (): void => {
    for (const [key, stop] of unsubscribers) {
      if (reads.has(key)) continue;
      stop();
      unsubscribers.delete(key);
    }
    for (const [key, listen] of reads) {
      if (!unsubscribers.has(key)) unsubscribers.set(key, listen(onChange));
    }
  };
  return {
    getSnapshot() {
      if (listeners.size === 0 || !fresh) refresh();
      return value;
    },
    subscribe(listener) {
      if (listeners.size === 0) {
        refresh();
        watch();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        for (const stop of unsubscribers.values()) stop();
        unsubscribers.clear();
        fresh = false;
      };
    },
  };
}
