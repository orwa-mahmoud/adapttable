import { describe, expect, it, vi } from "vitest";

import { buildAgentContext } from "./context";
import { sampleColumns, sampleColumnValues } from "./contextSampling";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession, RowWindow } from "./types";

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
        id: "team",
        label: "Team",
        type: "string",
        readable: true,
        writable: false,
        sortable: true,
        ai: { sample: true },
      },
      {
        id: "total",
        label: "Total",
        type: "number",
        readable: true,
        writable: false,
        sortable: true,
      },
      {
        id: "ssn",
        label: "SSN",
        type: "string",
        readable: false,
        writable: false,
        sortable: false,
        ai: { sample: true },
      },
    ],
    source: PAGE_ONLY,
    writePolicy: "deny",
    hasPagination: true,
    hasSearch: false,
    hasSort: false,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 25,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

function rows(cells: readonly Record<string, unknown>[]): RowWindow {
  return {
    offset: 0,
    limit: cells.length,
    redacted: [],
    rows: cells.map((values, index) => ({
      rowKey: `r${String(index)}`,
      cells: values,
    })),
  };
}

function table(
  window: RowWindow,
  patch: Partial<AgentObservation> = {},
  extra: Record<string, unknown> = {}
): AgentSession {
  return createAgentSession({
    observe: () => observation(patch),
    apply: { readRows: () => window },
    ...extra,
  });
}

describe("sampling one column", () => {
  it("reads a few real values through the session's own executor", async () => {
    const readRows = vi.fn(() => rows([{ team: "Core" }, { team: "Ops" }]));
    const session = createAgentSession({
      observe: () => observation(),
      apply: { readRows },
    });

    expect(await sampleColumnValues(session, "team")).toEqual(["Core", "Ops"]);
    expect(readRows).toHaveBeenCalledWith(
      expect.objectContaining({ columns: ["team"], offset: 0 })
    );
  });

  it("never samples a column the agent may not read", async () => {
    const readRows = vi.fn(() => rows([{ ssn: "111-22-3333" }]));
    const session = createAgentSession({
      observe: () => observation(),
      apply: { readRows },
    });

    // Unreadable is a permission, not a preference — and the read is never
    // even attempted.
    expect(await sampleColumnValues(session, "ssn")).toEqual([]);
    expect(readRows).not.toHaveBeenCalled();
  });

  it("says nothing when the table offers no reads", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: { readRows: () => rows([{ team: "Core" }]) },
      excludeCapabilities: ["rows.read"],
    });

    expect(await sampleColumnValues(session, "team")).toEqual([]);
  });

  it("drops duplicates, blanks and values of the wrong type", async () => {
    const session = table(
      rows([
        { total: 10 },
        { total: 10 },
        { total: null },
        { total: "not a number" },
        { total: 20 },
      ])
    );

    expect(await sampleColumnValues(session, "total")).toEqual([10, 20]);
  });

  it("stops at the cap however many rows came back", async () => {
    const session = table(
      rows(Array.from({ length: 25 }, (_, index) => ({ total: index })))
    );

    expect(await sampleColumnValues(session, "total")).toHaveLength(5);
  });

  it("says nothing about a column the read redacted", async () => {
    const session = table({
      offset: 0,
      limit: 1,
      redacted: ["team"],
      rows: [{ rowKey: "r0", cells: {} }],
    });

    expect(await sampleColumnValues(session, "team")).toEqual([]);
  });

  it("says nothing about a column this table does not have", async () => {
    const session = table(rows([{ team: "Core" }]));

    expect(await sampleColumnValues(session, "nope")).toEqual([]);
  });
});

describe("sampling what the author opted in", () => {
  it("returns only the columns that produced values", async () => {
    const session = table(rows([{ team: "Core" }, { team: "Ops" }]));

    expect(await sampleColumns(session, ["team", "ssn"])).toEqual({
      team: ["Core", "Ops"],
    });
  });
});

describe("what the contract says about them", () => {
  it("marks sampled values as sampled, and authored ones not", () => {
    const session = createAgentSession({
      observe: () =>
        observation({
          columns: [
            {
              id: "team",
              label: "Team",
              type: "string",
              readable: true,
              writable: false,
              sortable: true,
              ai: { sample: true, examples: ["Authored"] },
            },
            {
              id: "total",
              label: "Total",
              type: "number",
              readable: true,
              writable: false,
              sortable: true,
              ai: { examples: [1, 2] },
            },
          ],
        }),
      apply: { readRows: () => rows([{ team: "Core" }]) },
    });

    const { contract } = buildAgentContext(session, undefined, {
      samples: { team: ["Core", "Ops"] },
    });

    const team = contract.columns.find((column) => column.id === "team");
    expect(team).toMatchObject({ examples: ["Core", "Ops"], sampled: true });
    const total = contract.columns.find((column) => column.id === "total");
    expect(total).toMatchObject({ examples: [1, 2] });
    expect(total?.sampled).toBeUndefined();
  });

  it("reads no rows of its own while building a contract", () => {
    const readRows = vi.fn(() => rows([{ team: "Core" }]));
    const session = createAgentSession({
      observe: () => observation(),
      apply: { readRows },
    });

    buildAgentContext(session);

    // The builder is synchronous and performs no I/O. `sample` on its own
    // changes nothing here; the host runs the sampling route and hands values in.
    expect(readRows).not.toHaveBeenCalled();
  });

  it("keeps an unreadable column's sampled values out even if handed some", () => {
    const session = table(rows([]));

    const { contract } = buildAgentContext(session, undefined, {
      samples: { ssn: ["111-22-3333"] },
    });

    const ssn = contract.columns.find((column) => column.id === "ssn");
    expect(ssn?.examples).toBeUndefined();
    expect(ssn?.sampled).toBeUndefined();
  });
});
