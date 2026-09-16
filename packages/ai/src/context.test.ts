import { describe, expect, it, vi } from "vitest";

import { buildAgentContext, rowProvenance } from "./context";
import { agentPagination } from "./pagination";
import { createAgentSession } from "./session";
import type { AgentColumn, AgentObservation, AgentSession } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function column(patch: Partial<AgentColumn> & { id: string }): AgentColumn {
  return {
    label: patch.id,
    type: "string",
    readable: true,
    writable: false,
    sortable: true,
    ...patch,
  };
}

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 4,
    featureIds: ["filters"],
    columns: [column({ id: "name" }), column({ id: "salary", type: "number" })],
    source: PAGE_ONLY,
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: true,
    hasExport: false,
    hasEdit: true,
    hasReorder: false,
    page: 2,
    limit: 25,
    search: "ada",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

function tableSession(patch: Partial<AgentObservation> = {}): AgentSession {
  return createAgentSession({
    observe: () => observation(patch),
    apply: {
      setPage: vi.fn(),
      setSearch: vi.fn(),
      setSort: vi.fn(),
      setFilters: vi.fn(),
      editCells: vi.fn(),
      resolveRow: () => ({ rowKey: "r1", scope: "visible" as const }),
      readRows: () => ({
        offset: 0,
        limit: 1,
        redacted: [],
        rows: [{ rowKey: "r1", cells: { name: "Ada" } }],
      }),
    },
  });
}

describe("the permitted contract", () => {
  it("carries only capabilities the table actually wires", () => {
    const context = buildAgentContext(tableSession({ hasEdit: false }));
    const keys = context.contract.capabilities.map((entry) => entry.key);

    expect(keys).toContain("view.setPage");
    expect(keys).not.toContain("edit.cells");
  });

  it("takes page size from the session when the host sent no view", () => {
    // HTTP builds context from the session alone. Defaulting that size to 10
    // is how a model was told a 25-row table was already at 10, and never
    // called setLimit.
    const context = buildAgentContext(
      tableSession({
        page: 1,
        limit: 25,
        pagination: agentPagination({
          page: 1,
          pageSize: 25,
          pageSizeOptions: [10, 25, 50, 100],
          totalRows: 8,
          canJump: true,
        }),
      })
    );

    expect(context.view.limit).toBe(25);
    expect(context.view.page).toBe(1);
    expect(context.view.unknown).not.toContain("limit");
  });

  it("names aggregation operations from the session when the host sent none", () => {
    const context = buildAgentContext(
      tableSession({
        featureIds: ["grouping-panel"],
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
      })
    );

    expect(
      context.contract.aggregations?.columns[0]?.operations.map((op) => op.id)
    ).toEqual(["sum", "avg"]);
  });

  it("leaves out a capability the host excluded", () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage: vi.fn(), setSort: vi.fn() },
      excludeCapabilities: ["view.setSort"],
    });
    const context = buildAgentContext(session);
    const keys = context.contract.capabilities.map((entry) => entry.key);

    expect(keys).toContain("view.setPage");
    expect(keys).not.toContain("view.setSort");
  });

  it("refuses to describe or run an excluded capability", async () => {
    const setSort = vi.fn();
    const session = createAgentSession({
      observe: () => observation(),
      apply: { setPage: vi.fn(), setSort },
      excludeCapabilities: ["view.setSort"],
    });

    // A hidden chip is not enforcement. The executor refuses it too.
    expect(() => session.describe("view.setSort")).toThrow(/not wired/);
    const result = await session.execute(
      "view.setSort",
      { key: "name", dir: "asc" },
      4,
      "k"
    );
    expect(result.ok).toBe(false);
    expect(setSort).not.toHaveBeenCalled();
  });

  it("tells visibility, readability and writability apart", () => {
    const context = buildAgentContext(
      tableSession({
        columns: [
          column({ id: "name", writable: true, visible: true }),
          column({ id: "ssn", readable: false, visible: true }),
          column({ id: "notes", visible: false }),
        ],
      })
    );
    const byId = new Map(
      context.contract.columns.map((entry) => [entry.id, entry])
    );

    // A column nobody can read and a column nobody is looking at are not the
    // same fact, and neither is called "hidden".
    expect(byId.get("ssn")?.readable).toBe(false);
    expect(byId.get("ssn")?.visible).toBe(true);
    expect(byId.get("notes")?.readable).toBe(true);
    expect(byId.get("notes")?.visible).toBe(false);
    expect(byId.get("name")?.writable).toBe(true);
  });

  it("carries an author's description and validated examples", () => {
    const context = buildAgentContext(
      tableSession({
        columns: [
          column({
            id: "salary",
            type: "number",
            ai: {
              description: "Annual gross, in the table's own currency.",
              examples: [120000, "not a number", 90000],
            },
          }),
        ],
      })
    );
    const salary = context.contract.columns[0];

    expect(salary?.description).toMatch(/Annual gross/);
    // An example of the wrong type teaches a call that will be refused.
    expect(salary?.examples).toEqual([120000, 90000]);
  });

  it("never carries examples for a column the agent cannot read", () => {
    const context = buildAgentContext(
      tableSession({
        columns: [
          column({
            id: "ssn",
            readable: false,
            ai: { description: "Tax id.", examples: ["123-45-6789"] },
          }),
        ],
      })
    );

    expect(context.contract.columns[0]?.examples).toBeUndefined();
  });

  it("names itself, and renames itself when the table changes", () => {
    const first = buildAgentContext(tableSession()).contract.version;
    const same = buildAgentContext(tableSession()).contract.version;
    const relabelled = buildAgentContext(
      tableSession({ columns: [column({ id: "name", label: "Full name" })] })
    ).contract.version;

    expect(same).toBe(first);
    expect(relabelled).not.toBe(first);
  });

  it("does not change its name when only the view moves", () => {
    const first = buildAgentContext(tableSession()).contract.version;
    const later = buildAgentContext(tableSession({ viewRevision: 99, page: 9 }))
      .contract.version;

    expect(later).toBe(first);
  });
});

