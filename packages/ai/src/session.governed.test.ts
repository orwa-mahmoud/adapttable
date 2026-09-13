import { describe, expect, it, vi } from "vitest";

import { enabledKeys } from "./manifest";
import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentObservation,
  CapabilityPlan,
  RowProvenanceEnvelope,
  RowReadQuery,
  RowWindow,
} from "./types";

/** The window inside the provenance envelope a read returns. */
function windowOf(result: { readonly result?: unknown }): RowWindow {
  return (result.result as RowProvenanceEnvelope).rows;
}

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
    const window = windowOf(result);
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
    const window = windowOf(result);
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
    expect(windowOf(first).rows[0]?.cells.salary).toBe(100);
    readableSalary = false;
    const replayed = await session.execute(
      "rows.read",
      { offset: 0, limit: 10 },
      1,
      "read-once"
    );
    expect(windowOf(replayed).rows[0]?.cells.salary).toBeUndefined();
    expect(windowOf(replayed).redacted).toContain("salary");
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

describe("what a reader is asked to approve", () => {
  it("describes a row write as rows, in plan order, and says it can be split", async () => {
    let seen: unknown;
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: apply(),
      onApprove: (subject) => {
        seen = subject;
        return Promise.resolve(true);
      },
    });
    await session.execute(
      "edit.cells",
      {
        edits: [
          { rowKey: "r1", column: "salary", value: 200 },
          { rowKey: "r2", column: "salary", value: 210 },
        ],
      },
      1,
      "rows-subject"
    );

    expect(seen).toEqual({
      kind: "rows",
      perItem: true,
      // Where it is reviewed travels with it, already resolved.
      presentation: "widget",
      proposals: [
        { rowKey: "r1", column: "salary", before: 100, after: 200 },
        { rowKey: "r2", column: "salary", before: 110, after: 210 },
      ],
    });
  });

  it("describes a row move as one indivisible change", async () => {
    let seen: { perItem?: boolean } | undefined;
    const session = createAgentSession({
      observe: () =>
        observation({
          approval: "writes",
          featureIds: ["editing", "row-reorder"],
        }),
      apply: apply(),
      onApprove: (subject) => {
        seen = subject.kind === "rows" ? { perItem: subject.perItem } : {};
        return Promise.resolve(true);
      },
    });
    await session.execute(
      "rows.reorder",
      { fromKey: "r1", toKey: "r3" },
      1,
      "move-subject"
    );

    // Two proposals describe one move. Approving half of it is not a thing.
    expect(seen?.perItem).toBe(false);
  });

  it("names the capability when a write enumerates no rows", async () => {
    let seen: unknown;
    const bulk: AgentCapabilityDefinition = {
      key: "staff.activateAll",
      summary: "Set every matching row to Active",
      kind: "write",
      presentation: { title: "Activate everyone" },
      guide: {
        guide: "Activate every row the filter matches.",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      execute: () => ({ ok: true }),
    };
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: apply(),
      capabilities: [bulk],
      onApprove: (subject) => {
        seen = subject;
        return Promise.resolve(true);
      },
    });
    await session.execute(
      "staff.activateAll",
      { status: "Active" },
      1,
      "operation-subject"
    );

    // The reader gets something to read, not an empty list.
    expect(seen).toEqual({
      kind: "operation",
      capability: "staff.activateAll",
      title: "Activate everyone",
      arguments: { status: "Active" },
      presentation: "widget",
    });
  });
});

