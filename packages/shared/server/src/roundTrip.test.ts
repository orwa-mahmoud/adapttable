/**
 * Every state the table's own store writes to a URL, read back by the server.
 *
 * Each case drives core's view-state store — the one every binding keeps in
 * step with the URL — through its own mutators, then parses the URL the store
 * wrote. Filters are turned into the filter bag by each built-in type's own
 * `conditionToExtra`, so the bag is exactly what the table holds after a
 * reader picks that operator. Nothing here hand-writes a parameter: a change
 * to how the table encodes any part of its state fails a case here.
 */
import {
  buildFilterRuntime,
  createMemoryAdapter,
  createTableViewStore,
  createUrlSliceStore,
  DATE_OPS,
  defaultFilterRegistry,
  type ExtraFilters,
  type FilterDef,
  type GroupAggregateOverrides,
  MAX_LIMIT,
  NUMBER_OPS,
  pivotSlice,
  type PivotUrlState,
  type QueryCondition,
  type QueryFilterGroup,
  type TableViewStateConfig,
  type TableViewStore,
  TEXT_OPS,
} from "@adapttable/core";
import { describe, expect, it } from "vitest";

import {
  parseTableQuery,
  type QuerySchema,
  type ServerFilterType,
  type ServerTableQuery,
  type TypedFilter,
} from "./index";

/** A host-registered type, as the server declares it. */
const STARS: ServerFilterType = {
  type: "stars",
  ops: ["atLeast", "exactly"],
  defaultOp: "atLeast",
};

/** One filter of every built-in type, plus a registered one. */
const DEFS: readonly FilterDef[] = [
  { key: "name", type: "text" },
  {
    key: "status",
    type: "select",
    options: [
      { value: "open", label: "Open" },
      { value: "closed, won", label: "Closed (won)" },
    ],
  },
  { key: "team", type: "multiSelect" },
  { key: "tags", type: "checklist" },
  { key: "active", type: "boolean" },
  { key: "budget", type: "numberRange" },
  { key: "hiredAt", type: "dateRange" },
  { key: "score", type: STARS.type },
];

/** Sort keys holding the characters the sort chain separates on. */
const SORT_KEYS = ["team:lead, ops", "100% done"];

const COLUMNS = [...DEFS.map((def) => def.key), ...SORT_KEYS];

/** The filter keys the table parses as numbers and lists, from its runtime. */
const RUNTIME = buildFilterRuntime(DEFS, defaultFilterRegistry);
const VIEW_CONFIG: TableViewStateConfig = {
  numberExtraKeys: RUNTIME.numberExtraKeys,
  arrayExtraKeys: RUNTIME.arrayExtraKeys,
};

/**
 * Each level of checking a server can ask for. A column list allows filter
 * parameters by their raw key, so it names every key the filter bag holds.
 */
function levels(
  filterKeys: readonly string[] = []
): Readonly<Record<string, QuerySchema>> {
  return {
    "any column": { columns: "any", groupByKeys: true },
    "a column list": {
      columns: [...COLUMNS, ...filterKeys],
      groupByKeys: true,
    },
    "declared filters": {
      columns: COLUMNS,
      filters: DEFS,
      filterTypes: [STARS],
      groupByKeys: true,
    },
  };
}

/** A table store over an in-memory URL, as a binding holds one. */
function tableStore(
  urlKey?: string,
  config: TableViewStateConfig = VIEW_CONFIG
) {
  const adapter = createMemoryAdapter();
  const store = createTableViewStore({ adapter, urlKey }, config);
  return { adapter, store };
}

/** What the table wrote, as a server reads it at one level. */
function serverRead(
  adapter: { getSearch(): string },
  schema: QuerySchema,
  urlKey?: string
): ServerTableQuery {
  return parseTableQuery(`?${adapter.getSearch()}`, {
    ...schema,
    ...(urlKey === undefined ? {} : { urlKey }),
  });
}

