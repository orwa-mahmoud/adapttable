/**
 * Opt-in table feature — `@adapttable/ai/react`.
 *
 * The root `@adapttable/ai` entry stays React-free. This subpath mounts a
 * provider that observes the live table and publishes a versioned manifest.
 */
import {
  AGENT_APPROVAL_STATE,
  type FeatureProviderProps,
  featureStateKey,
  FeatureStateScope,
  type TableFeature,
  type TableRuntimeView,
  useTableRuntime,
} from "@adapttable/react/adapter";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
import {
  agentColumnsFromNeutral,
  monotonicRevision,
  observationFromNeutral,
  readRowsFromNeutral,
  resolveRowFromNeutral,
  revisionToken,
} from "./liveTable";
import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentColumn,
  AgentObservation,
  AgentSession,
  ResolvedRow,
  RowReadQuery,
  RowRef,
  RowWindow,
  TableAgentBridge,
  WriteProposal,
} from "./types";

export {
  type ApprovalPolicy,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export type * from "./types";

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
 * Per-column overrides the React feature merges onto live columns.
 *
 * @public
 */
export interface TableAgentColumnPatch {
  /** Whether `rows.read` may return this column. */
  readonly readable?: boolean;
  /** Whether `edit.cells` may write this column. */
  readonly writable?: boolean;
  /** Declared value type. */
  readonly type?: string;
  /** Whether the column accepts sort. */
  readonly sortable?: boolean;
  /** Display label. */
  readonly label?: string;
}

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
  readonly approval?: ApprovalPolicy;
  /** Whether an approved write stages or persists. */
  readonly commit?: CommitPolicy;
  /** Host confirmation. When set, chrome is skipped. */
  readonly onApprove?: (
    proposal: unknown,
    signal?: AbortSignal
  ) => Promise<boolean>;
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
}

interface TableAgentFeature extends TableFeature {
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
  if (table) {
    return observationFromNeutral(
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
          }
        : undefined
    );
  }
  const columns = columnsForRuntime(options, runtime).map((column) =>
    mergeColumn(column, options.columns)
  );
  return {
    tableId: options.tableId,
    viewRevision: revision,
    featureIds: ids,
    columns,
    source: view?.sourceCapabilities ?? PAGE_ONLY_SOURCE,
    writePolicy: options.writePolicy ?? "allow",
    approval: options.approval ?? "writes",
    commit: options.commit ?? "stage",
    hasPagination:
      options.apply?.setPage !== undefined || Boolean(query?.setPage),
    hasSearch:
      options.apply?.setSearch !== undefined || Boolean(query?.setSearch),
    hasSort: options.apply?.setSort !== undefined || Boolean(query?.setSort),
    hasFilters:
      options.apply?.setFilters !== undefined ||
      Boolean(liveQueryFilters(query).setExtras),
    hasExport: options.apply?.runExport !== undefined,
    hasEdit:
      options.apply?.editCells !== undefined ||
      options.apply?.stageCells !== undefined ||
      Boolean(view?.editing?.onCellEdit) ||
      Boolean(view?.editing?.stageCell),
    hasReorder: options.apply?.reorderRows !== undefined,
    hasSelection:
      options.apply?.setSelection !== undefined || Boolean(view?.selection),
    hasSavedViews: ids.includes("saved-views") && apply.applyView !== undefined,
    hasAdd: options.apply?.addRows !== undefined,
    hasDelete: options.apply?.deleteRows !== undefined,
    page: query?.page ?? 1,
    limit: query?.limit ?? 10,
    search: query?.search ?? "",
    sortBy: query?.sortBy,
    sortDir: query?.sortDir,
    pageMax: view?.rows?.length ?? 10,
    readMax: options.readMax ?? 50,
    rowAddressScope: "visible",
  };
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

