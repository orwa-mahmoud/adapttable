/**
 * Cancellation, at every seam where a write has not started yet.
 *
 * A cancelled request must not become a write. That has nothing to do with
 * approval: a table with `approval: "never"` and no `onApprove` is still
 * cancellable, and the window that matters is the one where the session is
 * awaiting host code — planning a write, resolving a row, reading a cell —
 * with the handler still ahead of it.
 *
 * What cancellation cannot do is take back a callback the host has already
 * been given. So a bulk write that was cancelled part way keeps the rows it
 * wrote, reports them, and refuses to write them again on a retry — while a
 * request cancelled before ANY write leaves its key free to be used again.
 */
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentObservation,
  WriteExecuteResult,
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

const WINDOW = {
  offset: 0,
  limit: 10,
  redacted: [],
  rows: [
    { rowKey: "r1", cells: { name: "Ada" } },
    { rowKey: "r2", cells: { name: "Grace" } },
    { rowKey: "r3", cells: { name: "Lin" } },
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
    resolveRow: vi.fn((ref) =>
      "rowKey" in ref
        ? { rowKey: ref.rowKey, scope: "visible" as const }
        : { rowKey: "r1", scope: ref.scope, position: ref.position }
    ),
    editCells: vi.fn(),
    addRows: vi.fn(),
    deleteRows: vi.fn(),
    reorderRows: vi.fn(),
    ...patch,
  };
}

/** A promise the test decides when to settle. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function archiveCapability(
  execute: AgentCapabilityDefinition["execute"],
  plan?: AgentCapabilityDefinition["plan"]
): AgentCapabilityDefinition {
  return {
    key: "orders.archive",
    summary: "Archive orders",
    kind: "write",
    guide: {
      guide: "Archive the named orders.",
      input: { type: "object", properties: {} },
      output: { type: "object", properties: {} },
    },
    isEnabled: () => true,
    plan,
    execute,
  };
}

describe("a cancelled request never becomes a write", () => {
  it("stops a custom planner before its handler, with no approval in sight", async () => {
    const controller = new AbortController();
    const gate = deferred<void>();
    const execute = vi.fn(() => ({ archived: 1 }));
    const session = createAgentSession({
      observe: () => observation({ approval: "never" }),
      apply: apply(),
      capabilities: [
        archiveCapability(execute, async () => {
          controller.abort();
          await gate.promise;
          return { proposals: [] };
        }),
      ],
    });
    const running = session.execute(
      "orders.archive",
      {},
      1,
      "archive-1",
      controller.signal
    );
    gate.resolve();
    const result = await running;
    expect(execute).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("cancelled");
  });

  it("stops between the reservation and the handler", async () => {
    const controller = new AbortController();
    const execute = vi.fn(() => ({ archived: 1 }));
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
      capabilities: [archiveCapability(execute)],
    });
    // Reserved synchronously; the handler runs a microtask later.
    const running = session.execute(
      "orders.archive",
      {},
      1,
      "archive-2",
      controller.signal
    );
    controller.abort();
    const result = await running;
    expect(execute).not.toHaveBeenCalled();
    expect(result.error?.code).toBe("cancelled");
  });

  it("stops a built-in edit while the row is still being resolved", async () => {
    const controller = new AbortController();
    const editCells = vi.fn();
    const gate = deferred<void>();
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply({
        editCells,
        resolveRow: vi.fn(async (ref) => {
          controller.abort();
          await gate.promise;
          return {
            rowKey: "rowKey" in ref ? ref.rowKey : "r1",
            scope: "visible" as const,
          };
        }) as unknown as AgentApply["resolveRow"],
      }),
    });
    const running = session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Adah" }] },
      1,
      "edit-1",
      controller.signal
    );
    gate.resolve();
    const result = await running;
    expect(editCells).not.toHaveBeenCalled();
    expect(result.error?.code).toBe("cancelled");
  });

  it("leaves the key free when nothing was written", async () => {
    const controller = new AbortController();
    const execute = vi.fn(() => ({ archived: 1 }));
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
      capabilities: [archiveCapability(execute)],
    });
    const running = session.execute(
      "orders.archive",
      {},
      1,
      "archive-3",
      controller.signal
    );
    controller.abort();
    expect((await running).error?.code).toBe("cancelled");

    // The same key, uncancelled: a request that never wrote may be retried.
    const retried = await session.execute("orders.archive", {}, 1, "archive-3");
    expect(retried.ok).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("a bulk write that is cancelled part way", () => {
  it("keeps the rows it wrote, writes no more, and will not write them twice", async () => {
    const controller = new AbortController();
    const written: string[] = [];
    const deleteRows = vi.fn((keys: readonly string[]) => {
      written.push(...keys);
      controller.abort();
    });
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply({ deleteRows }),
    });
    const result = await session.execute(
      "rows.delete",
      { keys: ["r1", "r2", "r3"] },
      1,
      "delete-1",
      controller.signal
    );

    // One row went out; the rest were never attempted.
    expect(written).toEqual(["r1"]);
    expect(deleteRows).toHaveBeenCalledTimes(1);
    const payload = result.result as WriteExecuteResult;
    expect(payload.applied).toBe(false);
    expect(payload.results?.map((row) => [row.rowKey, row.ok])).toEqual([
      ["r1", true],
      ["r2", false],
      ["r3", false],
    ]);

    // Retrying the same key replays the partial outcome rather than
    // deleting r1 a second time.
    const retried = await session.execute(
      "rows.delete",
      { keys: ["r1", "r2", "r3"] },
      1,
      "delete-1"
    );
    expect(written).toEqual(["r1"]);
    expect(retried.result).toBeDefined();
  });
});

describe("what cancellation does not touch", () => {
  it("still asks for approval, and still refuses a stale revision", async () => {
    let revision = 1;
    const session = createAgentSession({
      observe: () =>
        observation({ approval: "writes", viewRevision: revision }),
      apply: apply(),
      capabilities: [archiveCapability(() => ({ archived: 1 }))],
    });
    const pending = await session.execute("orders.archive", {}, 1, "a-pending");
    expect((pending.result as WriteExecuteResult).approval).toBe("pending");

    revision = 2;
    const stale = await session.execute("orders.archive", {}, 1, "a-stale");
    expect(stale.error?.code).toBe("revision-mismatch");
  });

  it("hands a custom handler the signal and the guard", async () => {
    const controller = new AbortController();
    const seen: { signal: boolean; guard: boolean }[] = [];
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
      capabilities: [
        archiveCapability((context) => {
          seen.push({
            signal: context.signal === controller.signal,
            guard: typeof context.throwIfCancelled === "function",
          });
          // A multi-step handler stops itself between steps.
          controller.abort();
          context.throwIfCancelled();
          return { archived: 1 };
        }),
      ],
    });
    const result = await session.execute(
      "orders.archive",
      {},
      1,
      "archive-4",
      controller.signal
    );
    expect(seen).toEqual([{ signal: true, guard: true }]);
    expect(result.error?.code).toBe("cancelled");
  });
});
