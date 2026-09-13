/**
 * Opt-in table feature — `@adapttable/ai-react`.
 *
 * `@adapttable/ai` stays React-free. This package mounts a provider that
 * observes the live table and publishes a versioned manifest.
 */
import {
  type AgentApply,
  type AgentCapabilityDefinition,
  type AgentColumn,
  agentColumnsFromNeutral,
  type AgentContextInputs,
  agentFiltersFromDefs,
  type AgentObservation,
  agentObservation,
  type AgentPagination,
  agentPagination,
  type AgentSession,
  type AggregationInputs,
  aggregationsFor,
  applyAggregations,
  type ApprovalResult,
  type ApprovalSubject,
  type ApprovalTransaction,
  assertAlwaysAllow,
  closeTransaction,
  type CommitPolicy,
  contractFingerprint,
  createAgentSession,
  createApprovalMemory,
  displayProposals,
  mayAlwaysAllow,
  monotonicRevision,
  observationFromNeutral,
  openTransaction,
  type PendingApproval,
  type ProposalResolver,
  readRowsFromNeutral,
  recordDecision,
  registerWebMcpTools,
  resolveApproval,
  type ResolvedRow,
  resolveRowFromNeutral,
  revisionToken,
  type RowAddressScope,
  type RowReadQuery,
  type RowRef,
  type RowWindow,
  settleDecisions,
  type SharedApproval,
  sharedApproval,
  type TableAgentBridge as NeutralBridge,
  type TableAgentColumnPatch,
  type WritePolicy,
} from "@adapttable/ai";
import type { ActionAiOptions } from "@adapttable/core";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_VIEW_STATE,
  type AgentAlwaysAllowState,
  type AgentApprovalPending,
  type AgentViewState,
  deriveRuntimeOperations,
  type FeatureProviderProps,
  featureStateKey,
  FeatureStateScope,
  type StaticTableFeature,
  type TableRuntimeView,
  useTableRuntime,
} from "@adapttable/react/adapter";
import {
  type ReactNode,
  useCallback,
  useDebugValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type { SharedApproval, TableAgentColumnPatch };

// The bridge contract is `@adapttable/ai`'s — a manifest, a session and a
// pending approval are what any binding publishes, none of it React. Named
// here with this binding's own pending shape so every existing import keeps
// working.
export type TableAgentBridge = NeutralBridge<AgentApprovalPending>;

const PAGE_ONLY_SOURCE = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

/**
 * Feature-state key for the live {@link AgentSession}.
 *
 * @public
 */
export const TABLE_AGENT_STATE = featureStateKey<AgentSession>("table-agent");

/**
 * Options for {@link tableAgent}.
 *
 * @public
 */
export interface TableAgentOptions {
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
  /** Host callbacks for manifest and session attach. */
  readonly bridge?: TableAgentBridge;
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
   * {@link approval} for that one capability rather than narrowing it:
   * `required` asks on a table that asks for nothing, and `automatic` skips the
   * human on a table that asks for writes. Both directions are deliberate —
   * this is the developer's own answer to "who confirms this".
   *
   * It is not the reader's answer. "Don't ask again" is `approval.alwaysAllow`
   * plus the approval memory: opt-in per capability, revocable, and reset by a
   * contract change. A capability carrying `required` here keeps asking however
   * often the reader waves it through.
   *
   * Approval decides who confirms an operation, never whether the table offers
   * it: a key the table does not wire, or one in
   * {@link excludeCapabilities}, stays unavailable whatever this says.
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
  /**
   * Offer this table's capabilities to a browser-resident agent.
   *
   * `true` offers everything the session permits; an object narrows the
   * surface. It narrows only — a capability the table excludes stays
   * unavailable, and a browser confirmation is in addition to the table's own
   * approval rather than instead of it. Does nothing in a browser without the
   * API, and nothing on a server.
   */
  readonly webmcp?:
    | true
    | {
        readonly exposedTo?: readonly string[];
        /**
         * Told what was registered, and told `[]` when the registration goes.
         *
         * For a surface that lists the tools a browser agent can see. Nothing
         * depends on it: a page that does not care never passes it.
         */
        readonly onRegister?: (names: readonly string[]) => void;
      };
}

interface TableAgentFeature extends StaticTableFeature {
  readonly options: TableAgentOptions;
}

function mergeColumn(
  base: AgentColumn,
  patch: TableAgentOptions["columns"]
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

function viewRevisionStamp(
  view: TableRuntimeView<unknown> | undefined
): string {
  const table = view?.neutralTable;
  if (table) return monotonicRevision(table.revisions, undefined).token;
  const rows = view?.rows ?? [];
  const getRowId = view?.getRowId;
  return JSON.stringify({
    ids: rows.map((row) => (getRowId ? getRowId(row) : null)),
    payloads: rows,
    page: view?.query?.page ?? 1,
    search: view?.query?.search ?? "",
  });
}

function liveReadRows(
  runtime: ReturnType<typeof useTableRuntime>,
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
  runtime: ReturnType<typeof useTableRuntime>,
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

function findRow(
  runtime: ReturnType<typeof useTableRuntime>,
  rowKey: string
): unknown {
  const table = runtime.view()?.neutralTable;
  if (table) return table.rowByKey(rowKey);
  const view = runtime.view();
  const rows = view?.rows ?? [];
  const getRowId = view?.getRowId;
  if (!getRowId) return undefined;
  return rows.find((row) => getRowId(row) === rowKey);
}

function columnsForRuntime(
  options: TableAgentOptions,
  runtime: ReturnType<typeof useTableRuntime>
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

function observationFromRuntime(
  options: TableAgentOptions,
  runtime: ReturnType<typeof useTableRuntime>,
  revision: number,
  apply: AgentApply
): AgentObservation {
  const view = runtime.view();
  const table = view?.neutralTable;
  const query = view?.query;
  const ids = runtime.featureIds();
  const pages = serverPagination(view, query);
  if (table) {
    return {
      ...observationFromNeutral(
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
            }
          : undefined
      ),
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
  const columns = columnsForRuntime(options, runtime).map((column) =>
    mergeColumn(column, options.columns)
  );
  const approval = sharedApproval(options.approval);
  // What this runtime offers, and what the host wired, projected into the
  // neutral contract. Which of those two makes a capability available is not
  // this binding's rule to hold — it is the same rule for a local engine and
  // for a server, and `agentObservation` is where it lives.
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
    policy: {
      ...(options.writePolicy ? { writePolicy: options.writePolicy } : {}),
      approval: approval.policy,
      ...(approval.presentation ? { presentation: approval.presentation } : {}),
      ...(options.commit ? { commit: options.commit } : {}),
    },
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
  view: TableRuntimeView<unknown> | undefined,
  query: TableRuntimeView<unknown>["query"]
): AgentPagination {
  const counted =
    (view?.sourceCapabilities ?? PAGE_ONLY_SOURCE).totalCount === "exact";
  const total = query?.total;
  const loaded = view?.rows.length;
  return agentPagination({
    page: query?.page ?? 1,
    pageSize: query?.limit ?? 10,
    ...(counted && total !== undefined ? { totalRows: total } : {}),
    ...(loaded === undefined ? {} : { loadedRows: loaded }),
    // Only a source wired to take a page number can be sent one.
    canJump: query?.setPage !== undefined,
  });
}

function liveEditCells(
  runtime: ReturnType<typeof useTableRuntime>,
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
  runtime: ReturnType<typeof useTableRuntime>,
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
  runtime: ReturnType<typeof useTableRuntime>,
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
  runtime: ReturnType<typeof useTableRuntime>,
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
  runtime: ReturnType<typeof useTableRuntime>,
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
  view: () => TableRuntimeView<unknown> | undefined,
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
  runtime: ReturnType<typeof useTableRuntime>,
  options: TableAgentOptions,
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
 * The live view and filter catalog, in the shape the context builder takes.
 *
 * The same values the observation carries, read straight off the runtime so
 * the caller does not have to rebuild an observation to get at them. What the
 * table cannot answer for is simply absent, and the sanitized view names the
 * gap rather than defaulting it.
 */
function viewInputsFromRuntime(
  runtime: ReturnType<typeof useTableRuntime>,
  options: TableAgentOptions
): AgentContextInputs {
  const view = runtime.view();
  const query = view?.query;
  const filters = agentFiltersFromDefs(
    view?.filterDefs,
    view?.filterRegistry,
    options.columns
  );
  return {
    ...(filters && filters.length > 0 ? { filters } : {}),
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
    },
  };
}

/**
 * A row-by-row refusal, with the reader's stated reason when they gave one.
 *
 * The reason travels with the refusal so the receipt and the model-visible
 * result can say why rather than only that.
 */
function perItemRefusal(
  transaction: ApprovalTransaction,
  stated: string | undefined
): ApprovalResult {
  return {
    ...settleDecisions(transaction.decisions, "rejected"),
    ...(stated ? { reason: stated } : {}),
  };
}

/** One comparable string for an exclusion list, order-insensitive. */
function exclusionKey(keys: readonly string[] | undefined): string {
  return keys ? [...keys].sort((a, b) => a.localeCompare(b)).join("|") : "";
}

/**
 * What a capability does to the table, from the live catalog.
 *
 * Read through the session rather than kept in a list here: the definition is
 * the only thing that knows, and item 11 published it on the catalog entry so
 * every surface reads the same answer.
 */
function capabilityKind(
  session: AgentSession | undefined,
  capability: string | undefined
): AgentCapabilityDefinition["kind"] | undefined {
  if (!session || capability === undefined) return undefined;
  return session.catalog().find((entry) => entry.key === capability)?.kind;
}

/**
 * The opt-in list, with an action's own demand for a human applied.
 *
 * The shared configuration is what the binding can see directly; an action
 * that sets `approval: "required"` is read from the custom definition it was
 * declared on, so a capability that must always be confirmed never offers the
 * control however the table was configured.
 */
function alwaysAllowFor(
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
 * How this binding finds what the person in front of the table may see.
 *
 * The lookups are React's — only this side knows how to find a row in a
 * runtime view. What is done with them is not: the enrichment algorithm lives
 * in `@adapttable/ai`, so every binding reports an unreadable column the same
 * way rather than each inventing its own blank cell.
 */
function readerResolver(
  runtime: ReturnType<typeof useTableRuntime>,
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
    readable: (column) => columns?.[column]?.readable !== false,
    columnLabel: (column) => columns?.[column]?.label,
  };
}

/**
 * The live table's grouping state, as the neutral rules want it.
 *
 * A projection, not a decision: it names where the facts are and which
 * columns the agent may read. What may be offered and what may be set is
 * `@adapttable/ai`'s to answer, so a second binding gets the same answers.
 */
function aggregationInputs(
  view: TableRuntimeView<unknown> | undefined,
  options: TableAgentOptions
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

function createRevisionCounter() {
  let token: string | undefined;
  let revision = 1;
  return {
    bumpFrom(revisions: {
      data: number;
      view: number;
      schema: number;
      policy: number;
    }) {
      const nextToken = revisionToken(revisions);
      if (token === undefined) {
        token = nextToken;
        return revision;
      }
      if (token === nextToken) return revision;
      token = nextToken;
      revision += 1;
      return revision;
    },
    current() {
      return revision;
    },
  };
}

function currentApply(
  options: TableAgentOptions,
  runtime: ReturnType<typeof useTableRuntime>
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

function bindLiveSession(
  optionsRef: { current: TableAgentOptions },
  runtimeRef: { current: ReturnType<typeof useTableRuntime> },
  revisionCounter: ReturnType<typeof createRevisionCounter>,
  waitForChrome: {
    current: (
      subject: ApprovalSubject,
      signal?: AbortSignal
    ) => Promise<ApprovalResult>;
  }
): AgentSession {
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
          const latest = currentApply(
            optionsRef.current,
            runtimeRef.current
          ) as Record<string, unknown>;
          const fn = asCallable(latest[prop]);
          if (!fn) return undefined;
          return fn(...args);
        };
      },
    }
  );
  const observe = () => {
    const options = optionsRef.current;
    if (options.observe) return options.observe();
    const table = runtimeRef.current.view()?.neutralTable;
    const viewRevision = table
      ? revisionCounter.bumpFrom(table.revisions)
      : revisionCounter.current();
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
    // one action always-ask. Answering "approved" on the shared policy alone
    // silently overrode that.
    return waitForChrome.current(subject, signal);
  };
  const inner = createAgentSession({
    observe,
    apply,
    onApprove,
    capabilities: optionsRef.current.capabilities,
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

/** One open approval, whichever shape the write took. */
function TableAgentProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const options = (feature as TableAgentFeature).options;
  const runtime = useTableRuntime();
  const revisionCounterRef = useRef(createRevisionCounter());
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  // The session is built here, before anything reads it. Several callbacks
  // below name it in a dependency array, which React evaluates during render
  // — so a `const` declared after them is read before it exists.
  //
  // `waitForChrome` is a ref whose handler is assigned further down; the
  // session only calls it once a write is actually proposed, so declaring the
  // ref early costs nothing and is what lets the session move up here.
  const waitForChrome = useRef<
    (subject: ApprovalSubject, signal?: AbortSignal) => Promise<ApprovalResult>
  >(() => Promise.resolve(false));
  const tableIdRef = useRef(options.tableId);
  // The registry is resolved when the session is built, so a change to what
  // the agent may use — or to who has to approve it — is a different session,
  // not a different answer from the same one.
  const registryKeyOf = (next: TableAgentOptions): string =>
    `${exclusionKey(next.excludeCapabilities)}!${JSON.stringify(next.capabilityApproval ?? {})}`;
  const registryRef = useRef(registryKeyOf(options));
  const registryKey = registryKeyOf(options);
  const sessionRef = useRef<AgentSession | null>(null);
  if (
    tableIdRef.current !== options.tableId ||
    registryRef.current !== registryKey
  ) {
    tableIdRef.current = options.tableId;
    registryRef.current = registryKey;
    sessionRef.current = null;
    revisionCounterRef.current = createRevisionCounter();
  }
  sessionRef.current ??= bindLiveSession(
    optionsRef,
    runtimeRef,
    revisionCounterRef.current,
    waitForChrome
  );
  const session = sessionRef.current;
  // Bumped when the reader takes an allowance back, so the published list is
  // rebuilt. The memory itself is a ref and cannot notify React on its own.
  const [revocations, setRevocations] = useState(0);
  const [transaction, setTransaction] = useState<ApprovalTransaction | null>(
    null
  );
  const pendingRef = useRef<PendingApproval | null>(null);
  const transactionId = useRef(0);

  // The table as a store: subscribe where there is one to subscribe to, and
  // read the stamp on every render either way. React re-reads the stamp after
  // it attaches, so a table that moved between the render and the
  // subscription is caught rather than missed — which is what the old
  // dependency-free effect was standing in for. The value is not rendered;
  // re-rendering is the point, because that republishes the manifest.
  const neutralTable = runtime.view()?.neutralTable;
  const readStamp = useCallback(
    () =>
      neutralTable
        ? revisionToken(neutralTable.revisions)
        : viewRevisionStamp(runtime.view()),
    [neutralTable, runtime]
  );
  const subscribeToTable = useCallback(
    (onStoreChange: () => void) =>
      neutralTable
        ? neutralTable.subscribe("all", onStoreChange)
        : () => undefined,
    [neutralTable]
  );
  const stamp = useSyncExternalStore(subscribeToTable, readStamp, readStamp);
  useDebugValue(stamp);

  const hostApprove = options.onApprove;
  // What the reader has said not to be asked about again. Scoped to the
  // contract, so it forgets the moment the table is not the one they agreed
  // about.
  const approvalMemory = useRef(createApprovalMemory());
  // The contract the reader agreed about. A label, a permission or a
  // capability changing makes it a different table, and the memory clears.
  const contractVersion = useCallback(
    () => contractFingerprint(session.manifest(), session.catalog()),
    [session]
  );

  const webmcp = options.webmcp;
  // Registration belongs to a contract version: a table whose capabilities or
  // columns moved is a different set of tools, so the old ones go and the new
  // ones are offered. Effects never run on the server, which is also where
  // `document` would be missing.
  const webmcpVersion = webmcp ? contractVersion() : "";
  useEffect(() => {
    if (!webmcp) return;
    const options = webmcp === true ? {} : webmcp;
    const registration = registerWebMcpTools(session, {
      ...(options.exposedTo ? { exposedTo: options.exposedTo } : {}),
      onWarning: (warning) => {
        // A page whose policy forbids this is configured that way on purpose.
        // Saying so once beats throwing into a render.
        console.warn(`[adapttable] webmcp: ${warning.message}`);
      },
    });
    options.onRegister?.(registration.names);
    return () => {
      registration.dispose();
      // Said plainly rather than left standing: the tools are gone, and a
      // surface listing them would otherwise show a set nothing can call.
      options.onRegister?.([]);
    };
  }, [session, webmcp, webmcpVersion]);
  waitForChrome.current = (subject, signal) => {
    if (pendingRef.current) {
      return Promise.reject(new Error("an approval is already pending"));
    }
    // Consulted only here, after the session has already decided a human
    // would be asked. It can never turn `approval: "never"` into a write
    // nobody saw, and it never answers for a write that enumerates rows.
    const capability =
      subject.kind === "operation" ? subject.capability : undefined;
    if (
      mayAlwaysAllow({
        capability,
        kind: capabilityKind(session, capability),
        alwaysAllow: alwaysAllowFor(
          optionsRef.current.approval,
          optionsRef.current.capabilities,
          capability
        ),
      }) &&
      capability !== undefined &&
      approvalMemory.current.allows(capability, contractVersion())
    ) {
      return Promise.resolve(true);
    }
    return new Promise<ApprovalResult>((resolve) => {
      // A write is either rows the reader can decide one at a time, or one
      // operation a backend performs whole — "set every status to Active"
      // names no rows at all. The session says which; nothing here guesses
      // from the runtime shape of a value.
      const rows = subject.kind === "rows";
      let settled = false;
      const entry: PendingApproval = {
        ...(rows ? {} : { capability: subject.capability }),
        // What the reader is shown, resolved from their own table. The
        // model's own `before` values stay in the session and never reach
        // this side.
        proposals: rows
          ? displayProposals(
              subject.proposals,
              readerResolver(runtimeRef.current, optionsRef.current.columns)
            )
          : [],
        perItem: rows && subject.perItem,
        ...(rows
          ? {}
          : {
              operation: {
                capability: subject.capability,
                ...(subject.title ? { title: subject.title } : {}),
                arguments: subject.arguments,
              },
            }),
        // Settled once, whoever gets there first: the reader, an abort, an
        // unmount, or the last row being answered. A second call is a no-op
        // rather than a second answer to one question.
        resolve: (result: ApprovalResult) => {
          if (settled) return;
          settled = true;
          if (pendingRef.current === entry) pendingRef.current = null;
          setTransaction(closeTransaction(entry));
          signal?.removeEventListener("abort", onAbort);
          resolve(result);
        },
      };
      const onAbort = () => entry.resolve(false);
      pendingRef.current = entry;
      // Identity and decisions in one write, so no render ever shows this
      // write's rows beside the last write's answers.
      transactionId.current += 1;
      // Resolved by the session for THIS action, so an override of
      // `ai.approval.presentation` reaches the surface that draws it.
      setTransaction(
        openTransaction(transactionId.current, entry, subject.presentation)
      );
      if (signal?.aborted) {
        entry.resolve(false);
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  };

  useEffect(
    () => () => {
      pendingRef.current?.resolve(false);
    },
    []
  );

  const published: AgentSession = {
    catalog: () => session.catalog(),
    describe: (key) => session.describe(key),
    execute: (key, args, expectedRevision, idempotencyKey, signal) =>
      session.execute(key, args, expectedRevision, idempotencyKey, signal),
    manifest: () => session.manifest(),
  };

  // The live view, as the context builder wants it. Read through a stable
  // callback rather than captured: the store calls it when a turn starts and
  // again when it settles, and a value taken at render time would report that
  // nothing moved between the two — which is exactly what per-turn undo has
  // to be able to tell.
  const viewStateValue = useRef<AgentViewState>({
    read: () => viewInputsFromRuntime(runtimeRef.current, optionsRef.current),
  }).current;

  useEffect(() => {
    options.bridge?.attach?.(session);
    // The reader is stable for the life of this feature, so a host takes it
    // once and calls it whenever it needs the view — rather than being pushed
    // a copy on every change and having to keep it in step.
    options.bridge?.viewInputs?.(
      viewStateValue.read as () => AgentContextInputs
    );
  }, [options.bridge, session, viewStateValue]);

  const last = useRef<string>("");
  useLayoutEffect(() => {
    const published = session.manifest();
    const encoded = JSON.stringify(published);
    if (encoded === last.current) return;
    last.current = encoded;
    options.bridge?.publish?.(published);
  });

  // The chrome path is the only one that parks: with `onApprove` the host
  // answers directly and nothing is ever left open here.
  const chromePending = !hostApprove && transaction !== null;

  // Who is listening, and what they were last told.
  //
  // The subscriber is compared by its own identity rather than the bridge's:
  // a host that rebuilds `bridge={{ ... }}` inline on every render still
  // passes the same `approvals` function, and re-announcing an unchanged
  // state on every render is noise a host cannot filter.
  const approvals = options.bridge?.approvals;
  const approvalsRef = useRef(approvals);
  // The transaction last announced, not merely whether one was. A decision
  // taken inside an open approval changes what a subscriber should be
  // holding, and announcing only open-versus-closed left a panel outside the
  // table rendering the state from before the reader touched it.
  const announcedRef = useRef<ApprovalTransaction | null>(null);
  // What a subscriber would be handed right now. Held in a ref because the
  // published value is built below, and the announcement must not care about
  // declaration order.
  const publishedRef = useRef<AgentApprovalPending | null>(null);

  useEffect(() => {
    const previous = approvalsRef.current;
    if (previous !== approvals) {
      // A genuinely different subscriber. The one being replaced must not be
      // left believing an approval is still open, and the one arriving has
      // never been told anything.
      if (announcedRef.current) previous?.(null);
      approvalsRef.current = approvals;
      announcedRef.current = null;
    }
    const next = chromePending ? transaction : null;
    if (announcedRef.current === next) return;
    announcedRef.current = next;
    approvals?.(next ? publishedRef.current : null);
  }, [approvals, chromePending, transaction]);

  // Going away is a close. Without this the host is left showing "waiting for
  // you" for an approval whose provider no longer exists — and resolving the
  // promise below cannot help, because no effect runs after an unmount to
  // announce it. Strict Mode's setup/cleanup/setup lands here too: the
  // cleanup retracts, and the effect above re-announces on the second setup.
  useEffect(
    () => () => {
      if (!announcedRef.current) return;
      announcedRef.current = null;
      approvalsRef.current?.(null);
    },
    []
  );

  // A pure state update, bound to the transaction it was made for. A control
  // left over from a settled approval finds a different id and does nothing;
  // a position that is not a row of THIS plan changes nothing either.
  const decideAt = (id: number) => (index: number, approved: boolean) => {
    setTransaction((current) => recordDecision(current, id, index, approved));
  };

  // Answering the last row settles the write. This belongs in an effect and
  // not in the updater that produced the decisions: a state updater may be
  // replayed, and replaying one that resolves a promise would answer the
  // session twice.
  useEffect(() => {
    if (!transaction) return;
    // A write that named no rows has no last row to answer. It waits for an
    // explicit whole decision — an empty decision list is not "everything is
    // decided", it is "there was never anything to enumerate".
    if (transaction.pending.proposals.length === 0) return;
    if (transaction.decisions.includes("pending")) return;
    transaction.pending.resolve(
      settleDecisions(transaction.decisions, "rejected")
    );
  }, [transaction]);

  // Rebuilt every render on purpose: the published value is what subscribers
  // compare, and memoizing it hides a decision that changed inside it.
  const approvalValue =
    hostApprove || !transaction
      ? null
      : {
          proposals: transaction.pending.proposals,
          ...(transaction.pending.operation
            ? { operation: transaction.pending.operation }
            : {}),
          decisions: transaction.decisions,
          presentation: transaction.presentation,
          // "Approve remaining" is what these mean once rows have been
          // decided: a row already refused stays refused, or the control
          // undoes the reader's own work.
          //
          // A write that cannot be split is answered whole — a row move, a
          // custom operation, or one that enumerates no rows at all. Sending
          // positions for one of those reaches the session as a decision it
          // is right to refuse, and an empty list reads as "approved none".
          ...(mayAlwaysAllow({
            capability: transaction.pending.capability,
            kind: capabilityKind(session, transaction.pending.capability),
            alwaysAllow: alwaysAllowFor(
              optionsRef.current.approval,
              optionsRef.current.capabilities,
              transaction.pending.capability
            ),
          })
            ? {
                alwaysAllow: () => {
                  const capability = transaction.pending.capability;
                  if (capability === undefined) return;
                  approvalMemory.current.remember(
                    capability,
                    contractVersion()
                  );
                  transaction.pending.resolve(true);
                },
              }
            : {}),
          approve: () =>
            transaction.pending.resolve(
              transaction.pending.perItem
                ? settleDecisions(transaction.decisions, "approved")
                : true
            ),
          reject: (reason?: string) => {
            // A kit's button is wired `onClick={onReject}`, and the slot
            // contract says the handler takes nothing — so what actually
            // arrives is a click event. The declared type is a claim, not a
            // fact: anything that is not a stated reason is no reason at all.
            const stated =
              typeof reason === "string" ? reason.trim() : undefined;
            if (transaction.pending.perItem) {
              transaction.pending.resolve(perItemRefusal(transaction, stated));
              return;
            }
            // A write answered whole is a plain refusal unless the reader
            // said something, in which case an empty approval list carries
            // the words.
            transaction.pending.resolve(
              stated ? { approved: [], reason: stated } : false
            );
          },
          ...(transaction.pending.perItem
            ? { decideAt: decideAt(transaction.id) }
            : {}),
        };

  publishedRef.current = approvalValue;

  // What the reader has waved through, published whether or not an approval is
  // open — a reader goes looking for the list precisely when nothing is
  // waiting. `remembered` is read during render, and `revocations` is what
  // makes a revoke reach this render rather than the next approval.
  // Checked once per contract, where the configuration first meets a live
  // catalog. A key this table does not offer is a control the developer
  // believes they shipped and the reader never sees, so it is an error rather
  // than a silence — the same treatment `include` gets in the context builder.
  useEffect(() => {
    assertAlwaysAllow(
      sharedApproval(optionsRef.current.approval).alwaysAllow,
      session.catalog().map((entry) => entry.key)
    );
  }, [session, stamp]);

  const alwaysAllowValue = useMemo<AgentAlwaysAllowState>(
    () => ({
      capabilities: approvalMemory.current.remembered(contractVersion()),
      revoke: (capability: string) => {
        approvalMemory.current.revoke(capability);
        setRevocations((count) => count + 1);
      },
    }),
    // A revoke, or the table moving — the memory is a ref, so neither tells
    // React on its own, and a contract change is what clears the memory.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revocations, stamp, contractVersion]
  );

  return (
    <FeatureStateScope stateKey={TABLE_AGENT_STATE} value={published}>
      <FeatureStateScope stateKey={AGENT_APPROVAL_STATE} value={approvalValue}>
        <FeatureStateScope
          stateKey={AGENT_ALWAYS_ALLOW_STATE}
          value={alwaysAllowValue}
        >
          <FeatureStateScope stateKey={AGENT_VIEW_STATE} value={viewStateValue}>
            {children}
          </FeatureStateScope>
        </FeatureStateScope>
      </FeatureStateScope>
    </FeatureStateScope>
  );
}

/**
 * Observe a live table and publish a deterministic capability manifest.
 *
 * Omitting this feature from `features` ships no agent bytes.
 *
 * @public
 */
export function tableAgent(options: TableAgentOptions): StaticTableFeature {
  const feature: TableAgentFeature = {
    id: "table-agent",
    options,
    provider: { Provider: TableAgentProvider },
  };
  return feature;
}