function applyFromRuntime(
  runtime: ReturnType<typeof useTableRuntime>,
  options: TableAgentOptions,
  extra?: AgentApply
): AgentApply {
  const columns = columnsForRuntime(options, runtime);
  const readMax = options.readMax ?? 50;
  const view = () => runtime.view();
  const apply: AgentApply = {
    readRows: pickReadRows(runtime, extra, columns, readMax),
    resolveRow: pickResolveRow(runtime, extra),
    setPage: (page) => {
      if (extra?.setPage) extra.setPage(page);
      else requireQuery(view, "setPage")(page);
    },
    setLimit: (limit) => {
      if (extra?.setLimit) extra.setLimit(limit);
      else requireQuery(view, "setLimit")(limit);
    },
    setSearch: (search) => {
      if (extra?.setSearch) extra.setSearch(search);
      else requireQuery(view, "setSearch")(search);
    },
    setSort: (key, dir) => {
      if (extra?.setSort) extra.setSort(key, dir);
      else requireQuery(view, "setSort")(key, dir);
    },
    setGroupBy: (key) => {
      if (extra?.setGroupBy) {
        extra.setGroupBy(key);
        return;
      }
      const grouping = view()?.groupingState;
      if (!grouping) throw new Error("setGroupBy is not wired");
      grouping.setGroupBy(key);
    },
    setFilters: (filters) => {
      if (!applyLiveFilters(view()?.query, filters)) {
        throw new Error("setFilters is not wired");
      }
    },
    editCells: (edits) => liveEditCells(runtime, extra, edits),
    stageCells: (edits) => liveStageCells(runtime, extra, edits),
  };
  if (extra?.applyView) {
    apply.applyView = (viewId) => extra.applyView?.(viewId);
  }
  if (extra?.runExport) {
    apply.runExport = (format) => extra.runExport?.(format);
  }
  if (extra?.addRows) apply.addRows = (rows) => extra.addRows?.(rows);
  if (extra?.deleteRows) apply.deleteRows = (keys) => extra.deleteRows?.(keys);
  if (extra?.reorderRows) {
    apply.reorderRows = (fromKey, toKey) => extra.reorderRows?.(fromKey, toKey);
  }
  apply.setSelection = (ids) => liveSetSelection(runtime, extra, ids);
  return apply;
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
    current: (proposal: unknown, signal?: AbortSignal) => Promise<boolean>;
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
  const onApprove = (proposal: unknown, signal?: AbortSignal) => {
    const options = optionsRef.current;
    if (options.onApprove) return options.onApprove(proposal, signal);
    if (options.approval === "never") return Promise.resolve(true);
    return waitForChrome.current(proposal, signal);
  };
  const inner = createAgentSession({
    observe,
    apply,
    onApprove,
    capabilities: optionsRef.current.capabilities,
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

function TableAgentProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const options = (feature as TableAgentFeature).options;
  const runtime = useTableRuntime();
  const revisionCounterRef = useRef(createRevisionCounter());
  const [revision, setRevision] = useState(1);
  const [pending, setPending] = useState<{
    proposals: readonly WriteProposal[];
    resolve: (ok: boolean) => void;
  } | null>(null);
  const pendingRef = useRef<{
    proposals: readonly WriteProposal[];
    resolve: (ok: boolean) => void;
  } | null>(null);
  const bump = useRef(() => setRevision((n) => n + 1));
  bump.current = () => setRevision((n) => n + 1);

  const neutralTable = runtime.view()?.neutralTable;
  useLayoutEffect(() => {
    if (!neutralTable) return;
    const next = revisionCounterRef.current.bumpFrom(neutralTable.revisions);
    if (next !== revision) setRevision(next);
  });

  useEffect(() => {
    if (!neutralTable) return;
    return neutralTable.subscribe("all", () => {
      const next = revisionCounterRef.current.bumpFrom(neutralTable.revisions);
      setRevision(next);
    });
  }, [neutralTable]);

  const stampRef = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    if (neutralTable) return;
    const live = viewRevisionStamp(runtime.view());
    if (stampRef.current === undefined) {
      stampRef.current = live;
      return;
    }
    if (stampRef.current === live) return;
    stampRef.current = live;
    bump.current();
  });

  const hostApprove = options.onApprove;
  const waitForChrome = useRef<
    (proposal: unknown, signal?: AbortSignal) => Promise<boolean>
  >(() => Promise.resolve(false));
  waitForChrome.current = (proposal, signal) => {
    if (pendingRef.current) {
      return Promise.reject(new Error("an approval is already pending"));
    }
    return new Promise<boolean>((resolve) => {
      const list = Array.isArray(proposal) ? (proposal as WriteProposal[]) : [];
      const entry: {
        proposals: readonly WriteProposal[];
        resolve: (ok: boolean) => void;
      } = {
        proposals: list,
        resolve: (ok: boolean) => {
          if (pendingRef.current !== entry) return;
          pendingRef.current = null;
          setPending(null);
          signal?.removeEventListener("abort", onAbort);
          resolve(ok);
        },
      };
      const onAbort = () => entry.resolve(false);
      pendingRef.current = entry;
      setPending(entry);
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

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;
  const tableIdRef = useRef(options.tableId);
  const sessionRef = useRef<AgentSession | null>(null);
  if (tableIdRef.current !== options.tableId) {
    tableIdRef.current = options.tableId;
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
  const published: AgentSession = {
    catalog: () => session.catalog(),
    describe: (key) => session.describe(key),
    execute: (key, args, expectedRevision, idempotencyKey, signal) =>
      session.execute(key, args, expectedRevision, idempotencyKey, signal),
    manifest: () => session.manifest(),
  };

  useEffect(() => {
    options.bridge?.attach?.(session);
  }, [options.bridge, session]);

  const last = useRef<string>("");
  useLayoutEffect(() => {
    const published = session.manifest();
    const encoded = JSON.stringify(published);
    if (encoded === last.current) return;
    last.current = encoded;
    options.bridge?.publish?.(published);
  });

  const approvalValue =
    hostApprove || !pending
      ? null
      : {
          proposals: pending.proposals,
          approve: () => pending.resolve(true),
          reject: () => pending.resolve(false),
        };

  return (
    <FeatureStateScope stateKey={TABLE_AGENT_STATE} value={published}>
      <FeatureStateScope stateKey={AGENT_APPROVAL_STATE} value={approvalValue}>
        {children}
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
export function tableAgent(options: TableAgentOptions): TableFeature {
  const feature: TableAgentFeature = {
    id: "table-agent",
    options,
    provider: { Provider: TableAgentProvider },
  };
  return feature;
}
