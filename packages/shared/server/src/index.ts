/**
 * `@adapttable/server` — read the table's query on the server, and be able to
 * trust what you read.
 *
 * The table already puts its whole state in the URL, which is what makes a
 * view shareable and a page reloadable. The moment that URL reaches a backend
 * it stops being state and becomes **user input**: `limit=999999`,
 * `sortBy=password`, a filter on a column that is not in the table at all.
 * Every one of those is one fetch away from a slow query, a leaked field, or
 * a stack trace in a log.
 *
 * So this package parses and it validates, and it will not do the first
 * without the second: {@link parseTableQuery} takes the columns a client is
 * allowed to name and drops everything else. Dropping rather than throwing is
 * deliberate — a stale bookmark or a hand-edited link should give a sensible
 * table, not a 500 — and what was dropped is reported, so a route that wants
 * to be strict can be.
 *
 * It is backend-agnostic on purpose. There is no ORM here and no SQL: it
 * hands you a typed description of what was asked for, and what you do with
 * it is yours.
 *
 * There is no React either. The codecs come from `@adapttable/core/query`, the
 * entry built without a client boundary and without a hook in its graph, so a
 * Node service that installs this installs a parser — not a UI library it will
 * never render. The encoding is still the table's own, from the table's own
 * source: shared at runtime rather than copied, because a parser that
 * disagrees with the link it was sent is worse than no parser.
 *
 * ```ts
 * // Next.js route handler, Remix loader, Server Action — all get a Request.
 * export async function GET(request: Request) {
 *   const query = parseTableQuery(request, { columns: ["name", "team"] });
 *   return Response.json(await people(query));
 * }
 * ```
 *
 * @packageDocumentation
 */
import {
  DEFAULT_LIMIT,
  deserializePivotState,
  FILTER_PREFIX,
  FILTER_TREE_PARAM,
  type GroupAggregateOverride,
  type GroupAggregateOverrides,
  isFilterGroup,
  MAX_LIMIT,
  PARAM_GROUP_AGGREGATES,
  PARAM_GROUP_BY,
  PARAM_LIMIT,
  PARAM_PAGE,
  PARAM_PIVOT,
  PARAM_SEARCH,
  PARAM_SORT,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
  parseFilterTree,
  parseGroupAggregateOverrides,
  parseStrictFilterTree,
  type PivotConfig,
  type PivotUrlState,
  type QueryFilterGroup,
  safeDecode,
  type SortDirection,
  type SortLevel,
} from "@adapttable/core/query";

import {
  checkTree,
  declaredFilters,
  type Refuse,
  type ServerFilterDef,
  type ServerFilterType,
  type ShapedFilter,
  shapeFilters,
  type TypedFilter,
  typeFilters,
} from "./filters";

export {
  type BooleanFilter,
  type CustomTypedFilter,
  type DateRangeFilter,
  type ListFilter,
  type NumberRangeFilter,
  pickFilters,
  type SelectFilter,
  type ServerFilterDef,
  type ServerFilterType,
  type ShapedFilter,
  splitFilterValues,
  type TextFilter,
  type TypedFilter,
} from "./filters";
export { splitListParam } from "@adapttable/core/query";

/**
 * The cursor parameter: the server's own, beside the table's state, for a
 * backend that pages by cursor.
 */
const PARAM_CURSOR = "cursor";

/**
 * What a client is allowed to ask for.
 *
 * @public
 */
