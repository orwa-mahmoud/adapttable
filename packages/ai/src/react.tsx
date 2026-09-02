/**
 * Opt-in table feature — `@adapttable/ai/react`.
 *
 * The root `@adapttable/ai` entry stays React-free. This subpath mounts a
 * provider that observes the live table and publishes a versioned manifest.
 */
import {
  type FeatureProviderProps,
  featureStateKey,
  FeatureStateScope,
  type TableFeature,
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

import type { WritePolicy } from "./keys";
import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentColumn,
  AgentObservation,
  AgentSession,
  TableAgentBridge,
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

function observationFromRuntime(
  options: TableAgentOptions,
  runtime: ReturnType<typeof useTableRuntime>,
  revision: number
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
    source: PAGE_ONLY_SOURCE,
    writePolicy: options.writePolicy ?? "allow",
    hasPagination: Boolean(query?.setPage),
    hasSearch: Boolean(query?.setSearch),
    hasSort: Boolean(query?.setSort),
    hasFilters: ids.includes("filters"),
    hasExport: ids.includes("export-csv"),
    hasEdit: ids.includes("editing"),
    hasReorder: ids.includes("row-reorder"),
    page: query?.page ?? 1,
    limit: query?.limit ?? 10,
    search: query?.search ?? "",
    sortBy: query?.sortBy,
    sortDir: query?.sortDir,
    pageMax: 10_000,
    rowAddressScope: "visible",
  };
}

function applyFromRuntime(
  runtime: ReturnType<typeof useTableRuntime>,
  extra?: AgentApply
): AgentApply {
  return {
    setPage: (page) => runtime.view()?.query?.setPage(page),
    setLimit: (limit) => runtime.view()?.query?.setLimit(limit),
    setSearch: (search) => runtime.view()?.query?.setSearch(search),
    setSort: (key, dir) => runtime.view()?.query?.setSort(key, dir),
    setGroupBy: (key) => runtime.view()?.groupingState?.setGroupBy(key),
    setFilters: (filters) => extra?.setFilters?.(filters),
    runExport: (format) => extra?.runExport?.(format),
    editCells: (edits) => extra?.editCells?.(edits),
    reorderRows: (fromKey, toKey) => extra?.reorderRows?.(fromKey, toKey),
  };
}

function TableAgentProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const options = (feature as TableAgentFeature).options;
  const runtime = useTableRuntime();
  const [revision, setRevision] = useState(1);
  const bump = useRef(() => setRevision((n) => n + 1));
  bump.current = () => setRevision((n) => n + 1);

  const session = useMemo(() => {
    const observe =
      options.observe ??
      (() => observationFromRuntime(options, runtime, revision));
    const apply = options.apply ?? applyFromRuntime(runtime, options.apply);
    const inner = createAgentSession({ observe, apply });
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
        if (result.ok && key.startsWith("view.set")) bump.current();
        return result;
      },
      manifest: () => inner.manifest(),
    };
  }, [options, runtime, revision]);

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

  return (
    <FeatureStateScope stateKey={TABLE_AGENT_STATE} value={session}>
      {children}
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
