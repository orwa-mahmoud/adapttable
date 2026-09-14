/**
 * A caller picks from the list this table published, so a name that differs
 * only in case has picked one — and what gets applied is the table's own
 * spelling, because that is what the host and the rows hold.
 *
 * The line this draws is between a closed set and free text. Columns,
 * directions and filter options are choices the contract offered; a search
 * string and a cell value are data, and nothing here touches them.
 */
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type { AgentApply, AgentObservation } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: "client" as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "staff",
    viewRevision: 1,
    featureIds: ["editing", "grouping-panel"],
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
        id: "salary",
        label: "Annual salary",
        type: "number",
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
      },
    ],
    source: PAGE_ONLY,
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: true,
    hasReorder: false,
    hasSelection: false,
    hasSavedViews: false,
    hasAdd: false,
    hasDelete: false,
    hasColumnPinning: true,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    readMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

function apply(patch: Partial<AgentApply> = {}): AgentApply {
  return {
    setSort: vi.fn(),
    setGroupBy: vi.fn(),
    setSearch: vi.fn(),
    pinColumn: vi.fn(),
    editCells: vi.fn(),
    readRows: vi.fn().mockResolvedValue({
      offset: 0,
      limit: 10,
      redacted: [],
      rows: [{ rowKey: "r1", cells: { person: "Priya", salary: 170 } }],
    }),
    resolveRow: vi.fn(() => ({ rowKey: "r1", scope: "visible" as const })),
    ...patch,
  };
}

function session(applied: AgentApply, patch: Partial<AgentObservation> = {}) {
  return createAgentSession({
    observe: () => observation(patch),
    apply: applied,
  });
}

describe("a column named in another case is that column", () => {
  it("sorts by the table's own id, and reports the one that landed", async () => {
    const applied = apply();
    const result = await session(applied).execute(
      "view.setSort",
      { key: "SALARY", dir: "DESC" },
      1,
      "s1"
    );
    expect(result.error).toBeUndefined();
    expect(applied.setSort).toHaveBeenCalledWith("salary", "desc");
    expect(result.result).toMatchObject({
      sort: { key: "salary", dir: "desc" },
    });
  });

  it("takes the label the caller was shown", async () => {
    const applied = apply();
    await session(applied).execute(
      "view.setSort",
      { key: "annual salary" },
      1,
      "s2"
    );
    expect(applied.setSort).toHaveBeenCalledWith("salary", undefined);
  });

  it("groups and pins by the table's own id", async () => {
    const applied = apply();
    const live = session(applied);
    await live.execute("view.setGroupBy", { key: " Person " }, 1, "g1");
    await live.execute("view.pinColumn", { key: "PERSON" }, 1, "p1");
    expect(applied.setGroupBy).toHaveBeenCalledWith("person");
    expect(applied.pinColumn).toHaveBeenCalledWith("person", undefined);
  });

  it("writes the cell the table owns, however the column was spelled", async () => {
    const applied = apply();
    const result = await session(applied).execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "Annual Salary", value: 185 }] },
      1,
      "e1"
    );
    expect(result.ok).toBe(true);
    expect(applied.editCells).toHaveBeenCalledWith([
      { rowKey: "r1", column: "salary", value: 185 },
    ]);
  });
});

describe("what it still refuses, and what it tells the caller", () => {
  it("names the columns a table has when none matches", async () => {
    const live = session(apply());
    const sorted = await live.execute(
      "view.setSort",
      { key: "ghost" },
      1,
      "s3"
    );
    expect(sorted.error?.message).toMatch(
      /unknown column "ghost"; this table offers person, salary, notes/
    );
    const pinned = await live.execute(
      "view.pinColumn",
      { key: "ghost" },
      1,
      "p2"
    );
    expect(pinned.error?.message).toMatch(/this table offers person, salary/);
  });

  it("names the writable columns when the one asked for is not", async () => {
    const edited = await session(apply()).execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "notes", value: "x" }] },
      1,
      "e2"
    );
    expect(edited.error?.code).toBe("column-not-writable");
    expect(edited.error?.message).toMatch(/this table writes person, salary/);
  });

  it("refuses a direction that is neither, naming both", async () => {
    const result = await session(apply()).execute(
      "view.setSort",
      { key: "salary", dir: "sideways" },
      1,
      "s4"
    );
    expect(result.error?.code).toBe("invalid-arguments");
    expect(result.error?.message).toMatch(/must be one of "asc", "desc"/);
  });

  it("refuses a name two columns could equally be", async () => {
    // Distinct columns that fold together are a real ambiguity: choosing one
    // for the caller would be a guess, so the table says what it has.
    const live = session(apply(), {
      columns: [
        {
          id: "total",
          label: "Total",
          type: "number",
          readable: true,
          writable: true,
          sortable: true,
        },
        {
          id: "TOTAL",
          label: "Total (gross)",
          type: "number",
          readable: true,
          writable: true,
          sortable: true,
        },
      ],
    });
    const result = await live.execute(
      "view.setSort",
      { key: "ToTaL" },
      1,
      "s5"
    );
    expect(result.error?.message).toMatch(/unknown column "ToTaL"/);
  });

  it("leaves a search string exactly as the reader wrote it", async () => {
    const applied = apply();
    await session(applied).execute(
      "view.setSearch",
      { query: "  Priya NAIR " },
      1,
      "q1"
    );
    expect(applied.setSearch).toHaveBeenCalledWith("  Priya NAIR ");
  });
});
