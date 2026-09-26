/**
 * A live table runtime, mapped onto an agent session.
 *
 * A binding publishes its table as a `TableRuntime`: the latest composed view
 * and the setters beside it. This module reads that view as an observation,
 * serves row reads and row resolution from it, routes view changes and cell
 * writes through its setters, and binds all of it to one `AgentSession`. What
 * stays with the binding is its lifecycle — when a session is rebuilt, how a
 * pending state change is committed, and where an approval is drawn.
 */
import {
  type ActionAiOptions,
  pageSizeOptions,
  type TableRevisions,
} from "@adapttable/core";
import {
  deriveRuntimeOperations,
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/core/binding";

import {
  type AggregationInputs,
  aggregationsFor,
  applyAggregations,
} from "./aggregationCommands";
import {
  resolveApproval,
  type SharedApproval,
  sharedApproval,
} from "./approvalConfig";
import {
  type ApprovalTransaction,
  settleDecisions,
} from "./approvalTransaction";
import type { ProposalResolver } from "./binding";
import { tableActionCapabilities } from "./capabilities/actions";
import type { AgentContextInputs } from "./context";
import { agentFiltersFromDefs } from "./filterCatalog";
import type { CommitPolicy, RowAddressScope, WritePolicy } from "./keys";
import {
  agentColumnsFromNeutral,
  monotonicRevision,
  observationFromNeutral,
  readRowsFromNeutral,
  resolveRowFromNeutral,
  revisionToken,
  type TableAgentColumnPatch,
} from "./liveTable";
import { agentObservation } from "./observation";
import { type AgentPagination, agentPagination } from "./pagination";
import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentColumn,
  AgentObservation,
  AgentProgress,
  AgentSession,
  ApprovalResult,
  ApprovalSubject,
  ResolvedRow,
  RowReadQuery,
  RowRef,
  RowWindow,
} from "./types";

const PAGE_ONLY_SOURCE = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

/**
 * What a binding tells the runtime mapping about one table's agent.
 *
 * The framework-neutral half of a binding's options: identity, policy, column
 * overrides, and the host's own callbacks and capabilities. A binding adds
 * what belongs to its own lifecycle, such as where it publishes updates.
 *
 * @public
 */
export interface TableAgentRuntimeOptions {
  /** Host-supplied table identity. */
  readonly tableId: string;
  /** Whether host callbacks already authorize writes. */
  readonly writePolicy?: WritePolicy;
  /** When a write must be confirmed. */
  readonly approval?: SharedApproval;
  /** Whether an approved write stages or persists. */
  readonly commit?: CommitPolicy;
  /** Host confirmation. When set, chrome is skipped. */
  readonly onApprove?: (
    subject: ApprovalSubject,
    signal?: AbortSignal
  ) => Promise<ApprovalResult>;
  /** Per-column readability, writability, and labels. */
  readonly columns?: Readonly<Record<string, TableAgentColumnPatch>>;
  /** Largest `rows.read` window. */
  readonly readMax?: number;
  /** Host- or test-supplied observation. Live tables omit this. */
  readonly observe?: () => AgentObservation;
  /** Extra apply callbacks the live table does not already expose. */
  readonly apply?: AgentApply;
  /** Custom governed capabilities for this table. */
  readonly capabilities?: readonly AgentCapabilityDefinition[];
  /**
   * This table's approval policy for individual capabilities, by key.
   *
   * The same shape a row or bulk action carries. An entry **replaces**
   * {@link TableAgentRuntimeOptions.approval} for that one capability rather
   * than narrowing it: `required` asks on a table that asks for nothing, and
   * `automatic` skips the human on a table that asks for writes. Both
   * directions are deliberate — this is the developer's own answer to "who
   * confirms this".
   *
   * It is not the reader's answer. "Don't ask again" is `approval.alwaysAllow`
   * plus the approval memory: opt-in per capability, revocable, and reset by a
   * contract change. A capability carrying `required` here keeps asking however
   * often the reader waves it through.
   *
   * Approval decides who confirms an operation, never whether the table offers
   * it: a key the table does not wire, or one in
   * {@link TableAgentRuntimeOptions.excludeCapabilities}, stays unavailable
   * whatever this says.
   */
  readonly capabilityApproval?: Readonly<Record<string, ActionAiOptions>>;
  /**
   * Capability keys the agent may not use on this table.
   *
   * One list, for built-ins and custom definitions alike. It only ever denies:
   * a key the table does not wire stays unavailable whatever this says, and no
   * entry here can enable a forbidden operation. The table's own controls are
   * untouched — denying `view.setFilters` to the agent leaves a person
   * filtering exactly as before.
   */
  readonly excludeCapabilities?: readonly string[];
}