export interface QuerySchema {
  /**
   * The columns a client may sort, filter, group or pivot by.
   *
   * This is the allowlist, and it is the reason this package exists. A
   * `sortBy` that reaches your database because nobody checked it is a column
   * name chosen by whoever sent the request.
   *
   * `"any"` checks no names at all: everything is parsed and shaped, and
   * nothing is refused for its column. The names are then the client's own
   * words — map them to your fields, never interpolate them into a query.
   */
  columns: readonly string[] | "any";
  /**
   * The filters a client may use, typed.
   *
   * A record of key to filter type (`{ team: "multiSelect" }`), or the same
   * `FilterDef` objects the browser passes to `filters(…)`. Each filter comes
   * back in `typedFilters` with its operator checked against the type and its
   * value parsed; with definitions, a static option list is enforced too. Any
   * `f_` parameter that belongs to no declared filter is refused. Build the
   * schema per request and pass `pickFilters` of what the caller may
   * use to scope filtering by user or role.
   */
  filters?: Readonly<Record<string, string>> | readonly ServerFilterDef[];
  /**
   * Filter types the host registered on the table (`filterTypes`), so their
   * operators can be checked. A `FilterTypeSpec` fits as it is.
   */
  filterTypes?: readonly ServerFilterType[];
  /**
   * Report every grouping key in `groupByKeys`. Off by default for every
   * schema; `groupBy` is reported either way.
   */
  groupByKeys?: boolean;
  /**
   * The largest page a client may ask for. Defaults to the table's own
   * ceiling, `MAX_LIMIT`. A backend that pages by 25 and never expects more should say so
   * here rather than discover `limit=100000` in production.
   */
  maxLimit?: number;
  /**
   * The page size when the request does not name one. Defaults to the
   * table's own, `DEFAULT_LIMIT`.
   */
  defaultLimit?: number;
  /**
   * The URL namespace the table was mounted with (`urlKey`). Needed when two
   * tables share one URL, and harmless otherwise.
   */
  urlKey?: string;
}

/**
 * A filter value that survived validation.
 *
 * @public
 */
export type ServerFilterValue = string | readonly string[];

/**
 * The query, parsed and checked against the schema.
 *
 * @public
 */
export interface ServerTableQuery {
  /** 1-based page. Always at least 1. */
  page: number;
  /** Rows per page, clamped to the schema's ceiling. */
  limit: number;
  /** How many rows to skip — `(page - 1) * limit`, computed once here. */
  offset: number;
  /** The free-text search, or `undefined` when there was none. */
  search?: string;
  /**
   * The sort chain, outermost first. Empty when nothing valid was asked for
   * — never a guess at what the caller meant.
   */
  sort: readonly SortLevel[];
  /** The grouping column, when it is one the schema allows. */
  groupBy?: string;
  /**
   * Every grouping key, outermost first, each one the schema allows — for a
   * table grouped several levels deep (`groupBy=team,status`).
   */
  groupByKeys?: readonly string[];
  /**
   * The reader's aggregation choice per grouped column, for each column the
   * schema allows: a built-in operation, a host-defined operation id, or
   * `"none"` when the reader took the column's aggregate away. Operation ids
   * are the client's words — map them to yours, never interpolate them.
   */
  groupAggregates?: GroupAggregateOverrides;
  /** Column filters, keyed by column. Only columns in the schema appear. */
  filters: Readonly<Record<string, ServerFilterValue>>;
  /**
   * Every filter, shaped — its operator beside it, a range's bounds joined —
   * when `columns` is `"any"` and no filters are declared. Values are strings,
   * and the keys are the client's own words.
   */
  shapedFilters?: Readonly<Record<string, ShapedFilter>>;
  /** Every declared filter, typed and checked, when `filters` is declared. */
  typedFilters?: Readonly<Record<string, TypedFilter>>;
  /** The advanced filter tree, when one was sent and every column checked out. */
  filterTree?: QueryFilterGroup;
  /**
   * The pivot configuration, with unknown columns dropped — the axes, the
   * measures, and whether subtotals and grand totals were asked for.
   */
  pivot?: PivotConfig;
  /**
   * The folded pivot groups, by collapse key, when the link named any.
   *
   * These are dimension **values** rather than column names — a team, a region,
   * a quarter — so no schema can vouch for them and none is applied: they are
   * data, to be parameterised like a search term. A server that pivots can skip
   * the rows under a folded group; one that does not can ignore them, since the
   * table folds its own lines when it pivots locally.
   */
  pivotCollapsed?: readonly string[];
  /** The opaque cursor, in cursor mode. */
  cursor?: string;
  /**
   * What was thrown away, and why — unknown columns, a limit above the
   * ceiling, a filter tree naming a field that does not exist.
   *
   * Empty on a clean request. A route that would rather reject than degrade
   * can check this and answer 400; the parse itself never throws, because a
   * stale bookmark should give a table rather than an error page.
   */
  rejected: readonly QueryRejection[];
}

