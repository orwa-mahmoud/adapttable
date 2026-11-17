/**
 * The mutators a view-state signal exposes, each forwarded to the store a
 * table is reading at the moment of the call.
 */
import type { TableViewStore } from "@adapttable/core";

import type { TableUrlState } from "./tableUrlState";

/**
 * Forward every view-state mutator to the store `current` returns.
 *
 * @param current - The store the table reads now.
 * @returns The mutators.
 */
export function viewStateMutators(
  current: () => TableViewStore
): Omit<TableUrlState, "state"> {
  return {
    setPage: (...args) => current().setPage(...args),
    setLimit: (...args) => current().setLimit(...args),
    setSort: (...args) => current().setSort(...args),
    setGroupBy: (...args) => current().setGroupBy(...args),
    initializeGroupBy: (...args) => current().initializeGroupBy(...args),
    setGroupAggregateOverrides: (...args) =>
      current().setGroupAggregateOverrides(...args),
    toggleSortLevel: (...args) => current().toggleSortLevel(...args),
    setSearch: (...args) => current().setSearch(...args),
    setExtra: (...args) => current().setExtra(...args),
    setExtras: (...args) => current().setExtras(...args),
    setFilterTree: (...args) => current().setFilterTree(...args),
    clearExtras: (...args) => current().clearExtras(...args),
    clearAll: (...args) => current().clearAll(...args),
  };
}
