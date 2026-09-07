/**
 * Neutral-table bridge for the React agent feature.
 */
import {
  type ColumnMetadata,
  type NeutralTable,
  revisionToken,
  type TableRevisions,
  type TableRowScope,
} from "@adapttable/core";

import { type SharedApproval, sharedApproval } from "./approvalConfig";
import type { CommitPolicy, RowAddressScope, WritePolicy } from "./keys";
import type {
  AgentApply,
  AgentColumn,
  AgentObservation,
  ResolvedRow,
  RowReadQuery,
  RowRef,
  RowWindow,
} from "./types";

/** Column overrides merged onto discovered engine columns. */
export interface TableAgentColumnPatch {
  readonly readable?: boolean;
  readonly writable?: boolean;
  readonly type?: string;
  readonly sortable?: boolean;
  readonly label?: string;
}

/** Options the live bridge reads when building an observation. */
export interface LiveObservationOptions {
  readonly tableId: string;
  readonly writePolicy?: WritePolicy;
  readonly approval?: SharedApproval;
  readonly commit?: CommitPolicy;
  readonly columns?: Readonly<Record<string, TableAgentColumnPatch>>;
  readonly readMax?: number;
  readonly apply?: AgentApply;
}

export { revisionToken };

/** Map a row scope from agent refs to engine scope. */
export function engineScope(scope: RowAddressScope): TableRowScope {
  return scope;
}

/**
 * Serialize a cell for the agent protocol. React nodes and opaque values
 * become explicit transport markers instead of invented strings.
 */
export function transportCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  const kind = typeof value;
  if (kind === "string" || kind === "number" || kind === "boolean") {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") {
    // An anonymous function reports an empty name, not a missing one.
    const name = (value as { name?: string }).name;
    return {
      __adapttable: "function",
      name: name === undefined || name === "" ? "anonymous" : name,
    };
  }
  if (typeof value === "symbol") return value.toString();
  if (value instanceof Date) return value.toISOString();
  try {
    JSON.stringify(value);
    return value;
  } catch {
    return { __adapttable: "unserializable", kind };
  }
}

function columnLabel<TRow>(column: ColumnMetadata<TRow>): string {
  if (typeof column.header === "string" && column.header.length > 0) {
    return column.header;
  }
  return column.key;
}

function inferColumnType(value: unknown): string {
  if (value === null || value === undefined) return "unknown";
  const kind = typeof value;
  if (kind === "number") return "number";
  if (kind === "boolean") return "boolean";
  if (kind === "bigint") return "bigint";
  if (kind === "string") return "string";
  if (value instanceof Date) return "date";
  return "unknown";
}

function mergeColumnPatch(
  base: AgentColumn,
  patch: LiveObservationOptions["columns"]
): AgentColumn {
  const extra = patch?.[base.id];
  if (!extra) return base;
  return { ...base, ...extra };
}

/** Discover agent columns from live engine metadata plus optional overrides. */
export function agentColumnsFromNeutral<TRow>(
  table: NeutralTable<TRow>,
  patches?: Readonly<Record<string, TableAgentColumnPatch>>
): readonly AgentColumn[] {
  const sampleRow = table.rows("page")[0];
  return table.columns.map((column) => {
    const sample =
      sampleRow !== undefined
        ? table.cellValue(sampleRow, column.key)
        : undefined;
    const base: AgentColumn = {
      id: column.key,
      label: columnLabel(column),
      type: inferColumnType(sample),
      readable: true,
      writable: Boolean(column.editor),
      sortable: column.sortable === true,
    };
    return mergeColumnPatch(base, patches);
  });
}

function readableColumns(
  columns: readonly AgentColumn[]
): readonly AgentColumn[] {
  return columns.filter((column) => column.readable);
}

function boundLimit(requested: number, readMax: number): number {
  return Math.max(0, Math.min(requested, readMax));
}

function cellsForRow<TRow>(
  table: NeutralTable<TRow>,
  row: TRow,
  columns: readonly AgentColumn[],
  wanted?: readonly string[]
): Record<string, unknown> {
  const cells: Record<string, unknown> = {};
  for (const column of columns) {
    if (wanted && !wanted.includes(column.id)) continue;
    cells[column.id] = transportCellValue(table.cellValue(row, column.id));
  }
  return cells;
}

function assertScopeAvailable<TRow>(
  table: NeutralTable<TRow>,
  scope: TableRowScope
): void {
  if (scope === "full" && !table.capabilities.fullDataset) {
    throw new Error(
      'row scope "full" is not available — this source provides one page at a time'
    );
  }
}

/** Read rows for a scope using neutral cell resolution. */
export function readRowsFromNeutral<TRow>(
  table: NeutralTable<TRow>,
  columns: readonly AgentColumn[],
  query: RowReadQuery,
  readMax: number
): RowWindow {
  const scope = engineScope(query.scope ?? "visible");
  assertScopeAvailable(table, scope);
  const rows = table.rows(scope);
  const readable = readableColumns(columns);
  const hidden = columns.filter((column) => !column.readable).map((c) => c.id);
  const limit = boundLimit(query.limit, readMax);
  const sliced = rows.slice(query.offset, query.offset + limit);
  const wanted = query.columns;
  return {
    rows: sliced.map((row) => ({
      rowKey: table.rowKey(row),
      cells: cellsForRow(table, row, readable, wanted),
    })),
    offset: query.offset,
    limit,
    redacted: hidden,
  };
}

