/**
 * Whose change is it — the window a stale-approval test does not cover.
 *
 * An action awaits the host: resolving a row, reading a before-value, waiting
 * for a reader to answer, and finally the write callback itself. Anything can
 * land on the table across any of those. The session must never report someone
 * else's change as its own, because the HTTP turn takes a result's revision as
 * the baseline for the next command in the same turn — and a baseline carrying
 * a foreign change is a stale-write protection that silently passes.
 *
 * These are the two halves the earlier provenance work left open: a result that
 * absorbed drift it did not cause, and a plan that wrote against a table that
 * had moved since it was admitted.
 */
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type { AgentApply, AgentObservation } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

const COLUMNS = [
  {
    id: "name",
    label: "Name",
    type: "string",
    readable: true,
    writable: true,
    sortable: true,
  },
];

/** A table whose revision the test moves by hand, as another writer would. */
function movableTable() {
  let revision = 1;
  const observe = (): AgentObservation => ({
    tableId: "orders",
    viewRevision: revision,
    featureIds: ["editing"],
    columns: COLUMNS,
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
    page: 1,
    limit: 10,
    search: "",
    pageMax: 5,
    readMax: 50,
    rowAddressScope: "visible",
  });
  return {
    observe,
    /** Someone else writes to the table. */
    elsewhereWrites: () => {
      revision += 1;
    },
    current: () => revision,
  };
}

function apply(patch: Partial<AgentApply> = {}): AgentApply {
  return {
    readRows: () => ({
      offset: 0,
      limit: 1,
      redacted: [],
      rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
    }),
    resolveRow: (ref) =>
      "rowKey" in ref
        ? { rowKey: ref.rowKey, scope: "visible" as const }
        : { rowKey: "r1", scope: ref.scope, position: ref.position },
    editCells: vi.fn(),
    setSearch: vi.fn(),
    setSort: vi.fn(),
    ...patch,
  };
}

describe("a result reports only what its own action produced", () => {
  it("does not absorb a change that landed while it was reading", async () => {
    const table = movableTable();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        readRows: async () => {
          // Another writer lands mid-await. This read caused none of it.
          table.elsewhereWrites();
          return Promise.resolve({
            offset: 0,
            limit: 1,
            redacted: [],
            rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
          });
        },
      }),
    });

    const read = await session.execute(
      "rows.read",
      { offset: 0, limit: 1 },
      1,
      "read-1"
    );

    expect(read.ok).toBe(true);
    // The table is at 2. This action is entitled to 1 — the revision it was
    // admitted at — because it changed nothing.
    expect(table.current()).toBe(2);
    expect(read.revision).toBe(1);
  });

  it("leaves the next command in the turn to refuse, instead of passing it a foreign baseline", async () => {
    const table = movableTable();
    const setSearch = vi.fn();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        setSearch,
        readRows: async () => {
          table.elsewhereWrites();
          return Promise.resolve({
            offset: 0,
            limit: 1,
            redacted: [],
            rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
          });
        },
      }),
    });

    const read = await session.execute(
      "rows.read",
      { offset: 0, limit: 1 },
      1,
      "read-2"
    );
    // A turn carries the previous result's revision into the next command.
    const next = await session.execute(
      "view.setSearch",
      { query: "ada" },
      read.revision,
      "search-2"
    );

    expect(next.ok).toBe(false);
    expect(next.error?.code).toBe("revision-mismatch");
    expect(setSearch).not.toHaveBeenCalled();
  });

  it("still reports where its own write left the table", async () => {
    const table = movableTable();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        editCells: () => {
          // The write itself moves the table, exactly as a host's would.
          table.elsewhereWrites();
        },
      }),
    });

    const write = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Grace" }] },
      1,
      "write-1"
    );

    expect(write.ok).toBe(true);
    // This one did cause the change, so it carries it.
    expect(write.revision).toBe(2);
  });
});

describe("a write refuses a table that moved while it was being planned", () => {
  it("never reaches the host when the change landed before the handoff", async () => {
    const table = movableTable();
    const editCells = vi.fn();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        editCells,
        // Planning a cell write awaits the host for the before-value. Another
        // writer lands there — the plan now describes a table that is gone.
        readRows: async () => {
          table.elsewhereWrites();
          return Promise.resolve({
            offset: 0,
            limit: 1,
            redacted: [],
            rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
          });
        },
      }),
    });

    const write = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Grace" }] },
      1,
      "write-2"
    );

    expect(write.ok).toBe(false);
    expect(write.error?.code).toBe("revision-mismatch");
    // The point of the check: refusing costs a retry, writing does not come back.
    expect(editCells).not.toHaveBeenCalled();
  });
});

describe("the ordering the executor depends on", () => {
  it("keeps filter before sort when a turn asks for both", async () => {
    const table = movableTable();
    const calls: string[] = [];
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        setSearch: () => {
          calls.push("search");
        },
        setSort: () => {
          calls.push("sort");
        },
      }),
    });

    await session.execute("view.setSearch", { query: "ada" }, 1, "o-1");
    await session.execute(
      "view.setSort",
      { key: "name", dir: "asc" },
      1,
      "o-2"
    );

    expect(calls).toEqual(["search", "sort"]);
  });
});
