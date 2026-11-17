/**
 * What a binding's table runtime looks like to an agent: options, columns, the
 * observation, its pagination and its aggregation inputs.
 */
import { type ActionAiOptions, pageSizeOptions } from "@adapttable/core";
import {
  deriveRuntimeOperations,
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/core/binding";

import { type AggregationInputs, aggregationsFor } from "./aggregationCommands";
import { type SharedApproval, sharedApproval } from "./approvalConfig";
import { agentFiltersFromDefs } from "./filterCatalog";
import type { CommitPolicy, WritePolicy } from "./keys";
import {
  agentColumnsFromNeutral,
  observationFromNeutral,
  type TableAgentColumnPatch,
} from "./liveTable";
import { agentObservation } from "./observation";
import { type AgentPagination, agentPagination } from "./pagination";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentColumn,
  AgentObservation,
  ApprovalResult,
  ApprovalSubject,
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

export function cellRecord(
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

export function findRow(runtime: TableRuntime, rowKey: string): unknown {
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

export function columnsForRuntime(
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

export function observationFromRuntime(
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

/**
 * The live table's grouping state, as the neutral aggregation rules want it.
 *
 * A projection, not a decision: it names where the facts are and which
 * columns the agent may read. What may be offered and what may be set is
 * decided by `aggregationsFor` and `applyAggregations`.
 */
export function aggregationInputs(
  view: TableRuntimeView | undefined,
  options: TableAgentRuntimeOptions
): AggregationInputs {
  return {
    state: view?.groupingState,
    grouping: view?.sourceCapabilities?.grouping,
    allows: (key) => options.columns?.[key]?.readable !== false,
  };
}
