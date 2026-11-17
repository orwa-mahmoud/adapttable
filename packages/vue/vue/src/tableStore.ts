/** The table's one store, for every part of a Vue table that keeps state. */
import type { TableStore } from "@adapttable/core/binding";
import { hasInjectionContext, inject, type InjectionKey } from "vue";

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

/**
 * The store of the table this component is inside, or `undefined` outside a
 * table, where each composable keeps a store of its own.
 *
 * @public
 */
export function injectTableStore(): TableStore | undefined {
  return hasInjectionContext() ? inject(TABLE_STORE, undefined) : undefined;
}
