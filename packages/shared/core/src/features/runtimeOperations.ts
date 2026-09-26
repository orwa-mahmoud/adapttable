/**
 * Which view operations a live runtime view wires by itself.
 *
 * A binding projecting its runtime into a neutral operations contract reads
 * this map. It reports what the view can do; what an operation means for an
 * agent capability is decided by the contract that consumes it.
 */
import type { TableRuntimeView } from "./tableRuntime";

/**
 * Map a runtime view's wiring to neutral operation flags.
 *
 * Every flag follows a setter the view publishes, never the state beside it: a
 * view that shows what is pinned but offers no way to change it reports
 * `pinColumn: false`. No view yet reports every operation unwired.
 *
 * @public
 */
export function deriveRuntimeOperations<TRow>(
  view: TableRuntimeView<TRow> | undefined
): Readonly<Record<string, boolean>> {
  const query = view?.query;
  return {
    setSort: Boolean(query?.setSort),
    setSearch: Boolean(query?.setSearch),
    setPage: Boolean(query?.setPage),
    setLimit: Boolean(query?.setLimit),
    setFilters: Boolean(query?.setExtras ?? query?.clearExtras),
    setGroupBy: Boolean(view?.groupingState?.setGroupBy),
    setSelection: Boolean(view?.selection),
    editCells: Boolean(view?.editing?.onCellEdit ?? view?.editing?.stageCell),
    pinColumn: Boolean(view?.pinning?.setColumnPin),
    pinRow: Boolean(view?.pinning?.setRowPin),
    hideColumn: Boolean(view?.columnLayout?.setHidden),
    moveColumn: Boolean(view?.columnLayout?.move),
    setColumnOrder: Boolean(view?.columnLayout?.setOrder),
  };
}
