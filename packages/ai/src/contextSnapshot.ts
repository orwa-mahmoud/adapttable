/**
 * The permitted contract, projected and sanitized from the live session.
 *
 * Nothing is re-derived here. The schemas are `guides.ts`'s, the wiring answer
 * is the registry's, the filter data is `filterCatalog.ts`'s and the
 * aggregation choices are `aggregationCommands.ts`'s. What this file owns is
 * the projection: read them through the session, which has already applied the
 * permission predicate, and shape what survives into something serializable.
 *
 * Two things are kept apart on purpose. The **contract** is what the table can
 * do and what its columns are — it changes when the table changes, which is
 * rarely, and it is the part worth pinning on a backend. The **view** is where
 * the table is right now, which changes constantly and is sent every turn.
 * Folding them together is how a backend ends up holding a contract that is
 * stale for one reason and current for another.
 *
 * Absence is never silence: a value the table could not resolve is reported as
 * unavailable rather than omitted, because a model cannot tell an empty list
 * from a question nobody asked.
 */
import type { AgentPagination } from "./pagination";
import type {
  AgentAggregations,
  AgentColumn,
  AgentFilter,
  AgentManifest,
  AgentSession,
  CapabilityGuide,
  CatalogEntry,
  JsonSchema,
} from "./types";

/** One capability as the contract describes it. @public */
export interface ContextCapability {
  readonly key: string;
  /** One line, from the capability's own summary. */
  readonly summary: string;
  /** The same, within a hard description cap. */
  readonly summaryShort?: string;
  /** What this capability does, when its guide was selected. */
  readonly guide?: string;
  /** Arguments it takes, when its guide was selected. */
  readonly input?: JsonSchema;
  /**
   * What it returns.
   *
   * Absent by default. Input guidance is what lets a model call something
   * correctly; an output schema is bulk it can read from the result it gets.
   */
  readonly output?: JsonSchema;
}

/** One column, with visibility and permission told apart. @public */
export interface ContextColumn {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  /** Whether the agent may read values from it. */
  readonly readable: boolean;
  /** Whether the agent may write it. */
  readonly writable: boolean;
  readonly sortable: boolean;
  readonly pinnable?: boolean;
  readonly hideable?: boolean;
  /** Whether it is currently on screen. Not a permission. */
  readonly visible?: boolean;
  /** What the author said it means. */
  readonly description?: string;
  /** Representative values the author supplied, or sampled where allowed. */
  readonly examples?: readonly unknown[];
  /**
   * Whether those examples came out of the table rather than from the author.
   *
   * Absent means authored. The distinction matters to whoever reads the
   * contract: an authored example is a statement about what the column means,
   * a sampled one is a handful of somebody's data.
   */
  readonly sampled?: true;
}

/** The table's permitted shape. Changes rarely; worth pinning. @public */
export interface AgentContextContract {
  readonly tableId: string;
  /** Everything in this contract, named unambiguously. */
  readonly version: string;
  readonly capabilities: readonly ContextCapability[];
  readonly columns: readonly ContextColumn[];
  readonly filters: readonly AgentFilter[];
  readonly aggregations?: AgentAggregations;
  readonly rowAddressing: AgentManifest["rowAddressing"];
  readonly limits: AgentManifest["limits"];
  readonly policy: AgentManifest["policy"];
  readonly source: AgentManifest["source"];
}

/** Where the table is right now. Changes constantly; sent every turn. @public */
export interface AgentContextView {
  readonly revision: number;
  readonly page: number;
  readonly limit: number;
  readonly search: string;
  readonly sortBy?: string;
  readonly sortDir?: "asc" | "desc";
  readonly groupBy?: string;
  /** Filter state, with excluded keys already removed. */
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly pinnedColumns?: Readonly<Record<string, unknown>>;
  readonly pinnedRows?: Readonly<Record<string, unknown>>;
  readonly hiddenColumns?: readonly string[];
  readonly columnOrder?: readonly string[];
  /**
   * What this table's pages are for the current query.
   *
   * Published so a model never has to infer a page count from a row count or
   * from what it can see. An absent `totalPages` or `hasNext` means the source
   * cannot say, which is a fact worth carrying: it is the difference between
   * "there is no next page" and "nobody knows whether there is".
   */
  readonly pagination?: AgentPagination;
  /**
   * Fields the table could not answer for.
   *
   * A model told a page is `1` when nobody published one would act on a fact
   * nobody asserted. Naming the gap is the honest alternative to a default.
   */
  readonly unknown?: readonly string[];
}