describe("the view state", () => {
  it("is kept apart from the contract, with its own revision", () => {
    const context = buildAgentContext(
      tableSession(),
      {},
      {
        view: { page: 2, limit: 25, search: "ada", sortBy: "name" },
      }
    );

    expect(context.view.revision).toBe(4);
    expect(context.view.page).toBe(2);
    expect(context.view.sortBy).toBe("name");
    expect(context.contract).not.toHaveProperty("page");
  });

  it("says which fields nobody published rather than inventing them", () => {
    const context = buildAgentContext(tableSession());

    // A model told the page is 1 when nobody said so would act on a fact
    // nobody asserted.
    expect(context.view.unknown).toContain("page");
    expect(context.view.unknown).toContain("search");
  });

  it("drops filter state for a key the contract does not carry", () => {
    const context = buildAgentContext(
      tableSession(),
      {},
      {
        view: { filters: { ssn: "123-45-6789", status: "Active" } },
      }
    );

    // An excluded field must not come back through the current-filter bag.
    expect(context.view.filters).toBeUndefined();
  });

  it("keeps filter state whose keys the contract does carry", () => {
    const context = buildAgentContext(
      tableSession(),
      {},
      {
        filters: [
          {
            key: "status",
            label: "Status",
            type: "select",
            operators: ["in"],
            defaultOperator: "in",
            valueKeys: ["status"],
          },
        ],
        view: { filters: { status: "Active", ssn: "secret" } },
      }
    );

    expect(context.view.filters).toEqual({ status: "Active" });
  });
});

describe("what the selection reports", () => {
  it("measures the contract and the view separately", () => {
    const context = buildAgentContext(tableSession());

    expect(context.selection.contractBytes).toBeGreaterThan(0);
    expect(context.selection.viewBytes).toBeGreaterThan(0);
    expect(context.selection.viewBytes).toBeLessThan(
      context.selection.contractBytes
    );
  });

  it("marks an estimate as an estimate", () => {
    const guessed = buildAgentContext(tableSession());
    const counted = buildAgentContext(tableSession(), {
      estimateTokens: () => 42,
    });

    expect(guessed.selection.estimated).toBe(true);
    expect(counted.selection.estimated).toBe(false);
    expect(counted.selection.estimatedTokens).toBe(42);
  });

  it("names the budget the caller set, not what the columns left over", () => {
    // The payload is budgeted whole, so guides receive the remainder after the
    // columns. Reporting that remainder tells a reader their budget is zero
    // when they asked for a thousand.
    //
    // Above the floor every column costs bare — columns are never dropped to
    // fit, only their descriptions — and below what the guides want, which is
    // the gap this is about.
    const context = buildAgentContext(tableSession(), {
      profile: "compact",
      tokenBudget: 800,
    });

    // The guide-deferral note specifically: the over-budget note below names
    // the same number, so reading them joined would prove nothing.
    const guideNote = (context.selection.notes ?? []).find((note) =>
      note.includes("guide(s) were deferred")
    );
    expect(guideNote).toMatch(/800-token budget/);
  });

  it("says when the contract lands over its budget, and why", () => {
    const context = buildAgentContext(tableSession(), {
      profile: "compact",
      tokenBudget: 800,
    });

    // The common operations keep their guidance whatever the budget says, so
    // a small budget is missed rather than met by cutting them. Missing it
    // silently would leave the reported size to be discovered by a provider.
    expect(context.selection.estimatedTokens).toBeGreaterThan(800);
    expect((context.selection.notes ?? []).join(" ")).toMatch(
      /over the 800-token budget/
    );
  });

  it("says nothing about a budget the contract fits inside", () => {
    const context = buildAgentContext(tableSession(), { profile: "full" });

    expect((context.selection.notes ?? []).join(" ")).not.toMatch(/over the/);
  });

  it("gives the selection a name covering the settings as well", () => {
    const compact = buildAgentContext(tableSession(), { profile: "compact" });
    const full = buildAgentContext(tableSession(), { profile: "full" });

    // Switching profile must not let a backend reuse the other payload.
    expect(full.selection.version).not.toBe(compact.selection.version);
    expect(full.contract.version).toBe(compact.contract.version);
  });
});

describe("rows as they reach a model", () => {
  it("are labelled as somebody's untrusted data, at a revision", () => {
    const envelope = rowProvenance(
      { offset: 0, limit: 1, redacted: [], rows: [] },
      7
    );

    expect(envelope.source).toBe("table-rows");
    expect(envelope.untrusted).toBe(true);
    expect(envelope.revision).toBe(7);
  });

  it("come out of the session already labelled", async () => {
    const session = tableSession();
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 1 },
      4,
      "read-1"
    );

    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({
      source: "table-rows",
      untrusted: true,
      revision: 4,
    });
  });
});