function mergeColumn(
  base: AgentColumn,
  patch: TableAgentRuntimeOptions["columns"]
): AgentColumn {
  const extra = patch?.[base.id];
  if (!extra) return base;
  return { ...base, ...extra };
}

function cellRecord(
  row: unknown,
  columns: readonly AgentColumn[],
  wanted?: readonly string[]
): Record<string, unknown> {
  const record =
    row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const cells: Record<string, unknown> = {};
  for (const column of columns) {
    if (!column.readable) continue;
    if (wanted && !wanted.includes(column.id)) continue;
    cells[column.id] = record[column.id];
  }
  return cells;
}

/**
 * `JSON.stringify` that never throws on host rows: a BigInt is written as its
 * digits with an `n`, and a value that contains itself is written once, not
 * followed back in.
 */
function stampJson(value: unknown): string {
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
 * A view carrying a neutral table stamps that table's revisions. Any other
 * view stamps its row identities and row payloads together with the page,
 * search, sort, filters, grouping, aggregation overrides, pins, hidden columns
 * and column order — written without throwing on a BigInt or on a row that
 * contains itself.
 *
 * @public
 */
export function viewRevisionStamp(view: TableRuntimeView | undefined): string {
  const table = view?.neutralTable;
  if (table) return monotonicRevision(table.revisions, undefined).token;
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
    pinnedColumns: view?.pinning?.columns,
    pinnedRows: view?.pinning?.rows,
    hiddenColumns: view?.columnLayout?.hidden,
    columnOrder: view?.columnLayout?.keys,
  });
}

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

function findRow(runtime: TableRuntime, rowKey: string): unknown {
  const table = runtime.view()?.neutralTable;
  if (table) return table.rowByKey(rowKey);
  const view = runtime.view();
  const rows = view?.rows ?? [];
  const getRowId = view?.getRowId;
  if (!getRowId) return undefined;
  return rows.find((row) => getRowId(row) === rowKey);
}

function stampColumnLayout(
  columns: readonly AgentColumn[],
  layout: TableRuntimeView["columnLayout"]
): readonly AgentColumn[] {
  if (!layout) return columns;
  const byId = new Map(columns.map((column) => [column.id, column]));
  const hidden = new Set(layout.hidden);
  const keys = layout.keys.length > 0 ? layout.keys : columns.map((c) => c.id);
  return keys.map((id) => {
    const existing = byId.get(id);
    const visible = !hidden.has(id);
    if (existing) return { ...existing, visible };
    return {
      id,
      label: id,
      type: "unknown",
      readable: true,
      writable: false,
      sortable: false,
      visible,
    };
  });
}

function columnsForRuntime(
  options: TableAgentRuntimeOptions,
  runtime: TableRuntime
): readonly AgentColumn[] {
  const table = runtime.view()?.neutralTable;
  if (table) return agentColumnsFromNeutral(table, options.columns);
  if (!options.columns) return [];
  return Object.entries(options.columns).map(([id, extra]) =>
    mergeColumn(
      {
        id,
        label: extra.label ?? id,
        type: extra.type ?? "unknown",
        readable: extra.readable ?? true,
        writable: extra.writable ?? false,
        sortable: extra.sortable ?? false,
      },
      options.columns
    )
  );
}

function observationPolicy(options: TableAgentRuntimeOptions) {
  const approval = sharedApproval(options.approval);
  return {
    ...(options.writePolicy ? { writePolicy: options.writePolicy } : {}),
    approval: approval.policy,
    ...(approval.presentation ? { presentation: approval.presentation } : {}),
    ...(options.commit ? { commit: options.commit } : {}),
  };
}

