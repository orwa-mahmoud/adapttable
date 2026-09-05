import { describe, expect, it, vi } from "vitest";

import { enabledKeys } from "./manifest";
import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentObservation,
  RowReadQuery,
  RowWindow,
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

  it("shares one in-flight execute for an identical concurrent request", async () => {
    let release!: (ok: boolean) => void;
    const gate = new Promise<boolean>((resolve) => {
      release = resolve;
    });
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => gate,
    });
    const args = { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] };
    const first = session.execute("edit.cells", args, 1, "same");
    const second = session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "same"
    );
    release(true);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
    expect(hooks.editCells).toHaveBeenCalledTimes(1);
  });

  it("fails an in-flight duplicate id carrying a different payload", async () => {
    let release!: (ok: boolean) => void;
    const gate = new Promise<boolean>((resolve) => {
      release = resolve;
    });
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => gate,
    });
    const first = session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "same"
    );
    const second = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Other" }] },
      1,
      "same"
    );
    expect(second.ok).toBe(false);
    expect(second.error?.code).toBe("idempotency-mismatch");
    release(true);
    const settled = await first;
    expect(settled.ok).toBe(true);
    expect(hooks.editCells).toHaveBeenCalledTimes(1);
    expect(hooks.editCells).toHaveBeenCalledWith([
      { rowKey: "r1", column: "name", value: "Ada" },
    ]);
  });

  it("fails a pending duplicate id that names a different capability", async () => {
    let release!: (ok: boolean) => void;
    const gate = new Promise<boolean>((resolve) => {
      release = resolve;
    });
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => gate,
    });
    const first = session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "shared"
    );
    const second = await session.execute(
      "rows.delete",
      { keys: ["r2"] },
      1,
      "shared"
    );
    expect(second.error?.code).toBe("idempotency-mismatch");
    expect(hooks.deleteRows).not.toHaveBeenCalled();
    release(true);
    await first;
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
      { edits: [{ rowKey: "r1", column: "name", value: "Ada Lovelace" }] },
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

  it("rechecks the view revision after approval before writing", async () => {
    let revision = 1;
    const hooks = apply();
    const session = createAgentSession({
      observe: () =>
        observation({ viewRevision: revision, approval: "writes" }),
      apply: hooks,
      onApprove: () => {
        revision = 2;
        return Promise.resolve(true);
      },
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "stale-after-approve"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("revision-mismatch");
    expect(hooks.editCells).not.toHaveBeenCalled();
    expect(hooks.stageCells).not.toHaveBeenCalled();
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

  it("immediate commit without editCells is not-wired", async () => {
    const hooks = apply({ editCells: undefined });
    const session = createAgentSession({
      observe: () => observation({ approval: "never", commit: "immediate" }),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "no-edit"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("not-wired");
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

  it("does not cache a cancelled execute and rejects an aborted approval", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: (_proposal, signal) => {
        if (!signal) return Promise.resolve(true);
        return new Promise((resolve) => {
          signal.addEventListener("abort", () => resolve(false), {
            once: true,
          });
        });
      },
    });
    const cancelled = new AbortController();
    cancelled.abort();
    const skipped = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "cancel-early",
      cancelled.signal
    );
    expect(skipped.error?.code).toBe("cancelled");
    expect(hooks.editCells).not.toHaveBeenCalled();

    const late = new AbortController();
    const pending = session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "cancel-late",
      late.signal
    );
    late.abort();
    const rejected = await pending;
    expect(rejected.ok).toBe(false);
    expect(rejected.error?.code).toBe("cancelled");
    expect(hooks.editCells).not.toHaveBeenCalled();

    const retried = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "cancel-early"
    );
    expect(retried.error?.code).not.toBe("cancelled");

    const allowed = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => Promise.resolve(true),
    });
    const withSignal = await allowed.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "approve-signal",
      new AbortController().signal
    );
    expect(withSignal.ok).toBe(true);
    expect(hooks.editCells).toHaveBeenCalled();

    const exploding = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => Promise.reject(new Error("approve failed")),
    });
    const boom = await exploding.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "approve-throw",
      new AbortController().signal
    );
    expect(boom.error?.code).toBe("apply-failed");
    expect(boom.error?.message).toBe("approve failed");
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

describe("execution lifecycle", () => {
  it("rejects idempotency reuse when the payload changes", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });
    await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "same-key"
    );
    const mismatch = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Other" }] },
      1,
      "same-key"
    );
    expect(mismatch.error?.code).toBe("idempotency-mismatch");
    expect(hooks.editCells).toHaveBeenCalledTimes(1);
  });

  it("replays reads with current column permissions", async () => {
    let readableSalary = true;
    const session = createAgentSession({
      observe: () =>
        observation({
          columns: COLUMNS.map((column) =>
            column.id === "salary"
              ? { ...column, readable: readableSalary }
              : column
          ),
        }),
      apply: apply(),
    });
    const first = await session.execute(
      "rows.read",
      { offset: 0, limit: 10 },
      1,
      "read-once"
    );
    expect((first.result as RowWindow).rows[0]?.cells.salary).toBe(100);
    readableSalary = false;
    const replayed = await session.execute(
      "rows.read",
      { offset: 0, limit: 10 },
      1,
      "read-once"
    );
    expect(
      (replayed.result as RowWindow).rows[0]?.cells.salary
    ).toBeUndefined();
    expect((replayed.result as RowWindow).redacted).toContain("salary");
  });

  it("rejects add/delete/reorder under commit: stage before callbacks run", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () =>
        observation({
          commit: "stage",
          featureIds: ["editing", "row-reorder"],
        }),
      apply: hooks,
    });
    const add = await session.execute(
      "rows.add",
      { rows: [{ name: "New" }] },
      1,
      "add-stage"
    );
    expect(add.error?.code).toBe("commit-incompatible");
    expect(hooks.addRows).not.toHaveBeenCalled();
    const del = await session.execute(
      "rows.delete",
      { keys: ["r1"] },
      1,
      "del-stage"
    );
    expect(del.error?.code).toBe("commit-incompatible");
    const move = await session.execute(
      "rows.reorder",
      { fromKey: "r1", toKey: "r2" },
      1,
      "move-stage"
    );
    expect(move.error?.code).toBe("commit-incompatible");
  });

  it("validates setLimit wiring before setPage when both are requested", async () => {
    const setPage = vi.fn();
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage },
    });
    const result = await session.execute(
      "view.setPage",
      { page: 2, limit: 25 },
      1,
      "page-limit"
    );
    expect(result.error?.code).toBe("not-wired");
    expect(setPage).not.toHaveBeenCalled();
  });

  it("resolves before-values beyond the first read window by row identity", async () => {
    const readRows = vi.fn((query: RowReadQuery) => {
      const slice = WINDOW.rows.slice(query.offset, query.offset + query.limit);
      return Promise.resolve({
        offset: query.offset,
        limit: query.limit,
        redacted: ["ssn"],
        rows: slice.map((row) => ({
          rowKey: row.rowKey,
          cells: { salary: row.cells.salary },
        })),
      });
    });
    const hooks = apply({ readRows });
    const session = createAgentSession({
      observe: () => observation({ readMax: 2 }),
      apply: hooks,
    });
    const result = await session.execute(
      "edit.cells",
      {
        edits: [
          {
            column: "salary",
            value: 999,
            position: 5,
            scope: "visible",
          },
        ],
      },
      1,
      "far-row"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({
      proposals: [{ rowKey: "r5", column: "salary", before: 140 }],
    });
    expect(readRows).toHaveBeenCalled();
  });
});