/**
 * One thing the parser refused.
 *
 * @public
 */
export interface QueryRejection {
  /** The parameter it came from, without the namespace. */
  param: string;
  /** The offending value, as it arrived. */
  value: string;
  /** Why it was dropped, in a sentence a log reader can act on. */
  reason: string;
}

/**
 * Anything a route handler might have in its hands.
 *
 * @public
 */
export type QueryInput =
  string | URL | URLSearchParams | { readonly url: string };

/** The search params, whatever shape the caller had. */
function toParams(input: QueryInput): URLSearchParams {
  if (typeof input === "string") {
    // Both a full URL and a bare query string are ordinary things to hold.
    const at = input.indexOf("?");
    return new URLSearchParams(at >= 0 ? input.slice(at + 1) : input);
  }
  if (input instanceof URLSearchParams) return input;
  if (input instanceof URL) return input.searchParams;
  // A `Request`, or anything else carrying a `url` — typed structurally so
  // this package needs no DOM lib and no framework import.
  return new URL(input.url).searchParams;
}

/** Every column key a filter tree names, however deeply nested. */
function treeColumns(group: QueryFilterGroup): string[] {
  const found: string[] = [];
  const walk = (node: QueryFilterGroup) => {
    for (const child of node.conditions) {
      if (isFilterGroup(child)) walk(child);
      else found.push(child.key);
    }
  };
  walk(group);
  return found;
}

/**
 * Parse a table query and check it against what the client is allowed to ask.
 *
 * Never throws. Anything invalid is dropped and reported in `rejected`, so a
 * stale bookmark degrades to a simpler table instead of an error page — and a
 * route that would rather be strict has the list to reject on.
 *
 * @param input - A `Request`, a `URL`, a query string, or search params.
 * @param schema - The columns a client may name, and the page-size ceiling.
 * @returns The validated query, plus whatever was refused.
 *
 * @public
 */
export function parseTableQuery(
  input: QueryInput,
  schema: QuerySchema
): ServerTableQuery {
  const params = toParams(input);
  const ns = schema.urlKey ? `${schema.urlKey}.` : "";
  const get = (name: string) => params.get(`${ns}${name}`);
  const listed = schema.columns === "any" ? undefined : new Set(schema.columns);
  const allowed: Allows = (key) => listed === undefined || listed.has(key);
  const rejected: QueryRejection[] = [];
  const refuse = (param: string, value: string, reason: string) => {
    rejected.push({ param, value, reason });
  };

  const { page, limit } = readPaging(get, schema, refuse);
  const search = get(PARAM_SEARCH) ?? undefined;
  const cursor = get(PARAM_CURSOR);
  const sort = validSort(get, allowed, refuse);
  const grouping = readGrouping(get, schema, allowed, refuse);
  const filtering = readFiltering(params, ns, schema, listed, allowed, refuse);
  const pivot = validPivot(get(PARAM_PIVOT), allowed, refuse);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    ...(search === undefined || search === "" ? {} : { search }),
    sort,
    ...grouping,
    ...filtering,
    ...(pivot === undefined ? {} : { pivot: pivot.config }),
    ...(pivot === undefined || pivot.collapsed.length === 0
      ? {}
      : { pivotCollapsed: pivot.collapsed }),
    ...(cursor ? { cursor } : {}),
    rejected,
  };
}

