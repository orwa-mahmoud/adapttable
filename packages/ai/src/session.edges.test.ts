/**
 * The refusals and the seams between them.
 *
 * A governed write is a sequence — plan, approve, revalidate, execute — and
 * every step of it awaits host code that can change the table underneath. The
 * cases here are the ones where that matters: an edit that names nothing, a
 * policy that flips while a human is deciding, a row that is not in the first
 * window read, and a handler that answers with something other than a write
 * result. Each has to end in a named refusal rather than a half-applied write.
 */
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentObservation,
  RowWindow,
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
  rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
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
    editCells: vi.fn().mockResolvedValue({ saved: 1 }),
    addRows: vi.fn(),
    deleteRows: vi.fn(),
    reorderRows: vi.fn(),
    ...patch,
  };
}

describe("edit.cells refuses an edit it cannot address", () => {
  it("refuses an empty edit list", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
    });
    const result = await session.execute("edit.cells", { edits: [] }, 1, "e0");
    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/at least one edit/);
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
      "e1"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("invalid-arguments");
    expect(result.error?.message).toMatch(/column is required/);
  });

  it("refuses an edit to a column the table does not expose as writable", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "ssn", value: "x" }] },
      1,
      "e2"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/ssn/);
  });

  it("refuses the write when the table moves while the plan is being built", async () => {
    let revision = 1;
    const session = createAgentSession({
      observe: () => observation({ viewRevision: revision }),
      apply: apply({
        resolveRow: vi.fn(() => {
          // The host re-fetched between the address and the peek.
          revision = 2;
          return { rowKey: "r1", scope: "visible" as const };
        }),
      }),
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Grace" }] },
      1,
      "e3"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("revision-mismatch");
  });
});

describe("the pre-edit peek", () => {
  it("keeps paging until it finds the row it is about to change", async () => {
    const pages: RowWindow[] = [
      {
        offset: 0,
        limit: 2,
        redacted: [],
        rows: [
          { rowKey: "r9", cells: { name: "Other" } },
          { rowKey: "r8", cells: { name: "Another" } },
        ],
      },
      {
        offset: 2,
        limit: 2,
        redacted: [],
        rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
      },
    ];
    const readRows = vi.fn((query: { offset: number }) =>
      Promise.resolve(pages[query.offset === 0 ? 0 : 1])
    );
    const session = createAgentSession({
      observe: () => observation({ readMax: 2 }),
      apply: apply({ readRows: readRows as unknown as AgentApply["readRows"] }),
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Grace" }] },
      1,
      "peek"
    );
    expect(result.ok).toBe(true);
    expect(readRows).toHaveBeenCalledTimes(2);
    const payload = result.result as WriteExecuteResult;
    expect(payload.proposals[0]?.before).toBe("Ada");
  });
});

describe("approval is re-checked against the table it will land on", () => {
  it("refuses a write the table stopped permitting while approval was pending", async () => {
    let policy: AgentObservation["writePolicy"] = "allow";
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", writePolicy: policy }),
      apply: apply(),
      capabilities: [
        {
          key: "orders.archive",
          summary: "Archive orders",
          kind: "write",
          guide: {
            guide: "Archive the named orders.",
            input: { type: "object", properties: {} },
            output: { type: "object", properties: {} },
          },
          isEnabled: () => true,
          execute: () => ({ archived: 1 }),
        },
      ],
      onApprove: () => {
        // A human took long enough for the host to lock the table down.
        policy = "deny";
        return Promise.resolve(true);
      },
    });
    const result = await session.execute("orders.archive", {}, 1, "late-deny");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("write-denied");
  });

  it("refuses a write whose capability was unwired while approval was pending", async () => {
    let wired = true;
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", hasEdit: wired }),
      apply: apply(),
      onApprove: () => {
        wired = false;
        return Promise.resolve(true);
      },
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Grace" }] },
      1,
      "late-unwire"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("not-wired");
  });

  it("reports a declined write as cancelled and leaves the host untouched", async () => {
    const editCells = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: apply({ editCells }),
      onApprove: () => Promise.resolve(false),
    });
    const result = await session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Grace" }] },
      1,
      "declined"
    );
    expect(result.ok).toBe(true);
    const payload = result.result as WriteExecuteResult;
    expect(payload.approval).toBe("rejected");
    expect(payload.applied).toBe(false);
    expect(editCells).not.toHaveBeenCalled();
  });
});

describe("a custom capability keeps its own payload", () => {
  function custom(
    execute: AgentCapabilityDefinition["execute"]
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
      execute,
    };
  }

  it("passes a non-write answer through unchanged", async () => {
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: apply(),
      capabilities: [custom(() => ({ archived: 2 }))],
      onApprove: () => Promise.resolve(true),
    });
    const result = await session.execute("orders.archive", {}, 1, "a1");
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ archived: 2 });
  });

  it("makes the session's own decision the authority on a write answer", async () => {
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: apply(),
      capabilities: [
        custom(() => ({
          proposals: [],
          applied: true,
          approval: "not-required" as const,
        })),
      ],
      onApprove: () => Promise.resolve(true),
    });
    const result = await session.execute("orders.archive", {}, 1, "a2");
    const payload = result.result as WriteExecuteResult;
    expect(payload.approval).toBe("approved");
  });

  it("leaves a handler's own refusal alone", async () => {
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: apply(),
      capabilities: [
        custom(() => ({
          proposals: [],
          applied: false,
          approval: "cancelled" as const,
        })),
      ],
      onApprove: () => Promise.resolve(true),
    });
    const result = await session.execute("orders.archive", {}, 1, "a3");
    // A cancelled write is unfinished: nothing landed, so the session reports
    // the refusal rather than caching a result to replay.
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("cancelled");
    expect(result.result).toBeUndefined();
  });
});

describe("the session refuses what it does not know", () => {
  it("names an unknown capability rather than throwing", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: apply(),
    });
    const result = await session.execute("orders.teleport", {}, 1, "x1");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("unknown-capability");
  });
});