function observationFromRuntime(
  options: TableAgentRuntimeOptions,
  runtime: TableRuntime,
  revision: number,
  apply: AgentApply
): AgentObservation {
  const view = runtime.view();
  const table = view?.neutralTable;
  const query = view?.query;
  const ids = runtime.featureIds();
  const pages = serverPagination(view, query);
  if (table) {
    const live = observationFromNeutral(
      table,
      options,
      revision,
      apply,
      ids,
      query
        ? {
            page: query.page,
            limit: query.limit,
            search: query.search,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
            pinnedColumns: view?.pinning?.columns,
            pinnedRows: view?.pinning?.rows,
            hiddenColumns: view?.columnLayout?.hidden,
            columnOrder: view?.columnLayout?.keys,
          }
        : undefined
    );
    const sizes = offeredPageSizes(query);
    return {
      ...live,
      columns: stampColumnLayout(live.columns, view?.columnLayout),
      pagination: live.pagination
        ? { ...live.pagination, pageSizeOptions: sizes }
        : { ...pages, pageSizeOptions: sizes },
      groupBy: view?.groupingState?.groupBy,
      aggregations: aggregationsFor(aggregationInputs(view, options)),
      availableFilters: agentFiltersFromDefs(
        view?.filterDefs,
        view?.filterRegistry,
        options.columns
      ),
      filters: query?.extra,
    };
  }
  const columns = stampColumnLayout(
    columnsForRuntime(options, runtime).map((column) =>
      mergeColumn(column, options.columns)
    ),
    view?.columnLayout
  );
  // What this runtime offers, and what the host wired, projected into the
  // neutral contract. Which of those two makes a capability available is
  // decided once, for a local engine and a server alike, by `agentObservation`.
  return agentObservation({
    tableId: options.tableId,
    viewRevision: revision,
    featureIds: ids,
    columns,
    source: view?.sourceCapabilities ?? PAGE_ONLY_SOURCE,
    operations: {
      ...deriveRuntimeOperations(view),
      // `applyView` is the host's alone; no runtime offers it by itself.
      applyView: apply.applyView !== undefined,
    },
    apply: options.apply ?? {},
    policy: observationPolicy(options),
    view: {
      search: query?.search ?? "",
      ...(query?.sortBy === undefined ? {} : { sortBy: query.sortBy }),
      ...(query?.sortDir === undefined ? {} : { sortDir: query.sortDir }),
      ...(view?.groupingState?.groupBy === undefined
        ? {}
        : { groupBy: view.groupingState.groupBy }),
      ...(view?.pinning?.columns
        ? { pinnedColumns: view.pinning.columns }
        : {}),
      ...(view?.pinning?.rows ? { pinnedRows: view.pinning.rows } : {}),
      ...(view?.columnLayout?.hidden
        ? { hiddenColumns: view.columnLayout.hidden }
        : {}),
      ...(view?.columnLayout?.keys
        ? { columnOrder: view.columnLayout.keys }
        : {}),
      ...(query?.extra === undefined ? {} : { filters: query.extra }),
    },
    pagination: pages,
    rowAddressScope: "visible",
    readMax: options.readMax ?? 50,
    aggregations: aggregationsFor(aggregationInputs(view, options)),
    availableFilters: agentFiltersFromDefs(
      view?.filterDefs,
      view?.filterRegistry,
      options.columns
    ),
  });
}

/** The sizes the table's own rows-per-page control lists. */
function offeredPageSizes(query: TableRuntimeView["query"]): readonly number[] {
  const limit = query?.limit ?? 10;
  const published =
    (query as { defaultLimit?: number } | undefined)?.defaultLimit ?? limit;
  return pageSizeOptions([limit, published]);
}

/**
 * What a server-backed table's pages are, from what the source will say.
 *
 * The total is the server's count for the *current query* — the figure the
 * table's own pagination is computed from — and it is published only when the
 * source claims to have counted. A source that has not counted keeps an
 * unknown total rather than being handed the rows that happen to be loaded,
 * and a short page is the one thing it still proves about its own end.
 */