/** The page and the page size, the size held to the schema's ceiling. */
function readPaging(
  get: (name: string) => string | null,
  schema: QuerySchema,
  refuse: Refuse
): { readonly page: number; readonly limit: number } {
  const ceiling = Math.min(schema.maxLimit ?? MAX_LIMIT, MAX_LIMIT);
  const askedLimit = get(PARAM_LIMIT);
  const asked = wholeCount(askedLimit) ?? schema.defaultLimit ?? DEFAULT_LIMIT;
  if (asked > ceiling) {
    refuse(
      PARAM_LIMIT,
      askedLimit ?? "",
      `above the maximum of ${String(ceiling)}`
    );
  }
  const limit = Math.min(asked, ceiling);
  const askedPage = get(PARAM_PAGE);
  const page = wholeCount(askedPage) ?? 1;
  // The offset is computed here and handed to a database, so it stays a
  // safe integer: a page past that is refused, not rounded.
  if (!Number.isSafeInteger((page - 1) * limit)) {
    refuse(PARAM_PAGE, askedPage ?? "", "beyond the largest safe offset");
    return { page: 1, limit };
  }
  return { page, limit };
}

/**
 * The grouping column, every grouping key when the schema asks for them, and
 * the reader's aggregation choices.
 *
 * Every schema answers with `groupBy` alone unless it sets `groupByKeys:
 * true`; then it also lists the keys, and refuses each one it does not allow
 * exactly once.
 */
function readGrouping(
  get: (name: string) => string | null,
  schema: QuerySchema,
  allowed: Allows,
  refuse: Refuse
): Pick<ServerTableQuery, "groupBy" | "groupByKeys" | "groupAggregates"> {
  const raw = get(PARAM_GROUP_BY);
  const reportsKeys = schema.groupByKeys === true;
  const groupByKeys = reportsKeys
    ? validGroupByKeys(raw, allowed, refuse)
    : undefined;
  const groupBy = validGroupBy(
    raw,
    allowed,
    reportsKeys ? () => undefined : refuse
  );
  const groupAggregates = validGroupAggregates(
    get(PARAM_GROUP_AGGREGATES),
    allowed,
    refuse
  );
  return {
    ...(groupBy === undefined ? {} : { groupBy }),
    ...(groupByKeys === undefined ? {} : { groupByKeys }),
    ...(groupAggregates === undefined ? {} : { groupAggregates }),
  };
}

/**
 * The filters, the filter tree, and the shaped or typed view of them.
 *
 * Declared filters type and check every parameter; a column list checks the
 * keys alone; `columns: "any"` without declarations shapes what it passes.
 */
function readFiltering(
  params: URLSearchParams,
  ns: string,
  schema: QuerySchema,
  listed: ReadonlySet<string> | undefined,
  allowed: Allows,
  refuse: Refuse
): Pick<
  ServerTableQuery,
  "filters" | "shapedFilters" | "typedFilters" | "filterTree"
> {
  const tree = params.get(`${ns}${FILTER_TREE_PARAM}`);
  if (schema.filters === undefined) {
    const filters = validFilters(params, ns, allowed, refuse);
    const filterTree = validTree(tree, allowed, refuse);
    return {
      filters,
      ...(listed === undefined
        ? { shapedFilters: shapeFilters(params, ns) }
        : {}),
      ...(filterTree === undefined ? {} : { filterTree }),
    };
  }
  const defs = declaredFilters(schema.filters);
  const custom = schema.filterTypes ?? [];
  const typed = typeFilters(params, ns, defs, custom, refuse);
  const filterTree = typedTree(tree, defs, custom, refuse);
  return {
    filters: typed.raw,
    typedFilters: typed.typed,
    ...(filterTree === undefined ? {} : { filterTree }),
  };
}