/** Live values sampled for one column, when the author opted in. @public */
export const SAMPLE_CAP = 5;

/** How many static filter options the contract will carry per filter. */
const OPTION_CAP = 24;

/**
 * Author-supplied examples that actually match the column's declared type.
 *
 * A wrong example is worse than none: a model shown `"2024-01-01"` for a
 * numeric column will send a string and be refused by the schema it was never
 * shown.
 */
function validExamples(column: AgentColumn): readonly unknown[] | undefined {
  const examples = column.ai?.examples;
  if (!examples?.length) return undefined;
  const matches = examples.filter((value) => matchesType(value, column.type));
  return matches.length > 0 ? matches.slice(0, SAMPLE_CAP) : undefined;
}

/**
 * Whether a value is the type the column declared.
 *
 * Shared with the sampling route, which revalidates for the same reason the
 * author's examples are validated: a wrong example is worse than none.
 *
 * @public
 */
export function matchesType(value: unknown, type: string): boolean {
  if (type === "number") return typeof value === "number";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "string") return typeof value === "string";
  if (type === "date") {
    return value instanceof Date || typeof value === "string";
  }
  // An unknown or custom type cannot be checked, so nothing is rejected on a
  // guess — the author is the one who knows.
  return true;
}

/**
 * Project one column, with permission and visibility kept apart.
 *
 * Sampled values win over authored ones when the host ran the sampling route
 * for this column: the author asked for live values by setting `sample`, and
 * showing both would be two answers to "what does a value look like".
 */
function contextColumn(
  column: AgentColumn,
  sampled?: readonly unknown[]
): ContextColumn {
  const live = column.readable && sampled?.length ? sampled : undefined;
  const examples =
    live ?? (column.readable ? validExamples(column) : undefined);
  return {
    id: column.id,
    label: column.label,
    type: column.type,
    readable: column.readable,
    writable: column.writable,
    sortable: column.sortable,
    ...(column.pinnable === undefined ? {} : { pinnable: column.pinnable }),
    ...(column.hideable === undefined ? {} : { hideable: column.hideable }),
    ...(column.visible === undefined ? {} : { visible: column.visible }),
    ...(column.ai?.description ? { description: column.ai.description } : {}),
    ...(examples ? { examples } : {}),
    ...(live ? { sampled: true as const } : {}),
  };
}

/**
 * Bound a filter's static options without losing the fact that it has more.
 *
 * A truncated list presented as complete is the worst of both: the model
 * believes it has seen every value and confidently filters for none of the
 * rest. `optionsOmitted` is how it learns to ask instead.
 */
function boundFilter(filter: AgentFilter): AgentFilter {
  if (!filter.options || filter.options.length <= OPTION_CAP) return filter;
  return {
    ...filter,
    options: filter.options.slice(0, OPTION_CAP),
    optionsOmitted: true,
  };
}

/** Filters whose key names a column the agent may not read are dropped. */
function permittedFilters(
  filters: readonly AgentFilter[],
  columns: readonly AgentColumn[]
): readonly AgentFilter[] {
  const unreadable = new Set(
    columns.filter((column) => !column.readable).map((column) => column.id)
  );
  return filters
    .filter((filter) => !unreadable.has(filter.key))
    .map(boundFilter);
}

/**
 * Strip a filter bag down to keys the agent is allowed to know about.
 *
 * An excluded field must not come back through the current-filter state, which
 * is the quiet path a sanitized column list would otherwise leave open.
 */
function permittedFilterState(
  state: Readonly<Record<string, unknown>> | undefined,
  filters: readonly AgentFilter[]
): Readonly<Record<string, unknown>> | undefined {
  if (!state) return undefined;
  const allowed = new Set(filters.flatMap((filter) => filter.valueKeys));
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (allowed.has(key)) kept[key] = value;
  }
  return Object.keys(kept).length > 0 ? kept : undefined;
}

