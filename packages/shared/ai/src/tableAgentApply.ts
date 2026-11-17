/**
 * The one dispatch surface a table hands the agent: reads, resolves, edits,
 * selection and filters, built from the runtime and laid under the host's own
 * callbacks.
 */
import {
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/core/binding";

import { applyAggregations } from "./aggregationCommands";
import type { RowAddressScope } from "./keys";
import { readRowsFromNeutral, resolveRowFromNeutral } from "./liveTable";
import {
  aggregationInputs,
  cellRecord,
  columnsForRuntime,
  findRow,
  type TableAgentRuntimeOptions,
} from "./tableAgentObservation";
import type {
  AgentApply,
  AgentColumn,
  ResolvedRow,
  RowReadQuery,
  RowRef,
  RowWindow,
} from "./types";

function liveReadRows(
  runtime: TableRuntime,
  columns: readonly AgentColumn[],
  query: RowReadQuery,
  readMax: number
): RowWindow {
  const table = runtime.view()?.neutralTable;
  if (table) return readRowsFromNeutral(table, columns, query, readMax);
  const view = runtime.view();
  const scope = query.scope ?? "visible";
  const rows =
    scope === "visible"
      ? (view?.visibleRows ?? view?.rows ?? [])
      : (view?.rows ?? []);
  const getRowId = view?.getRowId ?? (() => "");
  const hidden = columns.filter((column) => !column.readable).map((c) => c.id);
  const limit = Math.max(0, Math.min(query.limit, readMax));
  const sliced = rows.slice(query.offset, query.offset + limit);
  return {
    rows: sliced.map((row) => ({
      rowKey: getRowId(row),
      cells: cellRecord(row, columns, query.columns),
    })),
    offset: query.offset,
    limit,
    redacted: hidden,
  };
}

function liveResolveRow(
  runtime: TableRuntime,
  ref: RowRef,
  scope: RowAddressScope
): ResolvedRow {
  const table = runtime.view()?.neutralTable;
  if (table) return resolveRowFromNeutral(table, ref);
  const view = runtime.view();
  const rows =
    scope === "visible"
      ? (view?.visibleRows ?? view?.rows ?? [])
      : (view?.rows ?? []);
  const getRowId = view?.getRowId ?? (() => "");
  if ("rowKey" in ref) {
    return { rowKey: ref.rowKey, scope };
  }
  const index = ref.position - 1;
  const row = rows[index];
  if (!row) {
    throw new Error(`no row at 1-based position ${ref.position}`);
  }
  return { rowKey: getRowId(row), scope: ref.scope, position: ref.position };
}

function liveEditCells(
  runtime: TableRuntime,
  extra: AgentApply | undefined,
  edits: Parameters<NonNullable<AgentApply["editCells"]>>[0]
): ReturnType<NonNullable<AgentApply["editCells"]>> {
  if (extra?.editCells) return extra.editCells(edits);
  const view = runtime.view();
  const onCellEdit = view?.editing?.onCellEdit;
  if (!onCellEdit) {
    throw new Error("editCells is not wired");
  }
  for (const edit of edits) {
    const row = findRow(runtime, edit.rowKey);
    if (!row) {
      throw new Error(`row "${edit.rowKey}" is not in the current view`);
    }
    onCellEdit(row, edit.column, edit.value);
  }
}

function liveStageCells(
  runtime: TableRuntime,
  extra: AgentApply | undefined,
  edits: Parameters<NonNullable<AgentApply["stageCells"]>>[0]
): ReturnType<NonNullable<AgentApply["stageCells"]>> {
  if (extra?.stageCells) return extra.stageCells(edits);
  const view = runtime.view();
  const stage = view?.editing?.stageCell;
  if (!stage) {
    throw new Error("stageCells is not wired");
  }
  for (const edit of edits) {
    const row = findRow(runtime, edit.rowKey);
    if (!row) {
      throw new Error(`row "${edit.rowKey}" is not in the current view`);
    }
    stage(
      row,
      edit.rowKey,
      edit.column,
      typeof edit.value === "string" ? edit.value : String(edit.value)
    );
  }
}

function liveSetSelection(
  runtime: TableRuntime,
  extra: AgentApply | undefined,
  ids: readonly string[] | undefined
): void {
  extra?.setSelection?.(ids);
  if (!extra?.setSelection) runtime.view()?.selection?.replace(ids);
}

function rowScope(ref: RowRef): RowAddressScope {
  return "scope" in ref ? ref.scope : "visible";
}

function pickReadRows(
  runtime: TableRuntime,
  extra: AgentApply | undefined,
  columns: readonly AgentColumn[],
  readMax: number
): NonNullable<AgentApply["readRows"]> {
  return (query) => {
    if (extra?.readRows) return extra.readRows(query);
    return liveReadRows(runtime, columns, query, readMax);
  };
}

function pickResolveRow(
  runtime: TableRuntime,
  extra: AgentApply | undefined
): NonNullable<AgentApply["resolveRow"]> {
  return (ref) => {
    if (extra?.resolveRow) return extra.resolveRow(ref);
    return liveResolveRow(runtime, ref, rowScope(ref));
  };
}

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

export function applyLiveFilters(
  query: NonNullable<TableRuntimeView["query"]> | undefined,
  filters: unknown
): boolean {
  const live = liveQueryFilters(query);
  if (!live.setExtras && !live.clearExtras) return false;
  if (filters == null) {
    live.clearExtras?.();
    return true;
  }
  if (typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("setFilters requires a filter object");
  }
  if (Object.keys(filters).length === 0) {
    live.clearExtras?.();
    return true;
  }
  live.setExtras?.(filters as Record<string, unknown>);
  return true;
}

function requireQuery<
  K extends "setPage" | "setLimit" | "setSearch" | "setSort",
>(
  view: () => TableRuntimeView | undefined,
  name: K
): NonNullable<NonNullable<TableRuntimeView["query"]>[K]> {
  const fn = view()?.query?.[name];
  if (!fn) {
    throw new Error(`${name} is not wired`);
  }
  return fn;
}

/**
 * What the LIVE TABLE can do, before the host's own callbacks are laid over
 * it.
 *
 * `currentApply` builds `{ ...applyFromRuntime(...), ...options.apply }`, so
 * a callback the host supplied is the one that runs. A guard here that
 * checked for the same callback would be shadowed by that spread and could
 * never fire, which is why the view operations below reach straight for the
 * live table. `extra` still travels to the row, edit, stage and selection
 * helpers, which read it for their own reasons.
 */
export function applyFromRuntime(
  runtime: TableRuntime,
  options: TableAgentRuntimeOptions,
  extra?: AgentApply
): AgentApply {
  const columns = columnsForRuntime(options, runtime);
  const readMax = options.readMax ?? 50;
  const view = () => runtime.view();
  return {
    readRows: pickReadRows(runtime, extra, columns, readMax),
    resolveRow: pickResolveRow(runtime, extra),
    setPage: (page) => {
      requireQuery(view, "setPage")(page);
    },
    setLimit: (limit) => {
      requireQuery(view, "setLimit")(limit);
    },
    setSearch: (search) => {
      requireQuery(view, "setSearch")(search);
    },
    setSort: (key, dir) => {
      requireQuery(view, "setSort")(key, dir);
    },
    setGroupBy: (key) => {
      const grouping = view()?.groupingState;
      if (!grouping) throw new Error("setGroupBy is not wired");
      grouping.setGroupBy(key);
    },
    setAggregations: (patch) => {
      applyAggregations(aggregationInputs(view(), options), patch);
    },
    pinColumn: (key, side) => {
      const pinning = view()?.pinning;
      if (!pinning?.setColumnPin) throw new Error("pinColumn is not wired");
      pinning.setColumnPin(key, side);
    },
    hideColumn: (key, hidden) => {
      const layout = view()?.columnLayout;
      if (!layout?.setHidden) throw new Error("hideColumn is not wired");
      layout.setHidden(key, hidden);
    },
    moveColumn: (key, toIndex) => {
      const layout = view()?.columnLayout;
      if (!layout?.move) throw new Error("moveColumn is not wired");
      layout.move(key, toIndex);
    },
    setColumnOrder: (order) => {
      const layout = view()?.columnLayout;
      if (!layout?.setOrder) throw new Error("setColumnOrder is not wired");
      layout.setOrder(order);
    },
    pinRow: (rowKey, side) => {
      const pinning = view()?.pinning;
      if (!pinning?.setRowPin) throw new Error("pinRow is not wired");
      pinning.setRowPin(rowKey, side);
    },
    editCells: (edits) => liveEditCells(runtime, extra, edits),
    stageCells: (edits) => liveStageCells(runtime, extra, edits),
    setSelection: (ids) => liveSetSelection(runtime, extra, ids),
  };
}