describe("approving part of a bulk write", () => {
  const threeEdits = {
    edits: [
      { rowKey: "r1", column: "salary", value: 200 },
      { rowKey: "r2", column: "salary", value: 210 },
      { rowKey: "r3", column: "salary", value: 220 },
    ],
  };

  it("writes only the approved rows and never the refused ones", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => Promise.resolve({ approved: [0, 2] }),
    });
    const result = await session.execute(
      "edit.cells",
      threeEdits,
      1,
      "partial-write"
    );

    expect(result.ok).toBe(true);
    const written = (hooks.editCells as ReturnType<typeof vi.fn>).mock.calls
      .flatMap((call) => call[0] as { rowKey: string }[])
      .map((edit) => edit.rowKey);
    expect(written).toEqual(["r1", "r3"]);
  });

  it("reports the outcome as partial and returns only what ran", async () => {
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: apply(),
      onApprove: () => Promise.resolve({ approved: [1] }),
    });
    const result = await session.execute(
      "edit.cells",
      threeEdits,
      1,
      "partial-receipt"
    );

    const payload = result.result as {
      approval: string;
      proposals: { rowKey: string }[];
    };
    expect(payload.approval).toBe("partial");
    expect(payload.proposals.map((entry) => entry.rowKey)).toEqual(["r2"]);
  });

  it("treats approving every row as a plain approval", async () => {
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: apply(),
      onApprove: () => Promise.resolve({ approved: [0, 1, 2] }),
    });
    const result = await session.execute(
      "edit.cells",
      threeEdits,
      1,
      "all-approved"
    );

    expect((result.result as { approval: string }).approval).toBe("approved");
  });

  it("treats approving none as a refusal, and writes nothing", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => Promise.resolve({ approved: [] }),
    });
    const result = await session.execute(
      "edit.cells",
      threeEdits,
      1,
      "none-approved"
    );

    expect((result.result as { approval: string }).approval).toBe("rejected");
    expect(hooks.editCells).not.toHaveBeenCalled();
  });

  it("refuses a position that is not a row of the plan, and writes nothing", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      // 7 is past the end. Dropping it and running the rest would apply a set
      // the reader never chose.
      onApprove: () => Promise.resolve({ approved: [2, 7] }),
    });
    const result = await session.execute(
      "edit.cells",
      threeEdits,
      1,
      "bad-positions"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("approval-invalid");
    expect(hooks.editCells).not.toHaveBeenCalled();
  });

  it("refuses a repeated position rather than guessing what it meant", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => Promise.resolve({ approved: [1, 1] }),
    });
    const result = await session.execute(
      "edit.cells",
      threeEdits,
      1,
      "duplicate-position"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("approval-invalid");
    expect(hooks.editCells).not.toHaveBeenCalled();
  });

  it("refuses a non-integer position", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => Promise.resolve({ approved: [1.5] as number[] }),
    });
    const result = await session.execute(
      "edit.cells",
      threeEdits,
      1,
      "fractional-position"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("approval-invalid");
    expect(hooks.editCells).not.toHaveBeenCalled();
  });
});

describe("the value a write is about to replace, as the model sees it", () => {
  /** A table whose visible scope holds r2 and nothing else. */
  function narrowed() {
    return apply({
      readRows: vi.fn((query: RowReadQuery) =>
        Promise.resolve(
          query.scope === "visible"
            ? { offset: 0, limit: 10, redacted: [], rows: [WINDOW.rows[1]!] }
            : WINDOW
        )
      ),
    });
  }

  async function proposalFor(rowKey: string) {
    let seen: { proposals: { before?: unknown }[] } | undefined;
    const session = createAgentSession({
      observe: () =>
        observation({
          approval: "writes",
          source: { ...PAGE_ONLY, fullDataset: true },
        }),
      apply: narrowed(),
      onApprove: (subject) => {
        seen =
          subject.kind === "rows"
            ? { proposals: [...subject.proposals] }
            : undefined;
        return Promise.resolve(true);
      },
    });
    await session.execute(
      "edit.cells",
      { edits: [{ rowKey, column: "salary", value: 185 }] },
      1,
      `peek-${rowKey}`
    );
    return seen?.proposals[0];
  }

  it("reads a row the agent can address", async () => {
    expect((await proposalFor("r2"))?.before).toBe(110);
  });

  it("does not widen its scope to read one the agent cannot", async () => {
    // r1 is outside the visible scope. This value travels: it lands in
    // WriteProposal.before, which an HTTP or MCP continuation sends back to
    // the backend. Reading it here would be a disclosure with a comment on
    // it. What the HUMAN approving sees is resolved separately, in the React
    // binding, from the table they are already looking at.
    expect((await proposalFor("r1"))?.before).toBeUndefined();
  });

  it("does not scan the whole dataset for every edit", async () => {
    const hooks = narrowed();
    const session = createAgentSession({
      observe: () =>
        observation({
          approval: "never",
          source: { ...PAGE_ONLY, fullDataset: true },
        }),
      apply: hooks,
    });
    await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "salary", value: 185 }] },
      1,
      "bounded-peek"
    );

    const scopes = (hooks.readRows as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => (call[0] as RowReadQuery).scope
    );
    expect(scopes.every((scope) => scope === "visible")).toBe(true);
  });
});