/**
 * A positive whole number written in decimal digits, or `undefined`.
 *
 * Anything else — a float, a negative, an exponent, a word, a number with
 * text after it, an empty string — reads as absent rather than a thrown
 * error: a page number is the least surprising thing in a URL to be wrong,
 * and the least worth refusing over. A number too large to be exact is still
 * a number; the caller decides what that means.
 */
function wholeCount(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > 0 ? n : undefined;
}

/** Whether the schema lets a client name a column. */
type Allows = (key: string) => boolean;

/** The sort chain, minus any level naming a column the client may not sort. */
function validSort(
  get: (name: string) => string | null,
  allowed: Allows,
  refuse: Refuse
): SortLevel[] {
  const levels = readChain(get(PARAM_SORT));
  if (levels.length > 0) {
    return levels.filter((level) => {
      if (allowed(level.key)) return true;
      refuse(PARAM_SORT, level.key, "not a sortable column");
      return false;
    });
  }
  // The single-column form the table writes for a one-column sort.
  const by = get(PARAM_SORT_BY);
  if (by === null || by === "") return [];
  if (!allowed(by)) {
    refuse(PARAM_SORT_BY, by, "not a sortable column");
    return [];
  }
  const raw = get(PARAM_SORT_DIR);
  const dir: SortDirection = raw === "desc" ? "desc" : "asc";
  return [{ key: by, dir }];
}

/**
 * The multi-sort chain as the table writes it: `name:asc,team:desc`, each key
 * percent-encoded so a key holding `:` or `,` survives the chain's own
 * separators. A key that does not decode is kept as it arrived.
 *
 * A malformed level is skipped rather than failing the chain — losing one
 * level of an ordering is a smaller lie than losing the ordering.
 */
function readChain(raw: string | null): SortLevel[] {
  if (raw === null || raw === "") return [];
  const out: SortLevel[] = [];
  for (const part of raw.split(",")) {
    const [key, dir] = part.split(":");
    if (!key) continue;
    out.push({ key: safeDecode(key), dir: dir === "desc" ? "desc" : "asc" });
  }
  return out;
}

/** The grouping column, if the client may group by it. */
function validGroupBy(
  raw: string | null,
  allowed: Allows,
  refuse: Refuse
): string | undefined {
  if (raw === null || raw === "") return undefined;
  if (allowed(raw)) return raw;
  refuse(PARAM_GROUP_BY, raw, "not a groupable column");
  return undefined;
}

/**
 * Every grouping key, outermost first, minus any the schema does not allow.
 */
function validGroupByKeys(
  raw: string | null,
  allowed: Allows,
  refuse: Refuse
): string[] | undefined {
  if (raw === null || raw === "") return undefined;
  const keys = raw
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
  const kept = keys.filter((key) => {
    if (allowed(key)) return true;
    refuse(PARAM_GROUP_BY, key, "not a groupable column");
    return false;
  });
  return kept.length === 0 ? undefined : kept;
}

/**
 * The reader's aggregation choice per column, minus any column the schema
 * does not allow. The operation ids pass through: a host may define its own,
 * so there is nothing to check them against.
 */
function validGroupAggregates(
  raw: string | null,
  allowed: Allows,
  refuse: Refuse
): GroupAggregateOverrides | undefined {
  const overrides = parseGroupAggregateOverrides(raw);
  const kept: Partial<Record<string, GroupAggregateOverride>> = {};
  for (const key of Object.keys(overrides)) {
    if (allowed(key)) kept[key] = overrides[key];
    else refuse(PARAM_GROUP_AGGREGATES, key, "not an aggregatable column");
  }
  return Object.keys(kept).length === 0 ? undefined : kept;
}

/**
 * The submitted tree, read strictly: a malformed node refuses the whole tree
 * rather than being pruned out of it, since a pruned AND matches more rows
 * than the one the client asked for.
 */
