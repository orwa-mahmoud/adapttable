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
  deserializePivotState,
  isFilterGroup,
  parseFilterTree,
  type PivotConfig,
  type PivotUrlState,
  type QueryFilterGroup,
  type SortDirection,
  type SortLevel,
} from "@adapttable/core/query";

/**
 * The table's own ceiling on a page size, mirrored rather than imported: it
 * is part of the wire contract, and the parser has to know it even when the
 * schema names no maximum of its own.
 */
const TABLE_MAX_LIMIT = 500;

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
   */
  columns: readonly string[];
  /**
   * The largest page a client may ask for. Defaults to the table's own
   * ceiling. A backend that pages by 25 and never expects more should say so
   * here rather than discover `limit=100000` in production.
   */
  maxLimit?: number;
  /** The page size when the request does not name one. Defaults to 25. */
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
  /** Column filters, keyed by column. Only columns in the schema appear. */
  filters: Readonly<Record<string, ServerFilterValue>>;
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

/** The default page size, matching the table's own. */
const DEFAULT_LIMIT = 25;

/** Prefix for a column filter, as the table writes it. */
const FILTER_PREFIX = "f_";

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
  const allowed = new Set(schema.columns);
  const rejected: QueryRejection[] = [];
  const refuse = (param: string, value: string, reason: string) => {
    rejected.push({ param, value, reason });
  };

  const ceiling = Math.min(schema.maxLimit ?? TABLE_MAX_LIMIT, TABLE_MAX_LIMIT);
  const askedLimit = get("limit");
  const limit = readCount(askedLimit, schema.defaultLimit ?? DEFAULT_LIMIT);
  if (limit > ceiling) {
    refuse(
      "limit",
      askedLimit ?? "",
      `above the maximum of ${String(ceiling)}`
    );
  }

  const page = readCount(get("page"), 1);
  const search = get("q") ?? undefined;
  const cursor = get("cursor");

  const sort = validSort(params, ns, allowed, refuse);
  const groupBy = validGroupBy(get("groupBy"), allowed, refuse);
  const filters = validFilters(params, ns, allowed, refuse);
  const filterTree = validTree(get("ft"), allowed, refuse);
  const pivot = validPivot(get("pivot"), allowed, refuse);

  return {
    page,
    limit: Math.min(limit, ceiling),
    offset: (page - 1) * Math.min(limit, ceiling),
    ...(search === undefined || search === "" ? {} : { search }),
    sort,
    ...(groupBy === undefined ? {} : { groupBy }),
    filters,
    ...(filterTree === undefined ? {} : { filterTree }),
    ...(pivot === undefined ? {} : { pivot: pivot.config }),
    ...(pivot === undefined || pivot.collapsed.length === 0
      ? {}
      : { pivotCollapsed: pivot.collapsed }),
    ...(cursor ? { cursor } : {}),
    rejected,
  };
}

/**
 * A positive whole number, or the fallback.
 *
 * Anything else — a float, a negative, a word, an empty string — is the
 * fallback rather than a thrown error: a page number is the least surprising
 * thing in a URL to be wrong, and the least worth refusing over.
 */
function readCount(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** What `refuse` looks like to the validators below. */
type Refuse = (param: string, value: string, reason: string) => void;

/** The sort chain, minus any level naming a column the client may not sort. */
function validSort(
  params: URLSearchParams,
  ns: string,
  allowed: ReadonlySet<string>,
  refuse: Refuse
): SortLevel[] {
  const levels = readChain(params.get(`${ns}sort`));
  if (levels.length > 0) {
    return levels.filter((level) => {
      if (allowed.has(level.key)) return true;
      refuse("sort", level.key, "not a sortable column");
      return false;
    });
  }
  // The single-column form, which predates the chain and still appears in
  // older links.
  const by = params.get(`${ns}sortBy`);
  if (by === null || by === "") return [];
  if (!allowed.has(by)) {
    refuse("sortBy", by, "not a sortable column");
    return [];
  }
  const raw = params.get(`${ns}sortDir`);
  const dir: SortDirection = raw === "desc" ? "desc" : "asc";
  return [{ key: by, dir }];
}

/**
 * The multi-sort chain as the table writes it: `name:asc,team:desc`.
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
    out.push({ key, dir: dir === "desc" ? "desc" : "asc" });
  }
  return out;
}

/** The grouping column, if the client may group by it. */
function validGroupBy(
  raw: string | null,
  allowed: ReadonlySet<string>,
  refuse: Refuse
): string | undefined {
  if (raw === null || raw === "") return undefined;
  if (allowed.has(raw)) return raw;
  refuse("groupBy", raw, "not a groupable column");
  return undefined;
}

/** Column filters, minus any naming a column outside the schema. */
function validFilters(
  params: URLSearchParams,
  ns: string,
  allowed: ReadonlySet<string>,
  refuse: Refuse
): Record<string, ServerFilterValue> {
  const out: Record<string, ServerFilterValue> = {};
  params.forEach((value, key) => {
    if (!key.startsWith(`${ns}${FILTER_PREFIX}`)) return;
    const column = key.slice(ns.length + FILTER_PREFIX.length);
    if (!allowed.has(column)) {
      refuse(key.slice(ns.length), value, "not a filterable column");
      return;
    }
    // A repeated parameter is a multi-value filter, which is how the table
    // writes a checklist.
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
  allowed: ReadonlySet<string>,
  refuse: Refuse
): QueryFilterGroup | undefined {
  if (raw === null || raw === "") return undefined;
  const tree = parseFilterTree(raw);
  if (!tree) {
    refuse("ft", raw, "not a readable filter tree");
    return undefined;
  }
  const unknown = treeColumns(tree).filter((field) => !allowed.has(field));
  if (unknown.length > 0) {
    refuse("ft", unknown.join(", "), "filter tree names unknown columns");
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
  allowed: ReadonlySet<string>,
  refuse: Refuse
): PivotUrlState | undefined {
  if (raw === null || raw === "") return undefined;
  const { config, collapsed } = deserializePivotState(raw);
  const keep = (key: string, what: string) => {
    if (allowed.has(key)) return true;
    refuse("pivot", key, `not a ${what} column`);
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
