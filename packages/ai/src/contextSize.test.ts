/**
 * What the permitted context actually costs, measured on three fixtures.
 *
 * The numbers this prints go in the item receipt; nothing here asserts a
 * millisecond, because a timing threshold is decided by whatever else the
 * machine is doing and this repository has already paid for one of those.
 * What it does assert is the shape the cost has: a contract grows with the
 * columns and capabilities a table offers, a compact profile defers guides
 * rather than truncating them, and rows do not enter into it at all.
 */
import { describe, expect, it, vi } from "vitest";

import { buildAgentContext } from "./context";
import { createAgentSession } from "./session";
import type {
  AgentApply,
  AgentColumn,
  AgentObservation,
  AgentSession,
} from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function column(id: string, index: number): AgentColumn {
  return {
    id,
    label: `Column ${String(index)}`,
    type: index % 3 === 0 ? "number" : "string",
    readable: true,
    writable: index % 2 === 0,
    sortable: true,
  };
}

function columns(count: number): AgentColumn[] {
  return Array.from({ length: count }, (_, i) => column(`c${String(i)}`, i));
}

/** The narrowest table that still answers: read the view, nothing else. */
const MINIMAL: Partial<AgentObservation> = {
  featureIds: [],
  columns: columns(2),
  hasPagination: false,
  hasSearch: false,
  hasSort: false,
  hasFilters: false,
  hasExport: false,
  hasEdit: false,
  hasReorder: false,
};

/** Everything this engine offers, on a table of ordinary width. */
const FULL: Partial<AgentObservation> = {
  featureIds: ["filters", "editing", "grouping", "export"],
  columns: columns(12),
};

/** The same full feature set, on a table nobody designed for a model. */
const WIDE: Partial<AgentObservation> = {
  featureIds: ["filters", "editing", "grouping", "export"],
  columns: columns(220),
};

function tableSession(
  patch: Partial<AgentObservation> = {},
  apply: AgentApply = {}
): AgentSession {
  return createAgentSession({
    observe: (): AgentObservation => ({
      tableId: "sized",
      viewRevision: 1,
      featureIds: ["filters", "editing"],
      columns: columns(12),
      source: PAGE_ONLY,
      writePolicy: "allow",
      approval: "never",
      commit: "immediate",
      hasPagination: true,
      hasSearch: true,
      hasSort: true,
      hasFilters: true,
      hasExport: true,
      hasEdit: true,
      hasReorder: true,
      page: 1,
      limit: 25,
      search: "",
      pageMax: 4,
      readMax: 50,
      rowAddressScope: "visible",
      ...patch,
    }),
    apply: {
      setPage: vi.fn(),
      setSearch: vi.fn(),
      setSort: vi.fn(),
      setFilters: vi.fn(),
      editCells: vi.fn(),
      runExport: vi.fn(),
      ...apply,
    },
  });
}

/** A table standing on `rows` of data, whichever window is asked for. */
function holding(rows: number): AgentApply {
  return {
    readRows: (query) => ({
      offset: query.offset,
      limit: query.limit,
      redacted: [],
      rows: Array.from(
        { length: Math.max(0, Math.min(query.limit, rows - query.offset)) },
        (_, i) => ({
          rowKey: `r${String(query.offset + i)}`,
          cells: { c0: "value" },
        })
      ),
    }),
  };
}

/** One fixture's figures, in the shape the receipt reports them. */
function measure(
  patch: Partial<AgentObservation>,
  profile: "compact" | "full"
) {
  const built = buildAgentContext(tableSession(patch), { profile });
  return {
    columns: built.contract.columns.length,
    contractBytes: built.selection.contractBytes,
    viewBytes: built.selection.viewBytes,
    estimatedTokens: built.selection.estimatedTokens,
    upfront: built.selection.selected.length,
    deferred: built.selection.deferred.length,
  };
}