/** Run `act` on a fresh store and read the URL it wrote at every level. */
function roundTrip(
  act: (store: TableViewStore) => void,
  {
    urlKey,
    filterKeys,
  }: { urlKey?: string; filterKeys?: readonly string[] } = {}
): Record<string, ServerTableQuery> {
  const { adapter, store } = tableStore(urlKey);
  act(store);
  return Object.fromEntries(
    Object.entries(levels(filterKeys)).map(([level, schema]) => [
      level,
      serverRead(adapter, schema, urlKey),
    ])
  );
}

/** The definition of a filter key. */
function defOf(key: string): FilterDef {
  const def = DEFS.find((candidate) => candidate.key === key);
  if (!def) throw new Error(`no filter definition for "${key}"`);
  return def;
}

/** The filter bag the table holds once a reader sets this condition. */
function extraFor(condition: QueryCondition): ExtraFilters {
  const def = defOf(condition.key);
  const spec = defaultFilterRegistry.get(def.type);
  if (spec) return spec.conditionToExtra(def, condition);
  // A registered type stores its value and operator the way a custom
  // widget writes them through `setExtra`.
  return {
    [def.key]: condition.value as string,
    [`${def.key}Op`]: condition.op,
  };
}

/** One filter condition and what a declared-filter server types it into. */
interface FilterCase {
  readonly condition: QueryCondition;
  readonly typed: TypedFilter;
}

const TEXT_VALUE = "Ada, R&D 100%";

const textCases: FilterCase[] = TEXT_OPS.map((op) =>
  op === "empty" || op === "notEmpty"
    ? { condition: { key: "name", op }, typed: { type: "text", op } }
    : {
        condition: { key: "name", op, value: TEXT_VALUE },
        typed: { type: "text", op, value: TEXT_VALUE },
      }
);

function numberCase(op: (typeof NUMBER_OPS)[number]): FilterCase {
  const key = "budget";
  if (op === "between") {
    return {
      condition: { key, op, value: [1000, 5000.5] },
      typed: { type: "numberRange", op, min: 1000, max: 5000.5 },
    };
  }
  if (op === "in" || op === "notIn") {
    return {
      condition: { key, op, value: [1, 2.5, -3] },
      typed: { type: "numberRange", op, values: [1, 2.5, -3] },
    };
  }
  const bound = op === "lt" || op === "lte" ? "max" : "min";
  return {
    condition: { key, op, value: 1000 },
    typed: { type: "numberRange", op, [bound]: 1000 },
  };
}

function dateCase(op: (typeof DATE_OPS)[number]): FilterCase {
  const key = "hiredAt";
  switch (op) {
    case "between":
      return {
        condition: { key, op, value: ["2024-01-01", "2024-12-31T18:30:00Z"] },
        typed: {
          type: "dateRange",
          op,
          from: "2024-01-01",
          to: "2024-12-31T18:30:00Z",
        },
      };
    case "relative":
      return {
        condition: { key, op, value: "last:7" },
        typed: { type: "dateRange", op, relative: "last:7" },
      };
    case "empty":
      return {
        condition: { key, op },
        typed: { type: "dateRange", op },
      };
    case "before":
    case "lte":
      return {
        condition: { key, op, value: "2024-06-30" },
        typed: { type: "dateRange", op, to: "2024-06-30" },
      };
    default:
      return {
        condition: { key, op, value: "2024-06-30" },
        typed: { type: "dateRange", op, from: "2024-06-30" },
      };
  }
}

