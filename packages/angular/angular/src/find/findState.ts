/**
 * The live find state, for a control drawn somewhere else in the table.
 *
 * The data table provides the token; {@link injectFindInTable} writes it.
 * A toolbar button reads it. Outside a table that composed find, the token
 * is absent and the button draws nothing.
 */
import type { FindInTableState } from "@adapttable/core/binding";
import { InjectionToken, type WritableSignal } from "@angular/core";

/**
 * A writable signal holding the table's find state, or `null` until find
 * is composed.
 *
 * @public
 */
export const ADAPTTABLE_FIND_STATE = new InjectionToken<
  WritableSignal<FindInTableState | null>
>("ADAPTTABLE_FIND_STATE");