describe("what the context costs across fixtures", () => {
  it("grows with the table, and the receipt reports the figures", () => {
    const rows = [
      ["minimal", measure(MINIMAL, "full")],
      ["full-feature", measure(FULL, "full")],
      ["220 columns", measure(WIDE, "full")],
      ["220 columns, compact", measure(WIDE, "compact")],
    ] as const;
    // Printed rather than asserted against a number somebody invented: the
    // figures belong in the item receipt, where a human reads them beside the
    // build they came from.
    for (const [name, m] of rows) {
      console.log(
        `${name.padEnd(22)} columns ${String(m.columns).padStart(3)}  ` +
          `contract ${String(m.contractBytes).padStart(6)} B  ` +
          `view ${String(m.viewBytes).padStart(4)} B  ` +
          `~${String(m.estimatedTokens).padStart(5)} tokens  ` +
          `upfront ${String(m.upfront)}  deferred ${String(m.deferred)}`
      );
    }

    const [, minimal] = rows[0];
    const [, full] = rows[1];
    const [, wide] = rows[2];
    // A narrower table with fewer capabilities costs less, in that order.
    expect(minimal.contractBytes).toBeLessThan(full.contractBytes);
    expect(full.contractBytes).toBeLessThan(wide.contractBytes);
    // The view is where the table is, not what it holds: it does not grow
    // with the columns.
    expect(wide.viewBytes).toBeLessThan(full.contractBytes);
  });

  it("brings a wide table inside the compact budget", () => {
    const compact = measure(WIDE, "compact");
    const full = measure(WIDE, "full");

    // 220 columns used to cost the same either way: the budget governed
    // capability guides, and the column list — the whole cost on a table this
    // wide — was not counted at all. The payload is budgeted whole now.
    expect(compact.contractBytes).toBeLessThan(full.contractBytes);
    expect(compact.estimatedTokens).toBeLessThan(full.estimatedTokens);
  });

  it("defers column descriptions by name, and keeps every capability", () => {
    const wide = buildAgentContext(tableSession(WIDE), { profile: "compact" });
    const full = buildAgentContext(tableSession(WIDE), { profile: "full" });

    // Nothing was truncated and nothing was taken away: the columns that did
    // not fit are named, so a model knows they exist and can ask.
    const deferred = wide.selection.deferredColumns ?? [];
    expect(deferred.length).toBeGreaterThan(0);
    expect(wide.contract.columns.length + deferred.length).toBe(
      full.contract.columns.length
    );
    expect(wide.selection.notes?.join(" ")).toMatch(/columns\.describe/);

    // Every capability the table offers is still offered. A budget decides
    // what is described, never what may be done.
    expect(wide.contract.capabilities.map((c) => c.key)).toEqual(
      full.contract.capabilities.map((c) => c.key)
    );
  });

  it("refuses a budget nothing can satisfy, and says what the floor is", () => {
    // Only for a budget the caller chose. The default compact budget degrades
    // with a note instead — a wide table is not a broken one.
    expect(() =>
      buildAgentContext(tableSession(WIDE), { tokenBudget: 50 })
    ).toThrow(/cannot be met/);
  });
});

describe("rows and the cost of a context", () => {
  it("costs the same whatever the table holds", () => {
    // Two tables with the same columns and the same capabilities, one holding
    // ten rows and one holding a hundred thousand. The contract is identical
    // to the byte. This is "context work must not grow with rows" stated as an
    // identity rather than as a stopwatch, which is the only way to state it
    // without the answer depending on what else the machine is doing.
    const few = buildAgentContext(tableSession(FULL, holding(10)));
    const many = buildAgentContext(tableSession(FULL, holding(100_000)));

    expect(many.selection.contractBytes).toBe(few.selection.contractBytes);
    expect(many.contract.version).toBe(few.contract.version);
  });

  it("reads no rows while building, however it is asked", () => {
    const readRows = vi.fn();
    const session = tableSession(FULL, { readRows });

    buildAgentContext(session, { profile: "full" });
    buildAgentContext(session, { profile: "compact" });

    expect(readRows).not.toHaveBeenCalled();
  });
});
