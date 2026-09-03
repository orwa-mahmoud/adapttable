import { describe, expect, it, vi } from "vitest";

import { enabledKeys } from "./manifest";
import { createAgentSession } from "./session";
import type { AgentApply, AgentObservation, RowWindow } from "./types";

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

const WINDOW: RowWindow = {
  offset: 0,
  limit: 10,
  redacted: ["ssn"],
  rows: [
    { rowKey: "r1", cells: { name: "Ada", salary: 100, ssn: "hidden" } },
    { rowKey: "r2", cells: { name: "Grace", salary: 110, ssn: "hidden" } },
    { rowKey: "r3", cells: { name: "Alan", salary: 120, ssn: "hidden" } },
    { rowKey: "r4", cells: { name: "Jean", salary: 130, ssn: "hidden" } },
    { rowKey: "r5", cells: { name: "Don", salary: 140, ssn: "hidden" } },
  ],
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
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
    hasReorder: true,
    hasSelection: true,
    hasSavedViews: false,
    hasAdd: true,
    hasDelete: true,
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
    readRows: vi.fn().mockResolvedValue(WINDOW),
    resolveRow: vi.fn((ref) => {
      if ("rowKey" in ref) {
        return { rowKey: ref.rowKey, scope: "visible" as const };
      }
      const row = WINDOW.rows[ref.position - 1];
      if (!row) throw new Error(`no row at ${ref.position}`);
      return {
        rowKey: row.rowKey,
        scope: ref.scope,
        position: ref.position,
      };
    }),
    editCells: vi.fn().mockResolvedValue({ saved: 1 }),
    stageCells: vi.fn().mockResolvedValue({ staged: 1 }),
    addRows: vi.fn(),
    deleteRows: vi.fn(),
    reorderRows: vi.fn(),
    setSelection: vi.fn(),
    applyView: vi.fn(),
    ...patch,
  };
}

describe("rows.read", () => {
  it("redacts readable: false columns", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 10 },
      1,
      "read"
    );
    expect(result.ok).toBe(true);
    const window = result.result as RowWindow;
    expect(window.redacted).toEqual(["ssn"]);
    expect(window.rows[0]?.cells).toEqual({ name: "Ada", salary: 100 });
    expect(window.rows[0]?.cells).not.toHaveProperty("ssn");
  });

  it("keeps only the requested readable columns", async () => {
    const session = createAgentSession({
      observe: () => observation({ readMax: undefined }),
      apply: apply(),
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 10, columns: ["name"] },
      1,
      "cols"
    );
    expect(result.ok).toBe(true);
    const window = result.result as RowWindow;
    expect(window.rows[0]?.cells).toEqual({ name: "Ada" });
    expect(window.rows[0]?.cells).not.toHaveProperty("salary");
  });

  it("fails scope full when the source is not a full dataset", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 10, scope: "full" },
      1,
      "full"
    );
    expect(result.error?.code).toBe("scope-denied");
  });
});

describe("rows.resolve", () => {
  it("rejects a position without expectedRevision or a missing row identity", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
    });
    const noRevision = await session.execute(
      "rows.resolve",
      { position: 5 },
      1,
      "norev"
    );
    expect(noRevision.error?.code).toBe("invalid-arguments");
    const stale = await session.execute(
      "rows.resolve",
      { position: 5, expectedRevision: 9 },
      1,
      "pos-stale"
    );
    expect(stale.error?.code).toBe("revision-mismatch");
    const empty = await session.execute("rows.resolve", {}, 1, "empty-ref");
    expect(empty.error?.code).toBe("invalid-arguments");
  });

  it("fails resolve when the host does not wire resolveRow", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply({ resolveRow: undefined }),
    });
    const result = await session.execute(
      "rows.resolve",
      { rowKey: "r1" },
      1,
      "unwired"
    );
    expect(result.error?.code).toBe("apply-failed");
    expect(result.error?.message).toMatch(/resolveRow/);
  });

  it("resolves 1-based position 5 on the visible view", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });
    const result = await session.execute(
      "rows.resolve",
      { position: 5, scope: "visible", expectedRevision: 1 },
      1,
      "pos"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({
      rowKey: "r5",
      scope: "visible",
      position: 5,
    });
    const implied = await session.execute(
      "rows.resolve",
      { position: 2, expectedRevision: 1 },
      1,
      "implied-scope"
    );
    expect(implied.ok).toBe(true);
    expect(implied.result).toMatchObject({
      rowKey: "r2",
      scope: "visible",
    });
  });
});