describe("what may be split, and what may not", () => {
  /** A custom write whose plan enumerates rows, parameterised by its contract. */
  function bulkCapability(
    patch: Partial<AgentCapabilityDefinition> = {},
    plan?: Partial<CapabilityPlan>
  ): AgentCapabilityDefinition {
    return {
      key: "staff.raise",
      summary: "Raise several salaries",
      kind: "write",
      guide: {
        guide: "Raise salaries.",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      plan: () => ({
        proposals: [
          { rowKey: "r1", column: "salary", after: 200 },
          { rowKey: "r2", column: "salary", after: 210 },
        ],
        payload: ["r1", "r2"],
        perItem: true,
        ...plan,
      }),
      execute: () => ({ ok: true }),
      ...patch,
    };
  }

  async function offer(
    definition: AgentCapabilityDefinition
  ): Promise<{ perItem?: boolean }> {
    let seen: { perItem?: boolean } = {};
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: apply(),
      capabilities: [definition],
      onApprove: (subject) => {
        seen = subject.kind === "rows" ? { perItem: subject.perItem } : {};
        return Promise.resolve(true);
      },
    });
    await session.execute(definition.key, {}, 1, `offer-${definition.key}`);
    return seen;
  }

  it("offers per-item only when the capability says it applies the plan", async () => {
    // Narrowing the plan cannot narrow the arguments, and `execute` still
    // receives the original ones. An undeclared handler is offered whole.
    expect((await offer(bulkCapability())).perItem).toBe(false);
    expect(
      (await offer(bulkCapability({ partial: "supported" }))).perItem
    ).toBe(true);
  });

  it("does not offer per-item for a payload it cannot cut", async () => {
    const opaque = bulkCapability(
      { partial: "supported" },
      {
        payload: { sql: "UPDATE staff SET salary = salary * 1.1" },
      }
    );
    expect((await offer(opaque)).perItem).toBe(false);
  });

  it("does not offer per-item when the payload and proposals disagree in length", async () => {
    const ragged = bulkCapability(
      { partial: "supported" },
      {
        payload: ["r1"],
      }
    );
    expect((await offer(ragged)).perItem).toBe(false);
  });

  it("refuses a subset for a write it never offered per item", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: hooks,
      capabilities: [bulkCapability()],
      onApprove: () => Promise.resolve({ approved: [0] }),
    });
    const result = await session.execute(
      "staff.raise",
      {},
      1,
      "subset-refused"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("approval-not-decomposable");
  });

  it("refuses a subset of a row move, which is one change described twice", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () =>
        observation({
          approval: "writes",
          featureIds: ["editing", "row-reorder"],
        }),
      apply: hooks,
      onApprove: () => Promise.resolve({ approved: [0] }),
    });
    const result = await session.execute(
      "rows.reorder",
      { fromKey: "r1", toKey: "r3" },
      1,
      "half-a-move"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("approval-not-decomposable");
    expect(hooks.reorderRows).not.toHaveBeenCalled();
  });

  it("splits two edits to the same row independently", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => Promise.resolve({ approved: [1] }),
    });
    const result = await session.execute(
      "edit.cells",
      {
        edits: [
          { rowKey: "r1", column: "name", value: "Ada L." },
          { rowKey: "r1", column: "salary", value: 250 },
        ],
      },
      1,
      "same-row-twice"
    );

    expect((result.result as { approval: string }).approval).toBe("partial");
    const written = (hooks.editCells as ReturnType<typeof vi.fn>).mock.calls
      .flatMap((call) => call[0] as { column: string }[])
      .map((edit) => edit.column);
    expect(written).toEqual(["salary"]);
  });

  it("hands the handler a plan describing exactly the approved rows", async () => {
    let seen: CapabilityPlan | undefined;
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: apply(),
      capabilities: [
        bulkCapability({
          partial: "supported",
          execute: (context) => {
            seen = context.plan;
            return { ok: true };
          },
        }),
      ],
      onApprove: () => Promise.resolve({ approved: [1] }),
    });
    await session.execute("staff.raise", {}, 1, "narrowed-plan");

    expect(seen?.proposals.map((entry) => entry.rowKey)).toEqual(["r2"]);
    expect(seen?.payload).toEqual(["r2"]);
  });

  it("still refuses a stale revision after the reader decides", async () => {
    let revision = 1;
    const hooks = apply();
    const session = createAgentSession({
      observe: () =>
        observation({ approval: "writes", viewRevision: revision }),
      apply: hooks,
      onApprove: () => {
        // The table moved while the reader was reading.
        revision = 2;
        return Promise.resolve({ approved: [0] });
      },
    });
    const result = await session.execute(
      "edit.cells",
      {
        edits: [
          { rowKey: "r1", column: "salary", value: 200 },
          { rowKey: "r2", column: "salary", value: 210 },
        ],
      },
      1,
      "stale-after-partial"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("revision-mismatch");
    expect(hooks.editCells).not.toHaveBeenCalled();
  });
});