function serverPagination(
  view: TableRuntimeView | undefined,
  query: TableRuntimeView["query"]
): AgentPagination {
  const counted =
    (view?.sourceCapabilities ?? PAGE_ONLY_SOURCE).totalCount === "exact";
  const total = query?.total;
  const loaded = view?.rows.length;
  return agentPagination({
    page: query?.page ?? 1,
    pageSize: query?.limit ?? 10,
    pageSizeOptions: offeredPageSizes(query),
    ...(counted && total !== undefined ? { totalRows: total } : {}),
    ...(loaded === undefined ? {} : { loadedRows: loaded }),
    // Only a source wired to take a page number can be sent one.
    canJump: query?.setPage !== undefined,
  });
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

function applyLiveFilters(
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
function applyFromRuntime(
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

/**
 * Column ids whose author asked for live values.
 *
 * The flag is the author's, so it is read from the contract rather than from
 * anything a reader can move. A column the agent may not read is not sampled
 * whatever it says — the sampler refuses it too, and asking twice is cheaper
 * than a read that comes back empty.
 *
 * @public
 */
export function sampledColumns(session: AgentSession): readonly string[] {
  return session
    .manifest()
    .columns.filter((column) => column.readable && column.ai?.sample === true)
    .map((column) => column.id);
}

/**
 * The live view and filter catalog, in the shape the context builder takes.
 *
 * The same values the observation carries, read straight off the runtime so
 * the caller does not have to rebuild an observation to get at them. What the
 * table cannot answer for is simply absent, and the sanitized view names the
 * gap rather than defaulting it. `samples` are the live values already read
 * for the columns whose author opted in.
 *
 * @public
 */
export function viewInputsFromRuntime(
  runtime: TableRuntime,
  options: TableAgentRuntimeOptions,
  samples: Readonly<Record<string, readonly unknown[]>>
): AgentContextInputs {
  const view = runtime.view();
  const query = view?.query;
  const filters = agentFiltersFromDefs(
    view?.filterDefs,
    view?.filterRegistry,
    options.columns
  );
  // The operations each column takes travel with the contract, not behind a
  // describe call: a caller that has to guess between "avg" and "average"
  // guesses wrong, and only finds out by being refused.
  const aggregations = aggregationsFor(aggregationInputs(view, options));
  return {
    ...(filters && filters.length > 0 ? { filters } : {}),
    ...(aggregations ? { aggregations } : {}),
    ...(Object.keys(samples).length > 0 ? { samples } : {}),
    view: {
      ...(query?.page === undefined ? {} : { page: query.page }),
      ...(query?.limit === undefined ? {} : { limit: query.limit }),
      ...(query?.search === undefined ? {} : { search: query.search }),
      ...(query?.sortBy ? { sortBy: query.sortBy } : {}),
      ...(query?.sortDir ? { sortDir: query.sortDir } : {}),
      ...(view?.groupingState?.groupBy
        ? { groupBy: view.groupingState.groupBy }
        : {}),
      ...(query?.extra ? { filters: query.extra } : {}),
      ...(view?.pinning?.columns
        ? {
            pinnedColumns: view.pinning.columns,
          }
        : {}),
      ...(view?.pinning?.rows
        ? {
            pinnedRows: view.pinning.rows,
          }
        : {}),
      ...(view?.columnLayout?.hidden
        ? { hiddenColumns: view.columnLayout.hidden }
        : {}),
      ...(view?.columnLayout?.keys
        ? { columnOrder: view.columnLayout.keys }
        : {}),
    },
  };
}

/**
 * A row-by-row refusal, with the reader's stated reason when they gave one.
 *
 * Every row still pending is refused. The reason travels with the refusal so
 * the receipt and the model-visible result can say why rather than only that.
 *
 * @public
 */
export function perItemRefusal(
  transaction: ApprovalTransaction,
  stated: string | undefined
): ApprovalResult {
  return {
    ...settleDecisions(transaction.decisions, "rejected"),
    ...(stated ? { reason: stated } : {}),
  };
}

/**
 * One comparable string for an exclusion list, order-insensitive.
 *
 * @public
 */
export function exclusionKey(keys: readonly string[] | undefined): string {
  return keys ? [...keys].sort((a, b) => a.localeCompare(b)).join("|") : "";
}

/**
 * What a capability does to the table, from the live catalog.
 *
 * Read through the session rather than kept in a list here: the definition is
 * the only thing that knows, and it is published on the catalog entry so
 * every surface reads the same answer. `undefined` without a session, without
 * a capability, or for a key the catalog does not list.
 *
 * @public
 */
export function capabilityKind(
  session: AgentSession | undefined,
  capability: string | undefined
): AgentCapabilityDefinition["kind"] | undefined {
  if (!session || capability === undefined) return undefined;
  return session.catalog().find((entry) => entry.key === capability)?.kind;
}

/**
 * The opt-in list, with an action's own demand for a human applied.
 *
 * The shared configuration is read directly; an action that sets
 * `approval: "required"` is read from the custom definition it was declared
 * on, so a capability that must always be confirmed never offers the control
 * however the table was configured.
 *
 * @public
 */
export function alwaysAllowFor(
  approval: SharedApproval | undefined,
  capabilities: readonly AgentCapabilityDefinition[] | undefined,
  capability: string | undefined
): readonly string[] {
  const shared = sharedApproval(approval);
  if (capability === undefined) return shared.alwaysAllow;
  const definition = capabilities?.find((entry) => entry.key === capability);
  return resolveApproval(shared, definition?.ai).alwaysAllow;
}

/**
 * How the reader's own table answers for a proposed write.
 *
 * Rows are looked up in the live runtime view. A column the host marked
 * unreadable reads as unreadable, and a proposed value is formatted by the
 * column's own `formatValue` against the row it would produce, so `170 → 175`
 * reads as `$170k → $175k` in the wording the cells use. `displayProposals`
 * turns these answers into what the reader is shown.
 *
 * @public
 */
export function readerResolver(
  runtime: TableRuntime,
  columns: Readonly<Record<string, TableAgentColumnPatch>> | undefined
): ProposalResolver {
  const view = runtime.view();
  const recordFor = (rowKey: string): Record<string, unknown> | undefined => {
    const row = findRow(runtime, rowKey);
    return row && typeof row === "object"
      ? (row as Record<string, unknown>)
      : undefined;
  };
  return {
    rowLabel: (rowKey) => {
      const row = findRow(runtime, rowKey);
      return row !== undefined && view?.rowLabel
        ? view.rowLabel(row)
        : undefined;
    },
    cellValue: (rowKey, column) => recordFor(rowKey)?.[column],
    cellText: (rowKey, column, value) => {
      const definition = runtime
        .view()
        ?.groupingState?.columns?.find((entry) => entry.key === column);
      const format = definition?.formatValue;
      const record = recordFor(rowKey);
      if (!format || !record) return undefined;
      return format({ ...record, [column]: value });
    },
    readable: (column) => columns?.[column]?.readable !== false,
    columnLabel: (column) => columns?.[column]?.label,
  };
}

/**
 * The live table's grouping state, as the neutral aggregation rules want it.
 *
 * A projection, not a decision: it names where the facts are and which
 * columns the agent may read. What may be offered and what may be set is
 * decided by `aggregationsFor` and `applyAggregations`.
 */
function aggregationInputs(
  view: TableRuntimeView | undefined,
  options: TableAgentRuntimeOptions
): AggregationInputs {
  return {
    state: view?.groupingState,
    grouping: view?.sourceCapabilities?.grouping,
    allows: (key) => options.columns?.[key]?.readable !== false,
  };
}

function asCallable(
  value: unknown
): ((...input: unknown[]) => unknown) | undefined {
  if (typeof value !== "function") return undefined;
  return value as (...input: unknown[]) => unknown;
}

/**
 * View mutations whose default implementation belongs to this mapping.
 *
 * They call the runtime's own setters. Committing those setters before the
 * call returns lets the session attribute the resulting table revision to the
 * exact apply call that made it. Host overrides are excluded: only the host
 * can say when its own async callback has settled.
 */
const BINDING_VIEW_MUTATIONS: ReadonlySet<string> = new Set([
  "setPage",
  "setLimit",
  "setSearch",
  "setSort",
  "setFilters",
  "setGroupBy",
  "setAggregations",
  "pinColumn",
  "hideColumn",
  "moveColumn",
  "setColumnOrder",
  "pinRow",
  "setSelection",
]);

/**
 * The view revision an agent session stamps its observations with.
 *
 * @public
 */
export interface RevisionCounter {
  /** Advance from a neutral table's revisions, and return the revision. */
  readonly bumpFrom: (revisions: TableRevisions) => number;
  /** Advance from a runtime view's stamp, and return the revision. */
  readonly bumpFromStamp: (stamp: string) => number;
  /** The revision as it stands. */
  readonly current: () => number;
}

/**
 * A counter that starts at 1 and moves by one whenever the stamp it is given
 * differs from the last one.
 *
 * The first stamp only records where the table is, so the same view always
 * reads the same revision and any change to it reads a higher one.
 *
 * @public
 */
export function createRevisionCounter(): RevisionCounter {
  let token: string | undefined;
  let revision = 1;
  const bumpFromToken = (nextToken: string): number => {
    if (token === undefined) {
      token = nextToken;
      return revision;
    }
    if (token === nextToken) return revision;
    token = nextToken;
    revision += 1;
    return revision;
  };
  return {
    bumpFrom(revisions: TableRevisions) {
      return bumpFromToken(revisionToken(revisions));
    },
    bumpFromStamp(stamp: string) {
      return bumpFromToken(stamp);
    },
    current() {
      return revision;
    },
  };
}

function currentApply(
  options: TableAgentRuntimeOptions,
  runtime: TableRuntime
): AgentApply {
  const fromRuntime = applyFromRuntime(runtime, options, options.apply);
  const apply: AgentApply = { ...fromRuntime, ...options.apply };
  apply.setFilters = (filters) => {
    if (options.apply?.setFilters) {
      options.apply.setFilters(filters);
      return;
    }
    const applied = applyLiveFilters(runtime.view()?.query, filters);
    if (!applied) {
      throw new Error("setFilters is not wired");
    }
  };
  return apply;
}

/**
 * What {@link bindLiveSession} reads, each at the moment it needs it.
 *
 * The references are read at call time rather than captured, so a session
 * built once follows a binding whose options, runtime and handlers change
 * after it was built.
 *
 * @public
 */
export interface LiveSessionInputs {
  /** The binding's options as they stand. */
  readonly options: { readonly current: TableAgentRuntimeOptions };
  /** The live table as it stands. */
  readonly runtime: { readonly current: TableRuntime };
  /** The counter the session's observations are stamped from. */
  readonly revisions: RevisionCounter;
  /**
   * Commits a state change the binding still holds, before the session takes
   * its admission snapshot for a call.
   */
  readonly flushAdmission: { readonly current: () => void };
  /** Asks the table's own approval surface when the host set no `onApprove`. */
  readonly waitForChrome: {
    readonly current: (
      subject: ApprovalSubject,
      signal?: AbortSignal
    ) => Promise<ApprovalResult>;
  };
  /** Where a running capability's progress goes, and `null` when it stops. */
  readonly reportProgress: {
    readonly current: (report: AgentProgress | null) => void;
  };
  /**
   * Runs one view mutation this mapping implements and commits the state it
   * changes before returning.
   */
  readonly flush: (run: () => void) => void;
}

/**
 * One agent session over a live table runtime.
 *
 * The session observes the runtime view on every call and applies through its
 * setters, with the host's own `apply` callbacks laid over them. Its
 * capabilities are the host's definitions followed by one per row and bulk
 * action the table composed. A view mutation this mapping implements runs
 * inside `flush`, so the revision it produces is attributed to that call, and
 * every `execute` commits the binding's pending state first through
 * `flushAdmission`, so a reader's own change is refused as foreign rather than
 * swept into the agent's call.
 *
 * @public
 */
export function bindLiveSession(inputs: LiveSessionInputs): AgentSession {
  const {
    options: optionsRef,
    runtime: runtimeRef,
    revisions: revisionCounter,
    flushAdmission,
    waitForChrome,
    reportProgress,
    flush,
  } = inputs;
  const apply = new Proxy<AgentApply>(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        const live = currentApply(
          optionsRef.current,
          runtimeRef.current
        ) as Record<string, unknown>;
        if (!(prop in live)) return undefined;
        return (...args: unknown[]) => {
          const options = optionsRef.current;
          const latest = currentApply(options, runtimeRef.current) as Record<
            string,
            unknown
          >;
          const fn = asCallable(latest[prop]);
          if (!fn) return undefined;
          const host = options.apply as Record<string, unknown> | undefined;
          if (BINDING_VIEW_MUTATIONS.has(prop) && !asCallable(host?.[prop])) {
            let result: unknown;
            flush(() => {
              result = fn(...args);
            });
            return result;
          }
          return fn(...args);
        };
      },
    }
  );
  const observe = () => {
    const options = optionsRef.current;
    if (options.observe) return options.observe();
    const runtimeView = runtimeRef.current.view();
    const table = runtimeView?.neutralTable;
    let viewRevision = revisionCounter.current();
    if (table) viewRevision = revisionCounter.bumpFrom(table.revisions);
    else if (runtimeView) {
      viewRevision = revisionCounter.bumpFromStamp(
        viewRevisionStamp(runtimeView)
      );
    }
    return observationFromRuntime(
      options,
      runtimeRef.current,
      viewRevision,
      apply
    );
  };
  const onApprove = (subject: ApprovalSubject, signal?: AbortSignal) => {
    const options = optionsRef.current;
    if (options.onApprove) return options.onApprove(subject, signal);
    // No second policy decision here. The session already resolved whether a
    // human is asked, for THIS capability, with the action's own override
    // applied — so a table that asks for nothing by default can still mark
    // one action always-ask.
    return waitForChrome.current(subject, signal);
  };
  const inner = createAgentSession({
    observe,
    apply,
    onApprove,
    // Read at call time, like everything else here. The session is built once
    // and a host may wire where progress goes after that, so what a capability
    // reports is delivered through the reference rather than through whatever
    // was configured when the session was made.
    onProgress: (report) => {
      reportProgress.current(report);
    },
    // The host's own definitions, then one per row and bulk action the table
    // composed. The action set is part of the registry key, so a table that
    // gains or loses an action gets a session that offers exactly those.
    capabilities: [
      ...(optionsRef.current.capabilities ?? []),
      ...tableActionCapabilities(runtimeRef.current.view()?.actions, {
        actions: () => runtimeRef.current.view()?.actions,
        rowFor: (rowKey) => {
          const view = runtimeRef.current.view();
          return view?.rows.find((row) => view.getRowId(row) === rowKey);
        },
        selectedIds: () => {
          const selection = runtimeRef.current.view()?.selection;
          return selection ? [...selection.selectedIds] : undefined;
        },
      }),
    ],
    ...(optionsRef.current.capabilityApproval
      ? { capabilityApproval: optionsRef.current.capabilityApproval }
      : {}),
    ...(optionsRef.current.excludeCapabilities
      ? { excludeCapabilities: optionsRef.current.excludeCapabilities }
      : {}),
  });
  return {
    catalog: () => inner.catalog(),
    describe: (key: string) => inner.describe(key),
    execute: async (
      key: string,
      args: unknown,
      expectedRevision: number,
      idempotencyKey: string,
      signal?: AbortSignal
    ) => {
      // The binding may still hold a reader's earlier state change. It is
      // committed before the session takes its admission snapshot, so that
      // change is refused as foreign, never swept into the revision of the
      // agent call below. The mapping's own mutation is committed in `apply`
      // above.
      flushAdmission.current();
      const result = await inner.execute(
        key,
        args,
        expectedRevision,
        idempotencyKey,
        signal
      );
      return result;
    },
    manifest: () => inner.manifest(),
  };
}
