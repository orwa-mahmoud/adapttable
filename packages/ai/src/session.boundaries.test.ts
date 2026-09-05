import type { TableSourceCapabilities } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type { AgentColumn, AgentObservation, RowWindow } from "./types";

const COLUMNS: AgentColumn[] = [
  {
    id: "name",
    label: "Name",
    type: "string",
    readable: true,
    writable: true,
    sortable: true,
  },
  {
    id: "salary",
    label: "Salary",
    type: "number",
    readable: true,
    writable: true,
    sortable: true,
  },
  {
    id: "ssn",
    label: "SSN",
    type: "string",
    readable: false,
    writable: false,
    sortable: false,
  },
];

function source(patch: Partial<TableSourceCapabilities> = {}) {
  return {
    fullDataset: false,
    grouping: false as const,
    selectAcrossPages: false,
    exportScope: "page" as const,
    totalCount: "loaded" as const,
    ...patch,
  };
}

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: ["editing"],
    columns: COLUMNS,
    source: source(),
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
    pageMax: 50,
    readMax: 10,
    rowAddressScope: "visible",
    ...patch,
  };
}

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    rowKey: `r${String(index + 1)}`,
    cells: {
      name: `name-${String(index + 1)}`,
      salary: 100 + index,
      ssn: "hidden",
    },
  }));
}

