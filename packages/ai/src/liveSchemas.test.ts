/**
 * The values a table accepts belong in its schema, not in a sentence about
 * its schema.
 *
 * A closed set carried as prose asks a caller to read English and then build
 * a free-form object correctly; carried as `enum` it is something a caller
 * cannot get wrong. The session still resolves and refuses exactly as before
 * — this only stops the guess.
 */
import { describe, expect, it, vi } from "vitest";

import { agentFiltersFromDefs } from "./filterCatalog";
import {
  aggregationSetSchema,
  filterBagSchema,
  withAggregationBag,
  withEnum,
  withFilterBag,
} from "./liveSchemas";
import { createAgentSession } from "./session";
import type { AgentFilter, AgentObservation, JsonSchema } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: "client" as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

const SALARY = {
  key: "salary",
  type: "numberRange" as const,
  label: "Salary",
};

const TEAM = {
  key: "team",
  type: "multiSelect" as const,
  label: "Team",
  options: ["Core", "Platform", "Data"].map((team) => ({
    value: team,
    label: team,
  })),
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "staff",
    viewRevision: 1,
    featureIds: ["filters", "grouping-panel"],
    columns: [
      {
        id: "person",
        label: "Person",
        type: "string",
        readable: true,
        writable: true,
        sortable: true,
      },
      {
        id: "notes",
        label: "Notes",
        type: "string",
        readable: true,
        writable: false,
        sortable: false,
        pinnable: false,
      },
    ],
    source: PAGE_ONLY,
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: true,
    hasExport: false,
    hasEdit: true,
    hasReorder: false,
    hasColumnPinning: true,
    availableFilters: agentFiltersFromDefs([TEAM, SALARY], undefined),
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    readMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

function session(patch: Partial<AgentObservation> = {}) {
  return createAgentSession({
    observe: () => observation(patch),
    apply: {
      setPage: vi.fn(),
      setSort: vi.fn(),
      setGroupBy: vi.fn(),
      setFilters: vi.fn(),
      setAggregations: vi.fn(),
      pinColumn: vi.fn(),
    },
  });
}

const prop = (schema: JsonSchema | undefined, name: string) =>
  schema?.properties?.[name];

describe("a filter's own values reach its schema", () => {
  it("publishes the option list as an enum, not only as prose", () => {
    const input = session().describe("view.setFilters").input;
    const bag = prop(input, "filters");
    expect(bag?.properties?.team?.items?.enum).toEqual([
      "Core",
      "Platform",
      "Data",
    ]);
    // The prose stays — a guide a reader can read is still worth having.
    expect(session().describe("view.setFilters").guide).toContain("Platform");
  });

  it("publishes a filter's operators on its own operator key", () => {
    // A multiSelect exposes no operator key; a range does, and that is the
    // one a caller can get wrong.
    const bag = prop(session().describe("view.setFilters").input, "filters");
    expect(bag?.properties?.teamOp).toBeUndefined();
    expect(bag?.properties?.salaryOp?.enum).toContain("between");
  });

  it("leaves the bag open, because a host's own keys are not ours to refuse", () => {
    const bag = prop(session().describe("view.setFilters").input, "filters");
    expect(bag?.additionalProperties).toBe(true);
  });

  it("says nothing where the table published no catalog", () => {
    const input = session({ availableFilters: undefined }).describe(
      "view.setFilters"
    ).input;
    expect(prop(input, "filters")?.properties).toBeUndefined();
  });
});

describe("what it leaves alone", () => {
  it("keeps a property the authored schema already described", () => {
    // `withEnum` narrows what a property accepts; it does not replace what
    // the author said about its type.
    const input = session().describe("view.pinColumn").input;
    expect(input?.properties?.key?.type).toBeDefined();
    expect(input?.properties?.key?.enum).toEqual(["person"]);
  });

  it("offers no null where the capability takes none", () => {
    // Pinning names a column; only sort and grouping accept null to clear.
    expect(
      session().describe("view.pinColumn").input?.properties?.key?.enum
    ).not.toContain(null);
  });

  it("says nothing about a capability that names no column", () => {
    // Reading rows takes a query, not a column choice, and a capability this
    // does not specialise comes back exactly as its author wrote it.
    const live = session();
    expect(live.describe("rows.read").input).toEqual(
      live.describe("rows.read").input
    );
    expect(prop(live.describe("rows.read").input, "key")).toBeUndefined();
  });

  it("keeps the draft the authored schema declared", () => {
    const input = session().describe("view.setFilters").input;
    expect(input?.$schema).toBeTruthy();
  });
});

describe("a column choice reaches the schema that names one", () => {
  it("offers the sortable columns to sort, and null to clear", () => {
    const input = session().describe("view.setSort").input;
    // `notes` is not sortable, so it is not on offer.
    expect(prop(input, "key")?.enum).toEqual(["person", null]);
  });

  it("offers the pinnable columns to pin", () => {
    const input = session().describe("view.pinColumn").input;
    expect(prop(input, "key")?.enum).toEqual(["person"]);
  });

  it("offers every column to group by", () => {
    const input = session().describe("view.setGroupBy").input;
    expect(prop(input, "key")?.enum).toEqual(["person", "notes", null]);
  });

  it("publishes the page sizes the table offers on limit", () => {
    const live = session({
      pagination: {
        page: 1,
        pageSize: 5,
        pageSizeOptions: [5, 10, 25, 50, 100],
        hasPrevious: false,
        canJump: true,
      },
    });
    expect(prop(live.describe("view.setPage").input, "limit")?.enum).toEqual([
      5, 10, 25, 50, 100,
    ]);
  });

  it("publishes each column's operation ids on set, not a free string", () => {
    const live = session({
      featureIds: ["filters", "grouping-panel"],
      source: { ...PAGE_ONLY, grouping: "client" },
      aggregations: {
        columns: [
          {
            id: "salary",
            operations: [
              { id: "sum", label: "Sum" },
              { id: "avg", label: "Average" },
            ],
          },
        ],
        active: [],
      },
    });
    const set = prop(live.describe("view.setAggregations").input, "set");
    expect(set?.properties?.salary?.enum).toEqual(["sum", "avg"]);
    expect(set?.additionalProperties).toBe(false);
    expect(
      prop(live.describe("view.setAggregations").input, "remove")?.items?.enum
    ).toEqual(["salary"]);
  });

  it("leaves the schema alone on a table that published no columns", () => {
    // An empty enum would say no column is usable, which is the opposite of
    // what an absent column list means.
    const input = session({ columns: [] }).describe("view.setSort").input;
    expect(prop(input, "key")?.enum).toBeUndefined();
  });
});

describe("the live schema helpers, called on their own", () => {
  const authored: JsonSchema = {
    type: "object",
    properties: { set: { type: "object" }, remove: { type: "array" } },
  };

  it("leaves an authored schema alone when there is nothing to close", () => {
    expect(withEnum(undefined, "limit", [5, 10])).toBeUndefined();
    expect(withEnum(authored, "limit", [])).toBe(authored);
    expect(aggregationSetSchema(undefined)).toBeUndefined();
    expect(aggregationSetSchema([])).toBeUndefined();
    expect(
      aggregationSetSchema([{ id: "salary", operations: [] }])
    ).toBeUndefined();
    expect(
      withAggregationBag(undefined, [{ id: "salary", operations: [] }])
    ).toBeUndefined();
    expect(withAggregationBag(authored, undefined)).toBe(authored);
    expect(withFilterBag(undefined, [])).toBeUndefined();
    expect(withFilterBag(authored, undefined)).toBe(authored);
    expect(filterBagSchema(undefined)).toBeUndefined();
  });

  it("closes set and remove on the columns that actually aggregate", () => {
    const next = withAggregationBag(authored, [
      {
        id: "salary",
        operations: [
          { id: "sum", label: "Sum" },
          { id: "avg", label: "Average" },
        ],
      },
    ]);
    expect(next?.properties?.set?.properties?.salary?.enum).toEqual([
      "sum",
      "avg",
    ]);
    expect(next?.properties?.remove?.items?.enum).toEqual(["salary"]);
    expect(next?.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
  });

  it("keeps a filter property open when the catalog lists no options", () => {
    const catalog: readonly AgentFilter[] = [
      {
        key: "q",
        label: "Search",
        type: "text",
        operators: ["contains"],
        defaultOperator: "contains",
        valueKeys: ["q", "qMin"],
      },
    ];
    const bag = filterBagSchema(catalog);
    expect(bag?.properties?.q).toEqual({});
    expect(bag?.properties?.qMin).toEqual({});
    const next = withFilterBag({ type: "object", properties: {} }, catalog);
    expect(next?.properties?.filters).toEqual(bag);
    expect(next?.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
  });
});
