import type { TableRuntimeView } from "@adapttable/core/binding";

import { monotonicRevision } from "./liveTable";
export type RuntimeOverlayView = Pick<
  TableRuntimeView,
  "pinning" | "columnLayout" | "selection"
>;
export type RuntimeOverlays = ReturnType<typeof runtimeOverlays>;

/**
 * `JSON.stringify` that never throws on host rows: a BigInt is written as its
 * digits with an `n`, and a value that contains itself is written once, not
 * followed back in.
 */
export function stampJson(value: unknown): string {
  // The chain of objects from the root to the one being written. A value
  // already on it is a cycle; one seen elsewhere is only shared, and is written.
  const ancestors: unknown[] = [];
  return JSON.stringify(
    value,
    function replace(this: unknown, _key: string, next: unknown): unknown {
      if (typeof next === "bigint") return `${next.toString()}n`;
      if (typeof next !== "object" || next === null) return next;
      while (ancestors.length > 0 && ancestors.at(-1) !== this) {
        ancestors.pop();
      }
      if (ancestors.includes(next)) return undefined;
      ancestors.push(next);
      return next;
    }
  );
}

/**
 * A string that changes whenever the runtime view an agent reads changes.
 *
 * A view carrying a neutral table combines its engine revisions with the
 * layout, pinning and selection state owned outside that engine. Other views
 * include row identities and payloads, query, grouping and aggregation state.
 * Set-like fields use deterministic ordering without changing host collections.
 * BigInt and cyclic host rows can be stamped without throwing.
 *
 * @public
 */
export function viewRevisionStamp(view: TableRuntimeView | undefined): string {
  return revisionStampWithOverlays(view, runtimeOverlays(view));
}

/** The same authority with a caller-supplied overlay projection. */
export function revisionStampWithOverlays(
  view: TableRuntimeView | undefined,
  overlays: RuntimeOverlays
): string {
  const table = view?.neutralTable;
  if (table) {
    const token = monotonicRevision(table.revisions, undefined).token;
    const stamp = stampJson(overlays);
    return stamp === "{}" ? token : `${token}:${stamp}`;
  }
  const rows = view?.rows ?? [];
  const getRowId = view?.getRowId;
  const query = view?.query;
  return stampJson({
    ids: rows.map((row) => (getRowId ? getRowId(row) : null)),
    payloads: rows,
    page: query?.page ?? 1,
    limit: query?.limit ?? 10,
    search: query?.search ?? "",
    sortBy: query?.sortBy,
    sortDir: query?.sortDir,
    filters: query?.extra,
    groupBy: view?.groupingState?.groupBy,
    aggregateOverrides: view?.groupingState?.aggregateOverrides,
    ...overlays,
  });
}

function compareIds(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function runtimeOverlays(view: RuntimeOverlayView | undefined) {
  const columns = view?.pinning?.columns;
  const selection = view?.selection;
  return {
    pinnedColumns: columns
      ? Object.keys(columns)
          .sort(compareIds)
          .map((key) => [key, columns[key]])
      : undefined,
    pinnedRows: view?.pinning?.rows,
    hiddenColumns: view?.columnLayout
      ? [...new Set(view.columnLayout.hidden)].sort(compareIds)
      : undefined,
    columnOrder: view?.columnLayout?.keys,
    selection: selection
      ? {
          ids: [...selection.selectedIds].sort(compareIds),
          allMatching: selection.allMatching ?? false,
          acrossPages: selection.acrossPages ?? false,
        }
      : undefined,
  };
}