/** Everything the contract says, named so two of them can be compared. */
export function contractVersion(contract: AgentContextContract): string {
  return JSON.stringify({
    tableId: contract.tableId,
    capabilities: contract.capabilities.map((entry) => [
      entry.key,
      entry.summary,
    ]),
    columns: contract.columns,
    filters: contract.filters,
    aggregations: contract.aggregations,
    rowAddressing: contract.rowAddressing,
    limits: contract.limits,
    policy: contract.policy,
    source: contract.source,
  });
}

/**
 * Build the permitted contract from the live session.
 *
 * Every key comes from `session.catalog()`, which has already applied the
 * permission predicate, so nothing excluded can reach this. Guides are
 * attached by the selection step, not here: what a capability *is* does not
 * depend on how much room there was to explain it.
 */
export function buildContract(
  session: AgentSession,
  catalog: readonly CatalogEntry[],
  filters: readonly AgentFilter[],
  aggregations: AgentAggregations | undefined,
  samples: Readonly<Record<string, readonly unknown[]>> = {}
): AgentContextContract {
  const manifest = session.manifest();
  const contract: AgentContextContract = {
    tableId: manifest.tableId,
    version: "",
    capabilities: catalog.map((entry) => ({
      key: entry.key,
      summary: entry.summary,
      ...(entry.summaryShort ? { summaryShort: entry.summaryShort } : {}),
    })),
    columns: manifest.columns.map((column) =>
      contextColumn(column, samples[column.id])
    ),
    filters: permittedFilters(filters, manifest.columns),
    ...(aggregations ? { aggregations } : {}),
    rowAddressing: manifest.rowAddressing,
    limits: manifest.limits,
    policy: manifest.policy,
    source: manifest.source,
  };
  return { ...contract, version: contractVersion(contract) };
}

/** What the table's view state looks like, with nothing forbidden in it. */
export function buildView(
  view: {
    readonly revision: number;
    readonly page?: number;
    readonly limit?: number;
    readonly search?: string;
    readonly sortBy?: string;
    readonly sortDir?: "asc" | "desc";
    readonly groupBy?: string;
    readonly filters?: Readonly<Record<string, unknown>>;
    readonly pinnedColumns?: Readonly<Record<string, unknown>>;
    readonly pinnedRows?: Readonly<Record<string, unknown>>;
    readonly hiddenColumns?: readonly string[];
    readonly columnOrder?: readonly string[];
    readonly pagination?: AgentPagination;
  },
  filters: readonly AgentFilter[]
): AgentContextView {
  // Absence is a fact, not a default. A host that publishes no page is not a
  // host whose table is on page 1. The session's own pagination is that
  // fact when the host did not pass page and limit separately — inventing
  // `10` here is how a model was told the size was already 10 on a table
  // sitting at 25, and never called setLimit.
  const pages = view.pagination;
  const page = view.page ?? pages?.page;
  const limit = view.limit ?? pages?.pageSize;
  const missing: string[] = [];
  if (page === undefined) missing.push("page");
  if (limit === undefined) missing.push("limit");
  if (view.search === undefined) missing.push("search");
  const state = permittedFilterState(view.filters, filters);
  return {
    revision: view.revision,
    page: page ?? 1,
    limit: limit ?? 10,
    search: view.search ?? "",
    ...(view.sortBy ? { sortBy: view.sortBy } : {}),
    ...(view.sortDir ? { sortDir: view.sortDir } : {}),
    ...(view.groupBy ? { groupBy: view.groupBy } : {}),
    ...(state ? { filters: state } : {}),
    ...(view.pinnedColumns ? { pinnedColumns: view.pinnedColumns } : {}),
    ...(view.pinnedRows ? { pinnedRows: view.pinnedRows } : {}),
    ...(view.hiddenColumns ? { hiddenColumns: view.hiddenColumns } : {}),
    ...(view.columnOrder ? { columnOrder: view.columnOrder } : {}),
    ...(view.pagination ? { pagination: view.pagination } : {}),
    ...(missing.length > 0 ? { unknown: missing } : {}),
  };
}

/** Wrap a guide onto the capability it belongs to. */
export function withGuide(
  capability: ContextCapability,
  guide: CapabilityGuide,
  includeOutput: boolean
): ContextCapability {
  return {
    ...capability,
    guide: guide.guide,
    input: guide.input,
    ...(includeOutput && guide.output ? { output: guide.output } : {}),
  };
}
