/**
 * Derive which view operations are wired on a live runtime view.
 */
import type { TableRuntimeView } from "../features/providers";

interface LiveQueryFilters {
  extra?: unknown;
  setExtras?: (extra: Record<string, unknown>) => void;
  clearExtras?: () => void;
}

function liveQueryFilters(
  query: NonNullable<TableRuntimeView["query"]> | undefined
): LiveQueryFilters {
  return query ? (query as LiveQueryFilters) : {};
}

/** Map runtime wiring to neutral-table operation flags. */
export function deriveRuntimeOperations<TRow>(
  view: TableRuntimeView<TRow> | undefined
): Readonly<Record<string, boolean>> {
  const query = view?.query;
  const extras = liveQueryFilters(query);
  const hasFilters = Boolean(extras.setExtras ?? extras.clearExtras);
  return {
    setSort: Boolean(query?.setSort),
    setSearch: Boolean(query?.setSearch),
    setPage: Boolean(query?.setPage),
    setLimit: Boolean(query?.setLimit),
    setFilters: hasFilters,
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
