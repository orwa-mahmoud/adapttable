import { describe, expect, it, vi } from "vitest";

import { AGENT_SCHEMA_VERSION, CAPABILITY_KEYS } from "./keys";
import { buildManifest, enabledKeys } from "./manifest";
import { createAgentSession } from "./session";
import type { AgentObservation } from "./types";
import { validateSchema } from "./validate";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: [],
    columns: [
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: false,
        sortable: true,
      },
    ],
    source: PAGE_ONLY,
    writePolicy: "allow",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

describe("enabledKeys", () => {
  it("always advertises describe keys on a minimal table", () => {
    expect(enabledKeys(observation())).toEqual([
      "columns.describe",
      "view.describe",
      "view.setPage",
      "view.setSort",
      "view.setSearch",
      "rows.read",
      "rows.resolve",
    ]);
  });

  it("adds filter, group, export, edit and reorder only when wired", () => {
    const keys = enabledKeys(
      observation({
        featureIds: [
          "filters",
          "grouping",
          "export-csv",
          "editing",
          "row-reorder",
          "saved-views",
        ],
        source: { ...PAGE_ONLY, grouping: "client", fullDataset: true },
        hasFilters: true,
        hasExport: true,
        hasEdit: true,
        hasReorder: true,
        hasSelection: true,
        hasSavedViews: true,
        hasAdd: true,
        hasDelete: true,
        hasColumnPinning: true,
        hasRowPinning: true,
        aggregations: {
          columns: [
            {
              id: "salary",
              operations: [{ id: "sum", label: "Sum" }],
            },
          ],
          active: [],
        },
      })
    );
    expect(keys).toEqual([...CAPABILITY_KEYS]);
  });

  it("keeps write capabilities off when policy is deny", () => {
    const keys = enabledKeys(
      observation({
        featureIds: ["editing", "row-reorder"],
        hasEdit: true,
        hasReorder: true,
        hasAdd: true,
        hasDelete: true,
        writePolicy: "deny",
      })
    );
    expect(keys).not.toContain("edit.cells");
    expect(keys).not.toContain("rows.reorder");
    expect(keys).not.toContain("rows.add");
    expect(keys).not.toContain("rows.delete");
  });

  it("does not advertise grouping when the source cannot group", () => {
    expect(
      enabledKeys(
        observation({
          featureIds: ["grouping"],
          source: PAGE_ONLY,
        })
      )
    ).not.toContain("view.setGroupBy");
  });
});

describe("buildManifest", () => {
  it("is deterministic and carries source capabilities unchanged", () => {
    const source = {
      fullDataset: true,
      grouping: "server" as const,
      selectAcrossPages: true,
      exportScope: "all" as const,
      totalCount: "exact" as const,
    };
    const manifest = buildManifest(
      observation({ tableId: "a", viewRevision: 4, source })
    );
    expect(manifest.schemaVersion).toBe(AGENT_SCHEMA_VERSION);
    expect(manifest.tableId).toBe("a");
    expect(manifest.viewRevision).toBe(4);
    expect(manifest.source).toEqual(source);
    expect(manifest.rowAddressing).toEqual({ scope: "visible", key: "rowKey" });
    expect(manifest.policy.write).toBe("allow");
    expect(manifest.policy.approval).toBe("writes");
    expect(manifest.policy.commit).toBe("stage");
    expect(manifest.limits.readMax).toBe(50);
  });
});