function submittedTree(
  raw: string,
  refuse: Refuse
): QueryFilterGroup | undefined {
  const tree = parseStrictFilterTree(raw);
  if (tree) return tree;
  refuse(
    FILTER_TREE_PARAM,
    raw,
    parseFilterTree(raw)
      ? "filter tree has a malformed condition"
      : "not a readable filter tree"
  );
  return undefined;
}

/**
 * The filter tree, checked against the declared filters: every condition a
 * declared key, an operator its type allows, a value of its shape, each
 * operator in its type's own spelling. As with columns, one bad condition
 * drops the whole tree.
 */
function typedTree(
  raw: string | null,
  defs: readonly ServerFilterDef[],
  custom: readonly ServerFilterType[],
  refuse: Refuse
): QueryFilterGroup | undefined {
  if (raw === null || raw === "") return undefined;
  const tree = submittedTree(raw, refuse);
  if (!tree) return undefined;
  const checked = checkTree(tree, defs, custom);
  if ("problem" in checked) {
    refuse(FILTER_TREE_PARAM, raw, checked.problem);
    return undefined;
  }
  return checked.tree;
}

/** Column filters, minus any naming a column outside the schema. */
function validFilters(
  params: URLSearchParams,
  ns: string,
  allowed: Allows,
  refuse: Refuse
): Record<string, ServerFilterValue> {
  const out: Record<string, ServerFilterValue> = {};
  params.forEach((value, key) => {
    if (!key.startsWith(`${ns}${FILTER_PREFIX}`)) return;
    const column = key.slice(ns.length + FILTER_PREFIX.length);
    if (!allowed(column)) {
      refuse(key.slice(ns.length), value, "not a filterable column");
      return;
    }
    // The table writes a multi-value filter as ONE parameter, entries joined
    // with commas and each one percent-encoded — `splitFilterValues` reads
    // that. A repeated parameter is kept as a list, for a client that sends
    // one.
    const all = params.getAll(key);
    out[column] = all.length > 1 ? all : value;
  });
  return out;
}

/**
 * The advanced filter tree, or nothing.
 *
 * A tree is all-or-nothing: dropping one condition out of an AND/OR quietly
 * widens the result set, which is the one failure mode a filter must not
 * have. If any field is outside the schema, the whole tree goes.
 */
function validTree(
  raw: string | null,
  allowed: Allows,
  refuse: Refuse
): QueryFilterGroup | undefined {
  if (raw === null || raw === "") return undefined;
  const tree = submittedTree(raw, refuse);
  if (!tree) return undefined;
  const unknown = treeColumns(tree).filter((field) => !allowed(field));
  if (unknown.length > 0) {
    refuse(
      FILTER_TREE_PARAM,
      unknown.join(", "),
      "filter tree names unknown columns"
    );
    return undefined;
  }
  return tree;
}

/**
 * The pivot state, minus any axis or measure outside the schema.
 *
 * A column name is the part a schema can vouch for, so it is the part that gets
 * filtered. Everything else the parameter carries is the client's own view of
 * its own table — whether subtotals are shown, which groups are folded — and it
 * travels through untouched, because there is nothing to check it against and
 * dropping it would answer a different question than the one asked.
 */
function validPivot(
  raw: string | null,
  allowed: Allows,
  refuse: Refuse
): PivotUrlState | undefined {
  if (raw === null || raw === "") return undefined;
  const { config, collapsed } = deserializePivotState(raw);
  const keep = (key: string, what: string) => {
    if (allowed(key)) return true;
    refuse(PARAM_PIVOT, key, `not a ${what} column`);
    return false;
  };
  const rows = config.rows.filter((key) => keep(key, "pivotable"));
  const columns = config.columns.filter((key) => keep(key, "pivotable"));
  const measures = config.measures.filter((measure) =>
    keep(measure.key, "measurable")
  );
  if (rows.length === 0 && columns.length === 0 && measures.length === 0) {
    return undefined;
  }
  return { config: { ...config, rows, columns, measures }, collapsed };
}