/** Resolve a row reference within a scope window. */
export function resolveRowFromNeutral<TRow>(
  table: NeutralTable<TRow>,
  ref: RowRef
): ResolvedRow {
  const scope = "scope" in ref ? ref.scope : "visible";
  const resolvedScope = engineScope(scope);
  assertScopeAvailable(table, resolvedScope);
  const rows = table.rows(resolvedScope);
  if ("rowKey" in ref) {
    return { rowKey: ref.rowKey, scope };
  }
  const index = ref.position - 1;
  const row = rows[index];
  if (!row) {
    throw new Error(`no row at 1-based position ${ref.position}`);
  }
  return {
    rowKey: table.rowKey(row),
    scope: ref.scope,
    position: ref.position,
  };
}

export function pageMaxFromNeutral<TRow>(table: NeutralTable<TRow>): number {
  const caps = table.capabilities;
  const loaded = table.rows("full").length;
  if (caps.fullDataset || caps.totalCount === "exact")
    return Math.max(loaded, 1);
  return Math.max(table.rows("page").length, 1);
}

export function rowAddressScopeForNeutral<TRow>(
  table: NeutralTable<TRow>
): RowAddressScope {
  const page = table.rows("page");
  const visible = table.rows("visible");
  if (page.length !== visible.length) return "visible";
  for (let index = 0; index < page.length; index++) {
    if (page[index] !== visible[index]) return "visible";
  }
  if (
    table.capabilities.fullDataset &&
    page.length !== table.rows("full").length
  ) {
    return "page";
  }
  return "visible";
}

export interface NeutralQueryOverlay {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly sortBy?: string;
  readonly sortDir?: "asc" | "desc";
  /**
   * Pin state the host chrome owns.
   *
   * The engine does not hold it — pinning is a layout decision the binding
   * makes — so it rides the overlay the same way page and search do.
   */
  readonly pinnedColumns?: Readonly<Record<string, "start" | "end">>;
  readonly pinnedRows?: {
    readonly top: readonly string[];
    readonly bottom: readonly string[];
  };
}

export function observationFromNeutral<TRow>(
  table: NeutralTable<TRow>,
  options: LiveObservationOptions,
  viewRevision: number,
  apply: AgentApply,
  featureIds: readonly string[],
  query?: NeutralQueryOverlay
): AgentObservation {
  const columns = agentColumnsFromNeutral(table, options.columns).map(
    (column) => mergeColumnPatch(column, options.columns)
  );
  const ops = table.operations;
  return {
    tableId: options.tableId,
    viewRevision,
    featureIds,
    columns,
    source: table.capabilities,
    writePolicy: options.writePolicy ?? "allow",
    approval: sharedApproval(options.approval).policy,
    commit: options.commit ?? "stage",
    hasPagination: ops.setPage === true || options.apply?.setPage !== undefined,
    hasSearch: ops.setSearch === true || options.apply?.setSearch !== undefined,
    hasSort: ops.setSort === true || options.apply?.setSort !== undefined,
    hasFilters:
      ops.setFilters === true || options.apply?.setFilters !== undefined,
    hasExport: options.apply?.runExport !== undefined,
    hasEdit:
      ops.editCells === true ||
      options.apply?.editCells !== undefined ||
      options.apply?.stageCells !== undefined,
    hasReorder:
      ops.reorderRows === true || options.apply?.reorderRows !== undefined,
    hasColumnPinning:
      ops.pinColumn === true || options.apply?.pinColumn !== undefined,
    hasRowPinning: ops.pinRow === true || options.apply?.pinRow !== undefined,
    pinnedColumns: query?.pinnedColumns,
    pinnedRows: query?.pinnedRows,
    hasSelection:
      options.apply?.setSelection !== undefined || ops.setSelection === true,
    hasSavedViews:
      featureIds.includes("saved-views") && apply.applyView !== undefined,
    hasAdd: options.apply?.addRows !== undefined,
    hasDelete: options.apply?.deleteRows !== undefined,
    page: query?.page ?? 1,
    limit: query?.limit ?? Math.max(1, table.rows("page").length || 10),
    search: query?.search ?? "",
    sortBy: query?.sortBy,
    sortDir: query?.sortDir,
    pageMax: pageMaxFromNeutral(table),
    readMax: options.readMax ?? 50,
    rowAddressScope: rowAddressScopeForNeutral(table),
  };
}

export function monotonicRevision(
  revisions: TableRevisions,
  lastToken: string | undefined
): { token: string; bumped: boolean } {
  const token = revisionToken(revisions);
  return { token, bumped: lastToken !== undefined && lastToken !== token };
}