describe("createAgentSession", () => {
  it("catalogs only wired keys and describe matches the catalog", () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const keys = session.catalog().map((entry) => entry.key);
    expect(keys).toEqual(enabledKeys(observation()));
    expect(session.describe("view.setPage").schemaVersion).toBe(
      AGENT_SCHEMA_VERSION
    );
    expect(() => session.describe("edit.cells")).toThrow(/not wired/);
    expect(() => session.describe("nope")).toThrow(/unknown/);
  });

  it("executes view mutations and describe reads", async () => {
    const apply = {
      setPage: vi.fn(),
      setLimit: vi.fn(),
      setSearch: vi.fn(),
      setSort: vi.fn(),
    };
    let revision = 1;
    const session = createAgentSession({
      observe: () => observation({ viewRevision: revision, search: "ada" }),
      apply,
    });
    const page = await session.execute(
      "view.setPage",
      { page: 2, limit: 20 },
      1,
      "p1"
    );
    expect(page.ok).toBe(true);
    expect(apply.setPage).toHaveBeenCalledWith(2);
    expect(apply.setLimit).toHaveBeenCalledWith(20);
    revision = 2;
    const search = await session.execute(
      "view.setSearch",
      { query: "hopper" },
      2,
      "s1"
    );
    expect(search.ok).toBe(true);
    expect(apply.setSearch).toHaveBeenCalledWith("hopper");
    const sort = await session.execute(
      "view.setSort",
      { key: "name", dir: "desc" },
      2,
      "o1"
    );
    expect(apply.setSort).toHaveBeenCalledWith("name", "desc");
    expect(sort.ok).toBe(true);
    const columns = await session.execute("columns.describe", {}, 2, "c1");
    expect(columns.result).toEqual({
      columns: observation().columns,
    });
    const view = await session.execute("view.describe", {}, 2, "v1");
    expect(view.result).toMatchObject({ page: 1, search: "ada", revision: 2 });
  });

  it("rejects a stale revision, unknown key, bad args and an oversize page", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage: vi.fn() },
    });
    const stale = await session.execute(
      "view.setPage",
      { page: 2 },
      9,
      "stale"
    );
    expect(stale.error?.code).toBe("revision-mismatch");
    const unknown = await session.execute("nope", {}, 1, "u");
    expect(unknown.error?.code).toBe("unknown-capability");
    const bad = await session.execute("view.setPage", { page: 0 }, 1, "bad");
    expect(bad.error?.code).toBe("invalid-arguments");
    const huge = await session.execute("view.setPage", { page: 99 }, 1, "huge");
    expect(huge.error?.code).toBe("apply-failed");
    const unwired = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "x" }] },
      1,
      "e"
    );
    expect(unwired.error?.code).toBe("not-wired");
  });

  it("replays the same idempotency key and isolates two tables", async () => {
    const applyA = { setPage: vi.fn() };
    const applyB = { setPage: vi.fn() };
    const a = createAgentSession({
      observe: () => observation({ tableId: "a" }),
      apply: applyA,
    });
    const b = createAgentSession({
      observe: () => observation({ tableId: "b", viewRevision: 3 }),
      apply: applyB,
    });
    const first = await a.execute("view.setPage", { page: 2 }, 1, "same");
    const replay = await a.execute("view.setPage", { page: 2 }, 1, "same");
    expect(replay).toEqual(first);
    const mismatch = await a.execute("view.setPage", { page: 9 }, 1, "same");
    expect(mismatch.error?.code).toBe("idempotency-mismatch");
    expect(applyA.setPage).toHaveBeenCalledTimes(1);
    expect(a.manifest().tableId).toBe("a");
    expect(b.manifest().tableId).toBe("b");
    expect(b.manifest().viewRevision).toBe(3);
    await b.execute("view.setPage", { page: 2 }, 3, "b1");
    expect(applyB.setPage).toHaveBeenCalledWith(2);
  });

  it("fails when an advertised apply handler is missing", async () => {
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: ["filters", "export-csv"],
          hasFilters: true,
          hasExport: true,
        }),
      apply: {},
    });
    const filters = await session.execute(
      "view.setFilters",
      { filters: { team: ["Core"] } },
      1,
      "nof"
    );
    expect(filters.ok).toBe(false);
    expect(filters.error?.code).toBe("not-wired");
    const exported = await session.execute(
      "export.run",
      { format: "csv" },
      1,
      "nox"
    );
    expect(exported.ok).toBe(false);
    expect(exported.error?.code).toBe("not-wired");
  });

  it("dispatches filters, grouping, export, edit and reorder when wired", async () => {
    const apply = {
      setFilters: vi.fn(),
      setGroupBy: vi.fn(),
      runExport: vi.fn().mockResolvedValue({ started: true }),
      resolveRow: vi.fn((ref: { rowKey?: string; position?: number }) =>
        "rowKey" in ref && ref.rowKey
          ? { rowKey: ref.rowKey, scope: "visible" as const }
          : { rowKey: `r${String(ref.position)}`, scope: "visible" as const }
      ),
      editCells: vi.fn().mockResolvedValue({ saved: 1 }),
      reorderRows: vi.fn().mockResolvedValue({ moved: true }),
    };
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: [
            "filters",
            "grouping",
            "export-csv",
            "editing",
            "row-reorder",
          ],
          source: { ...PAGE_ONLY, grouping: "client" },
          hasFilters: true,
          hasExport: true,
          hasEdit: true,
          hasReorder: true,
          approval: "never",
          commit: "immediate",
          columns: [
            {
              id: "name",
              label: "Name",
              type: "string",
              readable: true,
              writable: true,
              sortable: true,
            },
          ],
        }),
      apply,
    });
    await session.execute(
      "view.setFilters",
      { filters: { team: "Core" } },
      1,
      "f"
    );
    await session.execute("view.setGroupBy", { key: "team" }, 1, "g");
    await session.execute("view.setGroupBy", { key: null }, 1, "g2");
    await session.execute("export.run", { format: "csv" }, 1, "x");
    await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );
    await session.execute("rows.reorder", { fromKey: "1", toKey: "2" }, 1, "r");
    expect(apply.setFilters).toHaveBeenCalledWith({ team: "Core" });
    expect(apply.setGroupBy).toHaveBeenCalledWith("team");
    expect(apply.setGroupBy).toHaveBeenCalledWith(undefined);
    expect(apply.runExport).toHaveBeenCalledWith("csv");
    expect(apply.editCells).toHaveBeenCalled();
    expect(apply.reorderRows).toHaveBeenCalledWith("1", "2");
  });

  it("applies a whole aggregation patch or none of it", async () => {
    const apply = { setAggregations: vi.fn() };
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: ["grouping"],
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
        }),
      apply,
    });
    const refused = await session.execute(
      "view.setAggregations",
      { set: { salary: "avg", ghost: "sum" } },
      1,
      "bad"
    );
    expect(refused.ok).toBe(false);
    expect(apply.setAggregations).not.toHaveBeenCalled();
    const ok = await session.execute(
      "view.setAggregations",
      { set: { salary: "avg" } },
      1,
      "good"
    );
    expect(ok.ok).toBe(true);
    expect(ok.result).toMatchObject({ applied: true, pending: false });
    expect(apply.setAggregations).toHaveBeenCalledWith({
      set: { salary: "avg" },
    });
    const described = session.describe("view.setAggregations");
    expect(described.guide).toContain("salary [sum (Sum), avg (Average)]");
    expect(described.guide).not.toMatch(/calculate\s*:/);
  });

  it("clears sort when the key is null", async () => {
    const apply = { setSort: vi.fn() };
    const session = createAgentSession({
      observe: () => observation(),
      apply,
    });
    await session.execute("view.setSort", { key: null }, 1, "clear");
    expect(apply.setSort).toHaveBeenCalledWith(undefined, undefined);
  });

  it("records apply-failed when the host hook throws", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {
        setPage: () => {
          throw new Error("nope");
        },
      },
    });
    const result = await session.execute(
      "view.setPage",
      { page: 2 },
      1,
      "boom"
    );
    expect(result.error?.code).toBe("apply-failed");
    expect(result.error?.message).toBe("nope");
  });

  it("treats missing args as {}", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const described = await session.execute(
      "columns.describe",
      undefined,
      1,
      "empty-args"
    );
    expect(described.ok).toBe(true);
  });

  it("reads an empty window when the host does not wire readRows", async () => {
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: [],
          hasEdit: false,
        }),
      apply: {},
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 10, columns: ["name"] },
      1,
      "empty-read"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({
      rows: [],
      offset: 0,
      limit: 10,
    });
  });

  it("returns undefined from export.run when the host hook is silent", async () => {
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: ["export-csv"],
          hasExport: true,
        }),
      apply: { runExport: vi.fn() },
    });
    const result = await session.execute(
      "export.run",
      { format: "csv" },
      1,
      "x0"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toBeUndefined();
  });
});

