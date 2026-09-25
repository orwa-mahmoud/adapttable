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
 * Two rules hold it. Every awaited boundary re-authorizes against the revision
 * the action was admitted at, so a foreign change arriving before the handler
 * is REFUSED there rather than reaching the result. And the result reports the
 * revision this action's own call to `apply` settled at, so a change landing
 * after that call is left for whoever made it: the next command meets it as a
 * mismatch to re-read instead of inheriting it.
 *
 * Both halves matter. A view setter is not a governed write, so a rule keyed on
 * "did this invoke a write" reports the revision from before its own change and
 * stalls every filter-then-sort turn — which the last cases here hold open.
 */
import type { AgentProgress } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentObservation,
} from "./types";

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

describe("a change that lands after this action's own call", () => {
  /**
   * The window the boundary checks cannot see into: the host's handler has
   * already been let through, its own call to `apply` has settled, and it is
   * still awaiting something of its own when somebody else writes.
   */
  function slowCapability(afterOwnCall: () => void): AgentCapabilityDefinition {
    return {
      key: "demo.search",
      summary: "Search through the host, then wait for its receipt.",
      guide: {
        guide: "Set the search, then await the host's own receipt.",
        input: {
          type: "object",
          additionalProperties: false,
          properties: { query: { type: "string" } },
          required: ["query"],
        },
        output: {
          type: "object",
          additionalProperties: false,
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
        },
      },
      kind: "view",
      isEnabled: () => true,
      execute: async (context, args) => {
        context.apply.setSearch?.((args as { query: string }).query);
        // The handler's own work, still in flight.
        await Promise.resolve();
        afterOwnCall();
        return { ok: true };
      },
    };
  }

  it("reports the revision its own call settled at, not the one that followed", async () => {
    const table = movableTable();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        setSearch: () => {
          table.elsewhereWrites();
        },
      }),
      capabilities: [slowCapability(() => table.elsewhereWrites())],
    });

    const result = await session.execute(
      "demo.search",
      { query: "ada" },
      1,
      "slow-1"
    );

    expect(result.ok).toBe(true);
    // Its own call left the table at 2. The table is at 3, and the third
    // revision belongs to whoever wrote it.
    expect(result.revision).toBe(2);
    expect(table.current()).toBe(3);
  });

  it("leaves the next command to meet that change rather than inherit it", async () => {
    const table = movableTable();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        setSearch: () => {
          table.elsewhereWrites();
        },
      }),
      capabilities: [slowCapability(() => table.elsewhereWrites())],
    });

    const first = await session.execute(
      "demo.search",
      { query: "ada" },
      1,
      "slow-2"
    );
    const next = await session.execute(
      "view.setSort",
      { key: "name", dir: "asc" },
      first.revision,
      "slow-3"
    );

    expect(next.ok).toBe(false);
    expect(next.error?.code).toBe("revision-mismatch");
  });

  it("claims nothing when the action applied nothing", async () => {
    const table = movableTable();
    const session = createAgentSession({
      observe: table.observe,
      apply: apply(),
      capabilities: [
        {
          key: "demo.idle",
          summary: "Await the host and change nothing.",
          guide: {
            guide: "Await the host and change nothing.",
            input: { type: "object", additionalProperties: false },
            output: {
              type: "object",
              additionalProperties: false,
              properties: { ok: { type: "boolean" } },
              required: ["ok"],
            },
          },
          kind: "read",
          isEnabled: () => true,
          execute: async () => {
            await Promise.resolve();
            table.elsewhereWrites();
            return { ok: true };
          },
        },
      ],
    });

    const result = await session.execute("demo.idle", {}, 1, "idle-1");

    expect(result.ok).toBe(true);
    expect(result.revision).toBe(1);
  });
});

describe("what a long call says while it is still going", () => {
  /** A capability that reports its way through a fixed number of rows. */
  function slowWrite(rows: number): AgentCapabilityDefinition {
    return {
      key: "demo.sweep",
      summary: "Work through the rows, saying how far it has got.",
      guide: {
        guide: "Work through the rows.",
        input: { type: "object", additionalProperties: false },
        output: {
          type: "object",
          additionalProperties: false,
          properties: { swept: { type: "integer" } },
          required: ["swept"],
        },
      },
      kind: "read",
      isEnabled: () => true,
      execute: async (context) => {
        for (let done = 1; done <= rows; done += 1) {
          await Promise.resolve();
          context.reportProgress?.({ done, total: rows, label: "rows" });
        }
        return { swept: rows };
      },
    };
  }

  it("reports each step, named by the call that made it", async () => {
    const table = movableTable();
    const seen: (AgentProgress | null)[] = [];
    const session = createAgentSession({
      observe: table.observe,
      apply: apply(),
      capabilities: [slowWrite(3)],
      onProgress: (report) => seen.push(report),
    });

    await session.execute("demo.sweep", {}, 1, "sweep-1");

    expect(seen.slice(0, 3)).toEqual([
      {
        capability: "demo.sweep",
        idempotencyKey: "sweep-1",
        done: 1,
        total: 3,
        label: "rows",
      },
      {
        capability: "demo.sweep",
        idempotencyKey: "sweep-1",
        done: 2,
        total: 3,
        label: "rows",
      },
      {
        capability: "demo.sweep",
        idempotencyKey: "sweep-1",
        done: 3,
        total: 3,
        label: "rows",
      },
    ]);
  });

  it("closes what it opened, so nothing is left standing beside a finished call", async () => {
    const table = movableTable();
    const seen: (AgentProgress | null)[] = [];
    const session = createAgentSession({
      observe: table.observe,
      apply: apply(),
      capabilities: [slowWrite(2)],
      onProgress: (report) => seen.push(report),
    });

    await session.execute("demo.sweep", {}, 1, "sweep-2");

    expect(seen.at(-1)).toBeNull();
    // Once, and only by a call that reported something.
    expect(seen.filter((entry) => entry === null)).toHaveLength(1);
  });

  it("says nothing for a call that reported nothing", async () => {
    const table = movableTable();
    const seen: (AgentProgress | null)[] = [];
    const session = createAgentSession({
      observe: table.observe,
      apply: apply({
        setSearch: () => {
          table.elsewhereWrites();
        },
      }),
      onProgress: (report) => seen.push(report),
    });

    await session.execute("view.setSearch", { query: "ada" }, 1, "quiet-1");

    expect(seen).toEqual([]);
  });

  it("is not a result: a call that reported and then failed still fails", async () => {
    const table = movableTable();
    const seen: (AgentProgress | null)[] = [];
    const session = createAgentSession({
      observe: table.observe,
      apply: apply(),
      capabilities: [
        {
          key: "demo.halfway",
          summary: "Report, then give up.",
          guide: {
            guide: "Report, then give up.",
            input: { type: "object", additionalProperties: false },
            output: { type: "object", additionalProperties: false },
          },
          kind: "read",
          isEnabled: () => true,
          execute: (context) => {
            context.reportProgress?.({ done: 4, total: 10 });
            throw new Error("the host gave up");
          },
        },
      ],
      onProgress: (report) => seen.push(report),
    });

    const result = await session.execute("demo.halfway", {}, 1, "half-1");

    expect(result.ok).toBe(false);
    expect(seen.at(0)).toMatchObject({ done: 4, total: 10 });
    // And it is still closed, so a surface is not left showing 4 of 10 beside
    // a call that failed.
    expect(seen.at(-1)).toBeNull();
  });
});
