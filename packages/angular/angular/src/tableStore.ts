/** The table's one store, for every part of an Angular table that keeps state. */
import {
  onRowRekeyMoves,
  onRowRekeys,
  type RowRekeyable,
  type RowRekeyHandler,
  type TableStore,
} from "@adapttable/core/binding";
import { DestroyRef, InjectionToken, type Injector } from "@angular/core";

/**
 * The store of the table being rendered: its URL view state, selection,
 * column layout, expansion, group collapse and row pinning live in it. The
 * table provides it to the injectors its parts are created in.
 *
 * @public
 */
export const TABLE_STORE = new InjectionToken<TableStore>(
  "adapttable table store"
);

/**
 * The store of the table `injector` belongs to, or `undefined` outside a
 * table, where each part keeps a store of its own.
 *
 * @param injector - Where the part is created.
 * @returns The table's store, if there is one.
 *
 * @public
 */
export function tableStoreOf(injector: Injector): TableStore | undefined {
  return injector.get(TABLE_STORE, null) ?? undefined;
}

/**
 * Follow the rekeys of a table's committed data until `injector` is
 * destroyed. Does nothing outside a table.
 *
 * @param injector - Where the part is created.
 * @param handler - Moves the piece of state.
 */
export function followRowRekeys<TRow>(
  injector: Injector,
  handler: RowRekeyHandler<TRow>
): void {
  const store = tableStoreOf(injector);
  if (store) injector.get(DestroyRef).onDestroy(onRowRekeys(store, handler));
}

/**
 * Move a store's row-keyed state with a table's rekeyed commits until
 * `injector` is destroyed. Does nothing outside a table.
 *
 * @param injector - Where the part is created.
 * @param target - The store whose state is kept by row id.
 */
export function followRowRekeyMoves<TRow>(
  injector: Injector,
  target: RowRekeyable<TRow>
): void {
  const store = tableStoreOf(injector);
  if (store) {
    injector.get(DestroyRef).onDestroy(onRowRekeyMoves(store, target));
  }
}