describe("validateSchema", () => {
  it("covers the subset describe() uses", () => {
    expect(validateSchema({ const: 1 }, 2)).toMatch(/must be 1/);
    expect(validateSchema({ enum: ["a"] }, "b")).toMatch(/one of/);
    expect(validateSchema({ type: "integer" }, 1.5)).toMatch(/integer/);
    expect(validateSchema({ type: "array" }, {})).toMatch(/array/);
    expect(validateSchema({ type: "null" }, 0)).toMatch(/null/);
    expect(validateSchema({ type: "object" }, [])).toMatch(/object/);
    expect(validateSchema({ type: "number", minimum: 2 }, 1)).toMatch(/>=/);
    expect(validateSchema({ type: "number", maximum: 2 }, 3)).toMatch(/<=/);
    expect(validateSchema({ type: "string", minLength: 2 }, "a")).toMatch(
      /at least/
    );
    expect(
      validateSchema({ type: "array", items: { type: "number" } }, ["x"])
    ).toMatch(/number/);
    expect(
      validateSchema(
        {
          type: "object",
          required: ["a"],
          properties: { a: { type: "string" } },
        },
        {}
      )
    ).toMatch(/required/);
    expect(
      validateSchema(
        {
          type: "object",
          additionalProperties: false,
          properties: { a: { type: "string" } },
        },
        { a: "ok", b: 1 }
      )
    ).toMatch(/not allowed/);
    expect(
      validateSchema(
        { type: "object", properties: { a: { type: "string" } } },
        { a: "ok" }
      )
    ).toBeUndefined();
    expect(validateSchema({ type: "array" }, [])).toBeUndefined();
    expect(
      validateSchema(
        { type: "object", additionalProperties: false },
        { extra: 1 }
      )
    ).toMatch(/not allowed/);
  });
});
