/**
 * Row selection as a store slice: the ids of the selected rows.
 *
 * Every change is a named action. A row reads whether it is selected through
 * {@link rowSelectedReader}, which tells it about a change only when that
 * row's own state changed, so selecting one row redraws that row.
 */
import {
  type ActionDefinition,
  defineAction,
  defineSlice,
  selectFrom,
  type StoreReader,
  type TableStore,
} from "./tableStore";
import { toggleId, toggleIds } from "./tableStores";

/** Two id sets with the same members. */
function sameIds(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

/**
 * The ids of the selected rows.
 *
 * @public
 */
export const SELECTED_IDS = defineSlice<ReadonlySet<string>>(
  "selection/ids",
  () => new Set(),
  sameIds
);

/**
 * Select a row when it is not selected, else clear it.
 *
 * @public
 */
export const toggleRowSelected: ActionDefinition<string> = defineAction(
  "selection/toggle",
  (store, id) => store.update(SELECTED_IDS, (ids) => toggleId(ids, id))
);

/**
 * Select every row in the list when one of them is not selected, else clear
 * them all.
 *
 * @public
 */
export const toggleRowsSelected: ActionDefinition<readonly string[]> =
  defineAction("selection/toggleMany", (store, ids) =>
    store.update(SELECTED_IDS, (selected) => toggleIds(selected, ids))
  );

/**
 * Select exactly these rows.
 *
 * @public
 */
export const replaceSelection: ActionDefinition<Iterable<string>> =
  defineAction("selection/replace", (store, ids) =>
    store.write(SELECTED_IDS, new Set(ids))
  );

/**
 * Select no rows.
 *
 * @public
 */
export const clearSelection: ActionDefinition<void> = defineAction(
  "selection/clear",
  (store) => store.write(SELECTED_IDS, new Set())
);

/**
 * A reader of whether one row is selected, told only when that row's state
 * changes.
 *
 * @param store - The table's store.
 * @param id - The row's id.
 *
 * @public
 */
export function rowSelectedReader(
  store: TableStore,
  id: string
): StoreReader<boolean> {
  return selectFrom(store, (read) => read(SELECTED_IDS).has(id));
}