describe("rows.read boundaries on returned data", () => {
  it("clamps a callback that returns more rows than the requested limit", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {
        readRows: () =>
          Promise.resolve({
            offset: 0,
            limit: 500,
            redacted: [],
            rows: rows(50),
          } satisfies RowWindow),
      },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 3 },
      1,
      "over"
    );
    const window = result.result as RowWindow;
    expect(window.rows).toHaveLength(3);
    expect(window.limit).toBe(3);
    expect(window.offset).toBe(0);
  });

  it("clamps the requested limit to readMax", async () => {
    const seen: number[] = [];
    const session = createAgentSession({
      observe: () => observation({ readMax: 4 }),
      apply: {
        readRows: (query) => {
          seen.push(query.limit);
          return Promise.resolve({
            offset: 0,
            limit: query.limit,
            redacted: [],
            rows: rows(40),
          } satisfies RowWindow);
        },
      },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 25 },
      1,
      "max"
    );
    expect(seen).toEqual([4]);
    expect((result.result as RowWindow).rows).toHaveLength(4);
  });

  it("omits a cell the callback returned for an undeclared column", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {
        readRows: () =>
          Promise.resolve({
            offset: 0,
            limit: 2,
            redacted: [],
            rows: [
              {
                rowKey: "r1",
                cells: {
                  name: "Ada",
                  salary: 100,
                  ssn: "123-45-6789",
                  internalNote: "do not disclose",
                },
              },
            ],
          } satisfies RowWindow),
      },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 2 },
      1,
      "undeclared"
    );
    const window = result.result as RowWindow;
    expect(window.rows[0]?.cells).toEqual({ name: "Ada", salary: 100 });
    expect(window.redacted).toContain("ssn");
  });

  it("omits a column removed from the declaration during the awaited read", async () => {
    let columns = COLUMNS;
    const session = createAgentSession({
      observe: () => observation({ columns }),
      apply: {
        readRows: () => {
          columns = COLUMNS.filter((column) => column.id !== "salary");
          return Promise.resolve({
            offset: 0,
            limit: 2,
            redacted: [],
            rows: rows(2),
          } satisfies RowWindow);
        },
      },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 2 },
      1,
      "removed"
    );
    const window = result.result as RowWindow;
    expect(window.rows[0]?.cells).toEqual({ name: "name-1" });
  });

  it("honours a readMax tightened during the awaited read", async () => {
    let readMax = 10;
    const session = createAgentSession({
      observe: () => observation({ readMax }),
      apply: {
        readRows: () => {
          readMax = 2;
          return Promise.resolve({
            offset: 0,
            limit: 10,
            redacted: [],
            rows: rows(10),
          } satisfies RowWindow);
        },
      },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 10 },
      1,
      "tightened"
    );
    const window = result.result as RowWindow;
    expect(window.rows).toHaveLength(2);
    expect(window.limit).toBe(2);
  });

  it("denies disclosure when the scope is revoked during the awaited read", async () => {
    let full = true;
    const session = createAgentSession({
      observe: () => observation({ source: source({ fullDataset: full }) }),
      apply: {
        readRows: () => {
          full = false;
          return Promise.resolve({
            offset: 0,
            limit: 2,
            redacted: [],
            rows: rows(2),
          } satisfies RowWindow);
        },
      },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 2, scope: "full" },
      1,
      "revoked-scope"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("scope-denied");
    expect(result.result).toBeUndefined();
  });

  it("denies disclosure when the read capability is withdrawn during the awaited read", async () => {
    let columns = COLUMNS;
    const session = createAgentSession({
      observe: () => observation({ columns }),
      apply: {
        readRows: () => {
          columns = [];
          return Promise.resolve({
            offset: 0,
            limit: 2,
            redacted: [],
            rows: rows(2),
          } satisfies RowWindow);
        },
      },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 2 },
      1,
      "withdrawn"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("not-wired");
    expect(result.result).toBeUndefined();
  });

  it("denies disclosure when the revision moves during the awaited read", async () => {
    let revision = 1;
    const session = createAgentSession({
      observe: () => observation({ viewRevision: revision }),
      apply: {
        readRows: () => {
          revision = 2;
          return Promise.resolve({
            offset: 0,
            limit: 2,
            redacted: [],
            rows: rows(2),
          } satisfies RowWindow);
        },
      },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 2 },
      1,
      "moved"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("revision-mismatch");
  });
});

describe("rows.read boundaries on replay", () => {
  function replaySession(read: () => AgentObservation) {
    return createAgentSession({
      observe: read,
      apply: {
        readRows: () =>
          Promise.resolve({
            offset: 0,
            limit: 4,
            redacted: [],
            rows: rows(4),
          } satisfies RowWindow),
      },
    });
  }

  it("drops a column removed after the first read", async () => {
    let columns = COLUMNS;
    const session = replaySession(() => observation({ columns }));
    const first = await session.execute(
      "rows.read",
      { offset: 0, limit: 4 },
      1,
      "replay-cols"
    );
    expect((first.result as RowWindow).rows[0]?.cells).toHaveProperty("salary");
    columns = COLUMNS.filter((column) => column.id !== "salary");
    const again = await session.execute(
      "rows.read",
      { offset: 0, limit: 4 },
      1,
      "replay-cols"
    );
    expect((again.result as RowWindow).rows[0]?.cells).toEqual({
      name: "name-1",
    });
  });

  it("honours a readMax tightened after the first read", async () => {
    let readMax = 10;
    const session = replaySession(() => observation({ readMax }));
    await session.execute(
      "rows.read",
      { offset: 0, limit: 4 },
      1,
      "replay-max"
    );
    readMax = 1;
    const again = await session.execute(
      "rows.read",
      { offset: 0, limit: 4 },
      1,
      "replay-max"
    );
    const window = again.result as RowWindow;
    expect(window.rows).toHaveLength(1);
    expect(window.limit).toBe(1);
  });

  it("denies a replay whose scope was revoked", async () => {
    let full = true;
    const session = replaySession(() =>
      observation({ source: source({ fullDataset: full }) })
    );
    const first = await session.execute(
      "rows.read",
      { offset: 0, limit: 4, scope: "full" },
      1,
      "replay-scope"
    );
    expect(first.ok).toBe(true);
    full = false;
    const again = await session.execute(
      "rows.read",
      { offset: 0, limit: 4, scope: "full" },
      1,
      "replay-scope"
    );
    expect(again.ok).toBe(false);
    expect(again.error?.code).toBe("scope-denied");
    expect(again.result).toBeUndefined();
  });

  it("denies a replay after the read capability is disabled", async () => {
    let columns = COLUMNS;
    const session = replaySession(() => observation({ columns }));
    await session.execute(
      "rows.read",
      { offset: 0, limit: 4 },
      1,
      "replay-off"
    );
    columns = [];
    const again = await session.execute(
      "rows.read",
      { offset: 0, limit: 4 },
      1,
      "replay-off"
    );
    expect(again.ok).toBe(false);
    expect(again.error?.code).toBe("not-wired");
    expect(again.result).toBeUndefined();
  });
});

describe("replay cache lifecycle", () => {
  it("never runs an accepted mutation again after its result is evicted", async () => {
    const editCells = vi.fn().mockResolvedValue({ saved: 1 });
    const session = createAgentSession({
      observe: () => observation(),
      apply: {
        editCells,
        resolveRow: (ref) =>
          "rowKey" in ref
            ? { rowKey: ref.rowKey, scope: "visible" as const }
            : { rowKey: "r1", scope: "visible" as const },
        readRows: () =>
          Promise.resolve({
            offset: 0,
            limit: 4,
            redacted: [],
            rows: rows(4),
          } satisfies RowWindow),
      },
      replayCacheSize: 2,
    });
    const args = { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] };
    const write = await session.execute("edit.cells", args, 1, "mutation");
    expect(write.ok).toBe(true);
    expect(editCells).toHaveBeenCalledTimes(1);

    // Push the mutation's result out of the bounded cache.
    await session.execute("rows.read", { offset: 0, limit: 1 }, 1, "read-a");
    await session.execute("rows.read", { offset: 0, limit: 1 }, 1, "read-b");
    await session.execute("rows.read", { offset: 0, limit: 1 }, 1, "read-c");

    const replayed = await session.execute("edit.cells", args, 1, "mutation");
    expect(replayed.ok).toBe(false);
    expect(replayed.error?.code).toBe("replay-expired");
    expect(editCells).toHaveBeenCalledTimes(1);
  });

  it("reports a payload mismatch on a retired mutation id", async () => {
    const editCells = vi.fn().mockResolvedValue({ saved: 1 });
    const session = createAgentSession({
      observe: () => observation(),
      apply: {
        editCells,
        resolveRow: (ref) =>
          "rowKey" in ref
            ? { rowKey: ref.rowKey, scope: "visible" as const }
            : { rowKey: "r1", scope: "visible" as const },
        readRows: () =>
          Promise.resolve({
            offset: 0,
            limit: 4,
            redacted: [],
            rows: rows(4),
          } satisfies RowWindow),
      },
      replayCacheSize: 1,
    });
    await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "mutation"
    );
    await session.execute("rows.read", { offset: 0, limit: 1 }, 1, "read-a");
    await session.execute("rows.read", { offset: 0, limit: 1 }, 1, "read-b");

    const mismatched = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Grace" }] },
      1,
      "mutation"
    );
    expect(mismatched.error?.code).toBe("idempotency-mismatch");
    expect(editCells).toHaveBeenCalledTimes(1);
  });
});
