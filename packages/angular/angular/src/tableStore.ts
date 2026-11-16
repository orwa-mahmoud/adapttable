/** The table's one store, for every part of an Angular table that keeps state. */
import type { TableStore } from "@adapttable/core/binding";
import { InjectionToken, type Injector } from "@angular/core";

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