describe("an action that overrides the table's approval policy", () => {
  function custom(
    ai: AgentCapabilityDefinition["ai"]
  ): AgentCapabilityDefinition {
    return {
      key: "staff.archive",
      summary: "Archive a person",
      kind: "write",
      ...(ai ? { ai } : {}),
      guide: {
        guide: "Archive.",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      execute: () => ({ ok: true }),
    };
  }

  let keyCounter = 0;

  async function asked(
    definition: AgentCapabilityDefinition,
    policy: "writes" | "never"
  ): Promise<boolean> {
    let called = false;
    keyCounter += 1;
    const session = createAgentSession({
      observe: () => observation({ approval: policy, commit: "immediate" }),
      apply: apply(),
      capabilities: [definition],
      onApprove: () => {
        called = true;
        return Promise.resolve(true);
      },
    });
    await session.execute(definition.key, {}, 1, `ask-${String(keyCounter)}`);
    return called;
  }

  it("asks for a required action on a table that asks for nothing", async () => {
    expect(await asked(custom(undefined), "never")).toBe(false);
    expect(
      await asked(custom({ approval: { policy: "required" } }), "never")
    ).toBe(true);
  });

  it("skips the human for an automatic action on a table that asks for writes", async () => {
    expect(await asked(custom(undefined), "writes")).toBe(true);
    expect(
      await asked(custom({ approval: { policy: "automatic" } }), "writes")
    ).toBe(false);
  });

  it("still validates and still runs the host path when approval is automatic", async () => {
    // Automatic skips the human confirmation and nothing else.
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: hooks,
      onApprove: () => Promise.resolve(true),
    });
    const bad = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "ssn", value: "x" }] },
      1,
      "automatic-still-validates"
    );
    expect(bad.error?.code).toBe("column-not-writable");
  });

  it("changing only the presentation leaves the policy asking", async () => {
    expect(
      await asked(custom({ approval: { presentation: "modal" } }), "writes")
    ).toBe(true);
  });
});

describe("the row writes an agent can ask for", () => {
  it("adds the rows it was given", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });

    const result = await session.execute(
      "rows.add",
      { rows: [{ name: "Grace" }] },
      1,
      "add"
    );

    expect(result.ok).toBe(true);
    expect(hooks.addRows).toHaveBeenCalledWith([{ name: "Grace" }]);
  });

  it("deletes the rows it named", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation(),
      apply: hooks,
    });

    const result = await session.execute(
      "rows.delete",
      { keys: ["r1"] },
      1,
      "del"
    );

    expect(result.ok).toBe(true);
    expect(hooks.deleteRows).toHaveBeenCalledWith(["r1"]);
  });

  it("moves one row to another's place", async () => {
    const hooks = apply();
    const session = createAgentSession({
      // Reordering is its own feature; a table that only edits does not offer
      // it, which is what `not-wired` says.
      observe: () => observation({ featureIds: ["editing", "row-reorder"] }),
      apply: hooks,
    });

    const result = await session.execute(
      "rows.reorder",
      { fromKey: "r1", toKey: "r2" },
      1,
      "mv"
    );

    expect(result.ok).toBe(true);
    expect(hooks.reorderRows).toHaveBeenCalledWith("r1", "r2");
  });

  it("refuses an edit that names no column", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
    });

    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", value: "Ada" }] },
      1,
      "ed"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("invalid-arguments");
  });
});

