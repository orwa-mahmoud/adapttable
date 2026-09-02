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
  useMemo,
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

const PAGE_ONLY_SOURCE = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

export const TABLE_AGENT_STATE = featureStateKey<AgentSession>("table-agent");

export interface TableAgentOptions {
  readonly tableId: string;
  readonly writePolicy?: WritePolicy;
  readonly approval?: ApprovalPolicy;
  readonly commit?: CommitPolicy;
  readonly onApprove?: (proposal: unknown) => Promise<boolean>;
  readonly columns?: Readonly<
    Record<
      string,
      Partial<
        Pick<
          AgentColumn,
          "readable" | "writable" | "type" | "sortable" | "label"
        >
      >
    >
  >;
  readonly readMax?: number;
  readonly bridge?: TableAgentBridge;
  /** Host- or test-supplied observation. Live tables omit this. */
  readonly observe?: () => AgentObservation;
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
    hasPagination: Boolean(query?.setPage),
    hasSearch: Boolean(query?.setSearch),
    hasSort: Boolean(query?.setSort),
    hasFilters: ids.includes("filters"),
    hasExport: ids.includes("export-csv"),
    hasEdit: ids.includes("editing"),
    hasReorder: ids.includes("row-reorder"),
    hasSelection: apply.setSelection !== undefined,
    hasSavedViews: ids.includes("saved-views") && apply.applyView !== undefined,
    hasAdd: apply.addRows !== undefined,
    hasDelete: apply.deleteRows !== undefined,
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
  if (!onCellEdit) return;
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
  if (!stage) return;
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

function applyFromRuntime(
  runtime: ReturnType<typeof useTableRuntime>,
  columns: readonly AgentColumn[],
  extra?: AgentApply
): AgentApply {
  const view = () => runtime.view();
  const apply: AgentApply = {
    setPage: (page) => view()?.query?.setPage(page),
    setLimit: (limit) => view()?.query?.setLimit(limit),
    setSearch: (search) => view()?.query?.setSearch(search),
    setSort: (key, dir) => view()?.query?.setSort(key, dir),
    setGroupBy: (key) => view()?.groupingState?.setGroupBy(key),
    setFilters: (filters) => extra?.setFilters?.(filters),
    applyView: (viewId) => extra?.applyView?.(viewId),
    runExport: (format) => extra?.runExport?.(format),
    readRows: pickReadRows(extra, view, columns),
    resolveRow: pickResolveRow(extra, view),
    editCells: (edits) => liveEditCells(runtime, extra, edits),
    stageCells: (edits) => liveStageCells(runtime, extra, edits),
    addRows: (rows) => extra?.addRows?.(rows),
    deleteRows: (keys) => extra?.deleteRows?.(keys),
    reorderRows: (fromKey, toKey) => extra?.reorderRows?.(fromKey, toKey),
  };
  if (extra?.setSelection ?? view()?.selection) {
    apply.setSelection = (ids) => liveSetSelection(runtime, extra, ids);
  }
  return apply;
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
  const [pending, setPending] = useState<{
    proposals: readonly WriteProposal[];
    resolve: (ok: boolean) => void;
  } | null>(null);
  const bump = useRef(() => setRevision((n) => n + 1));
  bump.current = () => setRevision((n) => n + 1);

  const hostApprove = options.onApprove;
  const waitForChrome = useRef<(proposal: unknown) => Promise<boolean>>(() =>
    Promise.resolve(false)
  );
  waitForChrome.current = (proposal) =>
    new Promise<boolean>((resolve) => {
      const list = Array.isArray(proposal) ? (proposal as WriteProposal[]) : [];
      setPending({
        proposals: list,
        resolve: (ok) => {
          setPending(null);
          resolve(ok);
        },
      });
    });

  const session = useMemo(() => {
    const apply = {
      ...applyFromRuntime(
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
      ),
      ...options.apply,
    };
    const observe =
      options.observe ??
      (() => observationFromRuntime(options, runtime, revision, apply));
    const onApprove =
      hostApprove ??
      (options.approval === "never"
        ? undefined
        : (proposal: unknown) => waitForChrome.current(proposal));
    const inner = createAgentSession({ observe, apply, onApprove });
    return {
      catalog: () => inner.catalog(),
      describe: (key: string) => inner.describe(key),
      execute: async (
        key: string,
        args: unknown,
        expectedRevision: number,
        idempotencyKey: string
      ) => {
        const result = await inner.execute(
          key,
          args,
          expectedRevision,
          idempotencyKey
        );
        if (result.ok && isMutatingKey(key)) bump.current();
        return result;
      },
      manifest: () => inner.manifest(),
    };
  }, [options, runtime, revision, hostApprove]);

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
    <FeatureStateScope stateKey={TABLE_AGENT_STATE} value={session}>
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
