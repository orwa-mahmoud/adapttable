/**
 * Whose change is it — and what the session already guarantees.
 *
 * An action awaits the host: resolving a row, reading a before-value, waiting
 * for a reader to answer, and finally the write callback itself. Anything can
 * land on the table across any of those, and the HTTP turn takes a result's
 * revision as the baseline for the next command in the same turn — so a
 * baseline carrying a foreign change would be a stale-write protection that
 * silently passes.
 *
 * It does not happen, and these say why: every awaited boundary re-authorizes
 * against the revision the action was admitted at, so a foreign change is
 * REFUSED there rather than reaching the result to be absorbed. The result then
 * reports where the table is, which for a view setter or a write is that
 * action's own effect — and the next command in the turn depends on it being
 * reported.
 *
 * Written after a change that reported the admitted revision instead broke
 * exactly that: a view setter is not a governed write, so it would have
 * reported the revision from before its own change and stalled every
 * filter-then-sort turn.
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

describe("a foreign change is refused at the boundary, not absorbed", () => {
  it("refuses a read whose callback returned onto a table that moved", async () => {
    const table = movableTable();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        readRows: async () => {
          // Another writer lands mid-await. The rows in hand describe a table
          // that no longer exists, and disclosing them would be answering
          // about a view nobody authorized.
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

    expect(read.ok).toBe(false);
    expect(read.error?.code).toBe("revision-mismatch");
    // Nothing reached the result to be mistaken for this action's own progress.
    expect(table.current()).toBe(2);
  });

  it("refuses a write whose plan was built against a table that moved", async () => {
    const table = movableTable();
    const editCells = vi.fn();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        editCells,
        // Planning a cell write awaits the host for the before-value.
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
    // Refusing costs a retry; writing does not come back.
    expect(editCells).not.toHaveBeenCalled();
  });
});

describe("a result reports the effect its own action had", () => {
  it("carries where a write left the table", async () => {
    const table = movableTable();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        editCells: () => {
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
    expect(write.revision).toBe(2);
  });

  it("carries where a view setter left the table, which is not a governed write", async () => {
    // The case that matters for an ordinary turn. `view.setSearch` changes the
    // table without going through the governed-write path, so a rule keyed on
    // "did this invoke a write" reports the revision from BEFORE its own
    // change — and the next action in the turn inherits a baseline the table
    // has already left, and is refused.
    const table = movableTable();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        setSearch: () => {
          table.elsewhereWrites();
        },
      }),
    });

    const search = await session.execute(
      "view.setSearch",
      { query: "ada" },
      1,
      "s-1"
    );

    expect(search.ok).toBe(true);
    expect(search.revision).toBe(2);

    // And the turn continues on it, rather than stalling on a stale baseline.
    const sort = await session.execute(
      "view.setSort",
      { key: "name", dir: "asc" },
      search.revision,
      "s-2"
    );
    expect(sort.ok).toBe(true);
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
