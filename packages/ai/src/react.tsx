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
} from "@adapttable/core/adapter";
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
import { WRITE_KEYS } from "./keys";
import { createAgentSession } from "./session";
import type {
  AgentApply,
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

function liveRows<TRow>(
  view: TableRuntimeView<TRow> | undefined
): readonly TRow[] {
  return view?.rows ?? [];
}

function liveReadRows(
  view: TableRuntimeView<unknown> | undefined,
  columns: readonly AgentColumn[],
  query: RowReadQuery
): RowWindow {
  const rows = liveRows(view);
  const getRowId = view?.getRowId ?? (() => "");
  const hidden = columns.filter((column) => !column.readable).map((c) => c.id);
  const sliced = rows.slice(query.offset, query.offset + query.limit);
  return {
    rows: sliced.map((row) => ({
      rowKey: getRowId(row),
      cells: cellRecord(row, columns, query.columns),
    })),
    offset: query.offset,
    limit: query.limit,
    redacted: hidden,
  };
}

function liveResolveRow(
  view: TableRuntimeView<unknown> | undefined,
  ref: RowRef,
  scope: RowAddressScope
): ResolvedRow {
  const rows = liveRows(view);
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
  view: TableRuntimeView<unknown> | undefined,
  rowKey: string
): unknown {
  const rows = liveRows(view);
  const getRowId = view?.getRowId;
  if (!getRowId) return undefined;
  return rows.find((row) => getRowId(row) === rowKey);
}

function observationFromRuntime(
  options: TableAgentOptions,
  runtime: ReturnType<typeof useTableRuntime>,
  revision: number,
  apply: AgentApply
): AgentObservation {
  const view = runtime.view();
  const query = view?.query;
  const ids = runtime.featureIds();
  const columns = (
    options.columns
      ? Object.entries(options.columns).map(([id, extra]) =>
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
        )
      : []
  ).map((column) => mergeColumn(column, options.columns));
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
    pageMax: 10_000,
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
    const row = findRow(view, edit.rowKey);
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
    const row = findRow(view, edit.rowKey);
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
  extra: AgentApply | undefined,
  view: () => ReturnType<ReturnType<typeof useTableRuntime>["view"]>,
  columns: readonly AgentColumn[]
): NonNullable<AgentApply["readRows"]> {
  return (query) => {
    if (extra?.readRows) return extra.readRows(query);
    return liveReadRows(view(), columns, query);
  };
}

function pickResolveRow(
  extra: AgentApply | undefined,
  view: () => ReturnType<ReturnType<typeof useTableRuntime>["view"]>
): NonNullable<AgentApply["resolveRow"]> {
  return (ref) => {
    if (extra?.resolveRow) return extra.resolveRow(ref);
    return liveResolveRow(view(), ref, rowScope(ref));
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
  columns: readonly AgentColumn[],
  extra?: AgentApply
): AgentApply {
  const view = () => runtime.view();
  const apply: AgentApply = {
    readRows: pickReadRows(extra, view, columns),
    resolveRow: pickResolveRow(extra, view),
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

function stableRow(row: unknown): unknown {
  try {
    return structuredClone(row);
  } catch {
    return String(row);
  }
}

function viewFingerprint(
  view: TableRuntimeView<unknown> | undefined,
  options: TableAgentOptions,
  featureIds: readonly string[]
): string {
  const query = view?.query;
  const rows = liveRows(view);
  const getRowId = view?.getRowId;
  const rowPayloads = rows.map((row) => ({
    id: getRowId ? getRowId(row) : null,
    row: stableRow(row),
  }));
  const selected = view?.selection
    ? [...view.selection.selectedIds].sort((left, right) =>
        left.localeCompare(right)
      )
    : [];
  const extras = liveQueryFilters(query);
  return JSON.stringify({
    page: query?.page ?? 1,
    limit: query?.limit ?? 10,
    search: query?.search ?? "",
    sortBy: query?.sortBy ?? null,
    sortDir: query?.sortDir ?? null,
    groupBy: view?.groupingState?.groupBy ?? null,
    extra: extras.extra ?? null,
    rowPayloads,
    selected,
    tableId: options.tableId,
    writePolicy: options.writePolicy ?? "allow",
    approval: options.approval ?? "writes",
    commit: options.commit ?? "stage",
    columns: options.columns ?? null,
    readMax: options.readMax ?? 50,
    featureIds: [...featureIds].sort((left, right) =>
      left.localeCompare(right)
    ),
    wired: {
      setPage: present(options.apply, "setPage") || present(query, "setPage"),
      setSearch:
        present(options.apply, "setSearch") || present(query, "setSearch"),
      setSort: present(options.apply, "setSort") || present(query, "setSort"),
      setFilters:
        present(options.apply, "setFilters") || present(extras, "setExtras"),
      runExport: present(options.apply, "runExport"),
      editCells:
        present(options.apply, "editCells") ||
        present(options.apply, "stageCells"),
      addRows: present(options.apply, "addRows"),
      deleteRows: present(options.apply, "deleteRows"),
      reorderRows: present(options.apply, "reorderRows"),
      setSelection:
        present(options.apply, "setSelection") || view?.selection != null,
      applyView: present(options.apply, "applyView"),
    },
  });
}

function present(record: object | undefined, key: string): boolean {
  return record != null && Object.hasOwn(record, key);
}

function asCallable(
  value: unknown
): ((...input: unknown[]) => unknown) | undefined {
  if (typeof value !== "function") return undefined;
  return value as (...input: unknown[]) => unknown;
}

function currentApply(
  options: TableAgentOptions,
  runtime: ReturnType<typeof useTableRuntime>
): AgentApply {
  const fromRuntime = applyFromRuntime(
    runtime,
    options.columns
      ? Object.entries(options.columns).map(([id, extra]) => ({
          id,
          label: extra.label ?? id,
          type: extra.type ?? "unknown",
          readable: extra.readable ?? true,
          writable: extra.writable ?? false,
          sortable: extra.sortable ?? false,
        }))
      : [],
    options.apply
  );
  const apply: AgentApply = { ...fromRuntime, ...options.apply };
  apply.setFilters = (filters) => {
    options.apply?.setFilters?.(filters);
    const applied = applyLiveFilters(runtime.view()?.query, filters);
    if (!options.apply?.setFilters && !applied) {
      throw new Error("setFilters is not wired");
    }
  };
  return apply;
}

function bindLiveSession(
  optionsRef: { current: TableAgentOptions },
  runtimeRef: { current: ReturnType<typeof useTableRuntime> },
  revisionRef: { current: number },
  waitForChrome: {
    current: (proposal: unknown, signal?: AbortSignal) => Promise<boolean>;
  },
  bump: { current: () => void }
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
    return observationFromRuntime(
      options,
      runtimeRef.current,
      revisionRef.current,
      apply
    );
  };
  const onApprove = (proposal: unknown, signal?: AbortSignal) => {
    const options = optionsRef.current;
    if (options.onApprove) return options.onApprove(proposal, signal);
    if (options.approval === "never") return Promise.resolve(true);
    return waitForChrome.current(proposal, signal);
  };
  const inner = createAgentSession({ observe, apply, onApprove });
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
      if (result.ok && isMutatingKey(key)) bump.current();
      return result;
    },
    manifest: () => inner.manifest(),
  };
}

function isMutatingKey(key: string): boolean {
  return (
    key.startsWith("view.set") ||
    key === "views.apply" ||
    (WRITE_KEYS as readonly string[]).includes(key)
  );
}

function TableAgentProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const options = (feature as TableAgentFeature).options;
  const runtime = useTableRuntime();
  const [revision, setRevision] = useState(1);
  const revisionRef = useRef(revision);
  revisionRef.current = revision;
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

  const stampRef = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    const live = viewFingerprint(runtime.view(), options, runtime.featureIds());
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
  const sessionRef = useRef<AgentSession | null>(null);
  sessionRef.current ??= bindLiveSession(
    optionsRef,
    runtimeRef,
    revisionRef,
    waitForChrome,
    bump
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