/** Every operator of every filter type the table can hold. */
const FILTER_CASES: readonly FilterCase[] = [
  ...textCases,
  {
    condition: { key: "status", op: "eq", value: "closed, won" },
    typed: { type: "select", op: "eq", value: "closed, won" },
  },
  {
    condition: { key: "team", op: "in", value: ["Core", "R&D", "Sales, EMEA"] },
    typed: {
      type: "multiSelect",
      op: "in",
      values: ["Core", "R&D", "Sales, EMEA"],
    },
  },
  {
    condition: { key: "tags", op: "in", value: ["urgent", "50% off"] },
    typed: { type: "checklist", op: "in", values: ["urgent", "50% off"] },
  },
  {
    condition: { key: "active", op: "eq", value: true },
    typed: { type: "boolean", op: "eq", value: true },
  },
  {
    condition: { key: "active", op: "eq", value: false },
    typed: { type: "boolean", op: "eq", value: false },
  },
  ...NUMBER_OPS.map(numberCase),
  ...DATE_OPS.map(dateCase),
  {
    condition: { key: "score", op: "exactly", value: "4" },
    typed: {
      type: "custom",
      filterType: "stars",
      op: "exactly",
      value: "4",
    },
  },
];

const caseName = ({ condition }: FilterCase) =>
  `${defOf(condition.key).type} ${condition.op} ${JSON.stringify(condition.value ?? null)}`;

describe("every filter the table writes reads back as the same filter", () => {
  for (const filterCase of FILTER_CASES) {
    it(caseName(filterCase), () => {
      const { condition, typed } = filterCase;
      const extra = extraFor(condition);
      const read = roundTrip(
        (store) => {
          store.setExtras(extra);
        },
        { filterKeys: Object.keys(extra) }
      );

      expect(read["declared filters"]?.typedFilters).toEqual({
        [condition.key]: typed,
      });
      for (const query of Object.values(read)) {
        expect(query.rejected).toEqual([]);
      }
    });
  }
});

describe("every filter tree the table writes reads back as the same tree", () => {
  for (const filterCase of FILTER_CASES) {
    it(caseName(filterCase), () => {
      const tree: QueryFilterGroup = {
        combinator: "or",
        conditions: [
          filterCase.condition,
          {
            combinator: "and",
            conditions: [{ key: "name", op: "contains", value: "x" }],
          },
        ],
      };
      const read = roundTrip((store) => {
        store.setFilterTree(tree);
      });

      for (const query of Object.values(read)) {
        expect(query.filterTree).toEqual(tree);
        expect(query.rejected).toEqual([]);
      }
    });
  }
});

describe("paging, search, sort and grouping read back as the table wrote them", () => {
  /** What every level answers for one state, besides its filters. */
  const cases: readonly {
    readonly name: string;
    readonly act: (store: TableViewStore) => void;
    readonly expected: Partial<ServerTableQuery>;
  }[] = [
    {
      name: "a page",
      act: (store) => store.setPage(3),
      expected: { page: 3, limit: 25, offset: 50 },
    },
    {
      name: "a page size, then a page",
      act: (store) => {
        store.setLimit(10);
        store.setPage(4);
      },
      expected: { page: 4, limit: 10, offset: 30 },
    },
    {
      name: "the largest page size the table allows",
      act: (store) => store.setLimit(MAX_LIMIT),
      expected: { page: 1, limit: MAX_LIMIT, offset: 0 },
    },
    {
      name: "a search",
      act: (store) => store.setSearch("  Ada & co, 100% "),
      expected: { search: "Ada & co, 100%" },
    },
    {
      name: "a single sort",
      act: (store) => store.setSort("team:lead, ops", "desc"),
      expected: { sort: [{ key: "team:lead, ops", dir: "desc" }] },
    },
    {
      name: "a sort chain",
      act: (store) => {
        store.toggleSortLevel("name");
        store.toggleSortLevel("team:lead, ops");
        store.toggleSortLevel("team:lead, ops");
        store.toggleSortLevel("100% done");
      },
      expected: {
        sort: [
          { key: "name", dir: "asc" },
          { key: "team:lead, ops", dir: "desc" },
          { key: "100% done", dir: "asc" },
        ],
      },
    },
    {
      name: "one grouping key",
      act: (store) => store.setGroupBy("team"),
      expected: { groupBy: "team", groupByKeys: ["team"] },
    },
    {
      name: "nested grouping",
      act: (store) => store.setGroupBy("team,status"),
      expected: { groupByKeys: ["team", "status"] },
    },
  ];

  for (const { name, act, expected } of cases) {
    it(name, () => {
      for (const query of Object.values(roundTrip(act))) {
        expect(query).toMatchObject(expected);
        expect(query.rejected).toEqual([]);
      }
    });
  }
});