describe("what a per-row decision means", () => {
  /** A table that asks before every write. */
  function asking(onApprove: (proposal: unknown) => unknown) {
    const hooks = apply();
    return {
      hooks,
      session: createAgentSession({
        observe: () => observation({ approval: "writes" }),
        apply: hooks,
        onApprove: onApprove as never,
      }),
    };
  }

  it("runs only the rows the reader kept", async () => {
    const { hooks, session } = asking(() => ({ approved: [1] }));

    const result = await session.execute(
      "edit.cells",
      {
        edits: [
          { rowKey: "r1", column: "name", value: "Ada" },
          { rowKey: "r2", column: "name", value: "Grace" },
        ],
      },
      1,
      "ed"
    );

    expect(result.ok).toBe(true);
    // The reader kept the first of the two, so exactly one edit reaches the
    // host — a partial approval is not an all-or-nothing refusal.
    expect(hooks.editCells).toHaveBeenCalledTimes(1);
  });

  it("keeps the reader's stated reason on a refusal", async () => {
    const { hooks, session } = asking(() => ({
      approved: [],
      reason: "not during the close",
    }));

    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );

    expect(hooks.editCells).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).toContain("not during the close");
  });

  it("treats a decision that is not a decision as a refusal", async () => {
    // The value crossed the host boundary, so its declared type is a claim
    // rather than a fact.
    const { hooks, session } = asking(() => "yes please");

    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );

    expect(result.ok).toBe(false);
    expect(hooks.editCells).not.toHaveBeenCalled();
  });
});

describe("a table that stages writes instead of applying them", () => {
  function staging(patch: Partial<AgentApply> = {}) {
    const hooks = apply(patch);
    return {
      hooks,
      session: createAgentSession({
        observe: () => observation({ commit: "stage", approval: "never" }),
        apply: hooks,
      }),
    };
  }

  it("refuses to add a row on a table that stages", async () => {
    const { hooks, session } = staging();

    const result = await session.execute(
      "rows.add",
      { rows: [{ name: "Grace" }] },
      1,
      "add"
    );

    // Staging is a cell-level idea. A new row has nowhere to be staged, so
    // the table says which commit mode it would need rather than half-doing it.
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("commit-incompatible");
    expect(hooks.addRows).not.toHaveBeenCalled();
  });

  it("stages an edit through the host's own stage hook", async () => {
    const { hooks, session } = staging();

    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );

    expect(result.ok).toBe(true);
    expect(hooks.stageCells).toHaveBeenCalled();
    expect(hooks.editCells).not.toHaveBeenCalled();
  });

  it("reports a stage nobody wired as needing no commit", async () => {
    const { hooks, session } = staging({ stageCells: undefined });

    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );

    // Nothing was written and nothing pretends otherwise: a table that stages
    // but wired no stage hook has nowhere to put the edit.
    expect(result.ok).toBe(true);
    expect(hooks.editCells).not.toHaveBeenCalled();
  });
});

