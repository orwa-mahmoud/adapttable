/** The table's one store, for every part of a Vue table that keeps state. */
import {
  onRowRekeyMoves,
  onRowRekeys,
  type RowRekeyable,
  type RowRekeyHandler,
  type TableStore,
} from "@adapttable/core/binding";
import {
  hasInjectionContext,
  inject,
  type InjectionKey,
  onScopeDispose,
} from "vue";

/**
 * The store of the table being rendered: its URL view state, column layout,
 * expansion and row pinning live in it. A table's root passes it to what it
 * calls itself and provides it to the components inside it.
 *
 * @public
 */
export const TABLE_STORE: InjectionKey<TableStore> = Symbol(
  "adapttable-table-store"
);

/** The store of the table whose features are mounting right now. */
let mounting: TableStore | undefined;

/**
 * Run a table's feature mounts with its store in scope. The features mount
 * inside the table's own setup, where its `provide` is not yet visible, so
 * {@link injectTableStore} reads the store from here while they run.
 *
 * @param store - The table's store.
 * @param run - What mounts the features.
 * @returns What `run` returns.
 */
export function withTableStore<T>(store: TableStore, run: () => T): T {
  const outer = mounting;
  mounting = store;
  try {
    return run();
  } finally {
    mounting = outer;
  }
}

/**
 * The store of the table this component is inside, or `undefined` outside a
 * table, where each composable keeps a store of its own.
 *
 * @public
 */
export function injectTableStore(): TableStore | undefined {
  if (mounting) return mounting;
  return hasInjectionContext() ? inject(TABLE_STORE, undefined) : undefined;
}

/**
 * Follow the rekeys of a table's committed data while the current scope
 * lives. Does nothing outside a table.
 *
 * @param store - The table's store.
 * @param handler - Moves the piece of state.
 */
export function followRowRekeys<TRow>(
  store: TableStore | undefined,
  handler: RowRekeyHandler<TRow>
): void {
  if (store) onScopeDispose(onRowRekeys(store, handler));
}

/**
 * Move a store's row-keyed state with a table's rekeyed commits while the
 * current scope lives. Does nothing outside a table.
 *
 * @param store - The table's store.
 * @param target - The store whose state is kept by row id.
 */
export function followRowRekeyMoves<TRow>(
  store: TableStore | undefined,
  target: RowRekeyable<TRow>
): void {
  if (store) onScopeDispose(onRowRekeyMoves(store, target));
}