describe("group aggregation reads back as the table wrote it", () => {
  it("keeps built-in, host-defined and removed aggregates per column", () => {
    const overrides: GroupAggregateOverrides = {
      budget: "sum",
      score: "stats:median, p90",
      team: "none",
    };
    const read = roundTrip((store) => {
      store.setGroupBy("team");
      store.setGroupAggregateOverrides(overrides);
    });

    for (const query of Object.values(read)) {
      expect(query.groupAggregates).toEqual(overrides);
      expect(query.rejected).toEqual([]);
    }
  });
});

describe("the pivot reads back as the table wrote it", () => {
  it("keeps the axes, the measures, the switches and the folded groups", () => {
    const state: PivotUrlState = {
      config: {
        rows: ["team", "status"],
        columns: ["hiredAt"],
        measures: [
          { key: "budget", agg: "sum" },
          { key: "score", agg: "avg" },
        ],
        subtotals: false,
        grandTotals: false,
      },
      collapsed: ["Core", "R&D, EMEA"],
    };
    const adapter = createMemoryAdapter();
    const pivot = createUrlSliceStore({ adapter }, pivotSlice, {});
    pivot.set(state);
    pivot.flush();

    for (const schema of Object.values(levels())) {
      const query = serverRead(adapter, schema);
      expect(query.pivot).toEqual(state.config);
      expect(query.pivotCollapsed).toEqual(state.collapsed);
      expect(query.rejected).toEqual([]);
    }
  });
});

describe("a cleared default reads back as nothing", () => {
  it("drops a cleared search and a cleared filter", () => {
    const { adapter, store } = tableStore(undefined, {
      ...VIEW_CONFIG,
      defaults: { search: "seed", extra: { status: "open" } },
    });
    store.setSearch("");
    store.setExtra("status", undefined);

    const query = serverRead(adapter, levels()["declared filters"]!);
    expect(query.search).toBeUndefined();
    expect(query.typedFilters).toEqual({});
    expect(query.filters).toEqual({});
    expect(query.rejected).toEqual([]);
  });
});

describe("a namespaced table reads back from its own namespace", () => {
  it("reads every part of the state under the table's urlKey", () => {
    const urlKey = "people";
    const tree: QueryFilterGroup = {
      combinator: "and",
      conditions: [{ key: "active", op: "eq", value: true }],
    };
    const budget = extraFor({ key: "budget", op: "between", value: [1, 2] });
    const read = roundTrip(
      (store) => {
        store.setLimit(50);
        store.setSearch("ada");
        store.toggleSortLevel("name");
        store.setGroupBy("team");
        store.setGroupAggregateOverrides({ budget: "max" });
        store.setExtras(budget);
        store.setFilterTree(tree);
        store.setPage(2);
      },
      { urlKey, filterKeys: Object.keys(budget) }
    );

    for (const query of Object.values(read)) {
      expect(query).toMatchObject({
        page: 2,
        limit: 50,
        offset: 50,
        search: "ada",
        sort: [{ key: "name", dir: "asc" }],
        groupBy: "team",
        groupByKeys: ["team"],
        groupAggregates: { budget: "max" },
        filterTree: tree,
        rejected: [],
      });
    }
    expect(read["declared filters"]?.typedFilters).toEqual({
      budget: { type: "numberRange", op: "between", min: 1, max: 2 },
    });
  });
});