describe("the aggregations an agent may change", () => {
  const AGGREGATIONS = {
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
  };

  function aggregating(patch: Partial<AgentObservation> = {}) {
    const hooks = apply({ setAggregations: vi.fn() });
    return {
      hooks,
      session: createAgentSession({
        observe: () =>
          observation({
            featureIds: ["editing", "grouping"],
            source: { ...PAGE_ONLY, grouping: "client" },
            aggregations: AGGREGATIONS,
            ...patch,
          }),
        apply: hooks,
      }),
    };
  }

  it("is offered only when the table publishes something to aggregate", () => {
    const withColumns = aggregating();
    expect(withColumns.session.manifest().capabilities).toContain(
      "view.setAggregations"
    );

    const withNone = aggregating({ aggregations: { columns: [], active: [] } });
    expect(withNone.session.manifest().capabilities).not.toContain(
      "view.setAggregations"
    );
  });

  it("is not offered on a table that does not group at all", () => {
    const flat = aggregating({ source: PAGE_ONLY });
    expect(flat.session.manifest().capabilities).not.toContain(
      "view.setAggregations"
    );
  });

  it("sets the operation the agent asked for", async () => {
    const { hooks, session } = aggregating();

    const result = await session.execute(
      "view.setAggregations",
      { set: { salary: "avg" } },
      1,
      "agg"
    );

    expect(result.ok).toBe(true);
    expect(hooks.setAggregations).toHaveBeenCalled();
  });

  it("refuses an operation the column does not offer", async () => {
    const { hooks, session } = aggregating();

    const result = await session.execute(
      "view.setAggregations",
      { set: { salary: "median" } },
      1,
      "agg"
    );

    expect(result.ok).toBe(false);
    expect(hooks.setAggregations).not.toHaveBeenCalled();
  });

  it("refuses a removal list that is not a list", async () => {
    const { session } = aggregating();

    const result = await session.execute(
      "view.setAggregations",
      { remove: "salary" },
      1,
      "agg"
    );

    expect(result.ok).toBe(false);
  });

  it("refuses a removal naming something that is not a column id", async () => {
    const { session } = aggregating();

    const result = await session.execute(
      "view.setAggregations",
      { remove: [""] },
      1,
      "agg"
    );

    expect(result.ok).toBe(false);
  });
});

describe("what a table that says the least still means", () => {
  /** A capability that declares only what it must. */
  const plain: AgentCapabilityDefinition = {
    key: "staff.ping",
    summary: "Say hello",
    guide: {
      guide: "Say hello.",
      input: { type: "object" },
      output: { type: "object" },
    },
    isEnabled: () => true,
    execute: () => ({ ok: true }),
  };

  it("treats a capability that declares no kind as a view", async () => {
    const onApprove = vi.fn(() => Promise.resolve(true));
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", commit: "immediate" }),
      apply: apply(),
      capabilities: [plain],
      onApprove,
    });

    const result = await session.execute("staff.ping", {}, 1, "ping");

    // A table that asks before writes does not ask before this one: something
    // that did not say it writes is not treated as though it does.
    expect(result.ok).toBe(true);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("runs a call that sent no arguments at all", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
      capabilities: [plain],
    });

    const result = await session.execute("staff.ping", undefined, 1, "ping");

    expect(result.ok).toBe(true);
  });

  it("stages by default when the table names no commit policy", async () => {
    const hooks = apply();
    const session = createAgentSession({
      observe: () => observation({ commit: undefined, approval: "never" }),
      apply: hooks,
    });

    await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );

    // The cautious default: a table that did not say goes through staging
    // rather than writing.
    expect(hooks.stageCells).toHaveBeenCalled();
    expect(hooks.editCells).not.toHaveBeenCalled();
  });

  it("asks in a widget when the table names no presentation", async () => {
    let seen: { presentation?: string } | undefined;
    const session = createAgentSession({
      observe: () =>
        observation({
          approval: "writes",
          commit: "immediate",
          presentation: undefined,
        }),
      apply: apply(),
      onApprove: (subject) => {
        seen = subject;
        return Promise.resolve(true);
      },
    });

    await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );

    expect(seen?.presentation).toBe("widget");
  });

  it("carries the always-allow list the table published", async () => {
    const onApprove = vi.fn(() => Promise.resolve(true));
    const session = createAgentSession({
      observe: () =>
        observation({
          approval: "writes",
          commit: "immediate",
          alwaysAllow: ["edit.cells"],
        }),
      apply: apply(),
      onApprove,
    });

    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada" }] },
      1,
      "ed"
    );

    // Naming a capability eligible is not the same as waving it through: the
    // reader still decides, and what they decide is remembered above this.
    expect(result.ok).toBe(true);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });
});
