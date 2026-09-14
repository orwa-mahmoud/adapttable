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
import { createAgentSession } from "./session";
import type { AgentObservation, JsonSchema } from "./types";

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
      setSort: vi.fn(),
      setGroupBy: vi.fn(),
      setFilters: vi.fn(),
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

  it("leaves the schema alone on a table that published no columns", () => {
    // An empty enum would say no column is usable, which is the opposite of
    // what an absent column list means.
    const input = session({ columns: [] }).describe("view.setSort").input;
    expect(prop(input, "key")?.enum).toBeUndefined();
  });
});
