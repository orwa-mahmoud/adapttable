/**
 * What a view-state hook hands back: the view, and the store's mutators.
 *
 * @packageDocumentation
 */
import type { TableViewState } from "@adapttable/core";
import type {
  TableViewStore,
  UseTableUrlStateResult,
} from "@adapttable/core/binding";

/**
 * The view and the mutators of `store`, in the shape every view-state hook
 * returns.
 *
 * @param state - The view the store holds.
 * @param store - The store whose mutators the result carries.
 * @returns The view with its mutators.
 */
export function viewStateResult(
  state: TableViewState,
  store: TableViewStore
): UseTableUrlStateResult {
  return {
    ...state,
    setPage: store.setPage,
    setLimit: store.setLimit,
    setSort: store.setSort,
    setGroupBy: store.setGroupBy,
    initializeGroupBy: store.initializeGroupBy,
    setGroupAggregateOverrides: store.setGroupAggregateOverrides,
    toggleSortLevel: store.toggleSortLevel,
    setSearch: store.setSearch,
    setExtra: store.setExtra,
    setExtras: store.setExtras,
    setFilterTree: store.setFilterTree,
    clearExtras: store.clearExtras,
    clearAll: store.clearAll,
  };
}