describe("edit.cells", () => {
  it("rejects a stale revision before writing", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r5", column: "salary", value: 20_000 }] },
      9,
      "stale"
    );
    expect(result.error?.code).toBe("revision-mismatch");
    expect(hooks.editCells).not.toHaveBeenCalled();
  });

  it("resolves position 5 and returns proposals before a write", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      {
        edits: [
          {
            column: "salary",
            value: 20_000,
            position: 5,
            scope: "visible",
          },
        ],
      },
      1,
      "fifth"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({
      applied: true,
      approval: "not-required",
      proposals: [
        { rowKey: "r5", column: "salary", before: 140, after: 20_000 },
      ],
    });
    expect(hooks.editCells).toHaveBeenCalledWith([
      { rowKey: "r5", column: "salary", value: 20_000 },
    ]);
  });

  it("rejects an unknown column and a position whose edit revision is stale", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });
    const unknown = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "missing", value: "x" }] },
      1,
      "unknown-col"
    );
    expect(unknown.error?.code).toBe("unknown-column");
    expect(hooks.editCells).not.toHaveBeenCalled();
  });

  it("rejects a hidden or read-only column", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "ssn", value: "x" }] },
      1,
      "secret"
    );
    expect(result.error?.code).toBe("column-not-writable");
  });

  it("replays the same idempotency key", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });
    const first = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada Lovelace" }] },
      1,
      "same"
    );
    const again = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Other" }] },
      1,
      "same"
    );
    expect(again).toEqual(first);
    expect(hooks.editCells).toHaveBeenCalledTimes(1);
  });

  it("returns per-row failures without hiding them", async () => {
    const hooks = apply({
      editCells: vi.fn((edits) => {
        if (edits[0]?.rowKey === "r2") throw new Error("save failed");
      }),
    });
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      {
        edits: [
          { rowKey: "r1", column: "name", value: "A" },
          { rowKey: "r2", column: "name", value: "B" },
        ],
      },
      1,
      "bulk"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({
      applied: false,
      results: [
        { rowKey: "r1", ok: true },
        { rowKey: "r2", ok: false, error: { message: "save failed" } },
      ],
    });
  });
});

describe("approval and commit", () => {
  it("requires approval for writes when policy is writes", async () => {
    const onApprove = vi.fn().mockResolvedValue(true);
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove,
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "aw"
    );
    expect(onApprove).toHaveBeenCalled();
    expect(result.result).toMatchObject({
      approval: "approved",
      applied: true,
    });
  });

  it("approval destructive only gates rows.delete", async () => {
    const onApprove = vi.fn().mockResolvedValue(true);
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "destructive" }),
      apply: hooks,
      onApprove,
    });
    await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );
    expect(onApprove).not.toHaveBeenCalled();
    await session.execute("rows.delete", { keys: ["r1"] }, 1, "del");
    expect(onApprove).toHaveBeenCalled();
  });

  it("approval never skips the callback and still writes", async () => {
    const onApprove = vi.fn().mockResolvedValue(false);
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "never" }),
      apply: hooks,
      onApprove,
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "nv"
    );
    expect(onApprove).not.toHaveBeenCalled();
    expect(result.result).toMatchObject({
      approval: "not-required",
      applied: true,
    });
  });

  it("returns pending when approval is required and no onApprove is set", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "pend"
    );
    expect(result.result).toMatchObject({
      approval: "pending",
      applied: false,
    });
    expect(hooks.editCells).not.toHaveBeenCalled();
  });

  it("records a rejected approval without writing", async () => {
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: apply(),
      onApprove: () => Promise.resolve(false),
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "no"
    );
    expect(result.result).toMatchObject({
      approval: "rejected",
      applied: false,
    });
  });

  it("commit stage uses stageCells when wired", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "never", commit: "stage" }),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "st"
    );
    expect(hooks.stageCells).toHaveBeenCalled();
    expect(hooks.editCells).not.toHaveBeenCalled();
    expect(result.result).toMatchObject({ applied: true });
  });

  it("commit stage without a batch path returns applied false", async () => {
    const hooks = apply({ stageCells: undefined });
    const session = createAgentSession({
      observe: () => observation({ approval: "never", commit: "stage" }),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "nostage"
    );
    expect(hooks.editCells).not.toHaveBeenCalled();
    expect(result.result).toMatchObject({ applied: false });
  });

  it("commit immediate calls editCells now", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "never", commit: "immediate" }),
      apply: hooks,
    });
    await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "im"
    );
    expect(hooks.editCells).toHaveBeenCalled();
  });
});

describe("selection, views, add and delete", () => {
  it("sets selection and applies a saved view when wired", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: ["editing", "saved-views"],
          hasSavedViews: true,
        }),
      apply: hooks,
    });
    expect(enabledKeys(observation({ hasSelection: true }))).toContain(
      "view.setSelection"
    );
    await session.execute("view.setSelection", { ids: ["r1"] }, 1, "sel");
    expect(hooks.setSelection).toHaveBeenCalledWith(["r1"]);
    await session.execute("views.apply", { viewId: "ops" }, 1, "view");
    expect(hooks.applyView).toHaveBeenCalledWith("ops");
  });

  it("adds and deletes through host callbacks", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });
    await session.execute("rows.add", { rows: [{ name: "New" }] }, 1, "add");
    expect(hooks.addRows).toHaveBeenCalledWith([{ name: "New" }]);
    await session.execute(
      "rows.add",
      { rows: [{ rowKey: "r-new", name: "Named" }] },
      1,
      "add-key"
    );
    expect(hooks.addRows).toHaveBeenCalledWith([
      { rowKey: "r-new", name: "Named" },
    ]);
    await session.execute("rows.delete", { keys: ["r1"] }, 1, "rm");
    expect(hooks.deleteRows).toHaveBeenCalled();
  });

  it("surfaces a reorder throw that is not a bulk failure", async () => {
    const session = createAgentSession({
      observe: () =>
        observation({
          featureIds: ["editing", "row-reorder"],
        }),
      apply: apply({
        reorderRows: () => {
          throw new Error("cannot move");
        },
      }),
    });
    const result = await session.execute(
      "rows.reorder",
      { fromKey: "r1", toKey: "r2" },
      1,
      "move-fail"
    );
    expect(result.error?.code).toBe("apply-failed");
    expect(result.error?.message).toBe("cannot move");
  });

  it("defaults approval to writes when the observation omits it", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: undefined }),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "default-approval"
    );
    expect(result.result).toMatchObject({
      approval: "pending",
      applied: false,
    });
    expect(hooks.editCells).not.toHaveBeenCalled();
  });
});
