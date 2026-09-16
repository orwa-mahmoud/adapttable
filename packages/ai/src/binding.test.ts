import { describe, expect, it } from "vitest";

import { displayProposals, type ProposalResolver } from "./binding";

/** A table the reader is looking at, with one column they may not see. */
function resolver(patch: Partial<ProposalResolver> = {}): ProposalResolver {
  const rows: Record<string, Record<string, unknown>> = {
    r1: { name: "Ada", salary: 120, notes: "" },
    r2: { name: "Grace", salary: 140, notes: "" },
  };
  return {
    rowLabel: (rowKey) => rows[rowKey]?.name as string | undefined,
    cellValue: (rowKey, column) => rows[rowKey]?.[column],
    readable: (column) => column !== "salary",
    columnLabel: (column) => (column === "name" ? "Full name" : undefined),
    ...patch,
  };
}

describe("what a reader is shown beside Approve", () => {
  it("resolves the value from the table in front of them", () => {
    const shown = displayProposals(
      [{ rowKey: "r1", column: "name", after: "Ada Lovelace" }],
      resolver()
    );

    expect(shown[0]).toEqual({
      rowKey: "r1",
      rowLabel: "Ada",
      column: "name",
      columnLabel: "Full name",
      before: "Ada",
      after: "Ada Lovelace",
    });
  });

  it("says a value is unavailable rather than drawing it blank", () => {
    const shown = displayProposals(
      [{ rowKey: "r1", column: "salary", after: 200 }],
      resolver()
    );

    // Viewing the table is not entitlement to every cell in it.
    expect(shown[0]?.beforeUnavailable).toBe(true);
    expect(shown[0]).not.toHaveProperty("before");
  });

  it("tells an empty cell apart from one nobody could read", () => {
    const shown = displayProposals(
      [
        { rowKey: "r1", column: "notes", after: "checked" },
        { rowKey: "r1", column: "salary", after: 1 },
      ],
      resolver()
    );

    // An empty string is a value; it is reported as one.
    expect(shown[0]?.before).toBe("");
    expect(shown[0]?.beforeUnavailable).toBeUndefined();
    expect(shown[1]?.beforeUnavailable).toBe(true);
  });

  it("reports a row the table cannot find as unavailable", () => {
    const shown = displayProposals(
      [{ rowKey: "gone", column: "name", after: "x" }],
      resolver()
    );

    expect(shown[0]?.rowKey).toBe("gone");
    expect(shown[0]?.rowLabel).toBeUndefined();
    expect(shown[0]?.beforeUnavailable).toBe(true);
  });

  it("leaves out a label the table cannot supply", () => {
    const shown = displayProposals(
      [{ rowKey: "r1", column: "notes", after: "x" }],
      resolver()
    );

    expect(shown[0]).not.toHaveProperty("columnLabel");
  });

  it("carries a row-level proposal as the row, with no value claim", () => {
    // A deletion names no column, so there is no cell to be unavailable.
    // Saying there is put "Grace: Unavailable → —" in front of a reader being
    // asked to delete her.
    const shown = displayProposals([{ rowKey: "r2" }], resolver());

    expect(shown[0]).toEqual({ rowKey: "r2", rowLabel: "Grace" });
  });

  it("keeps plan order", () => {
    const shown = displayProposals(
      [
        { rowKey: "r2", column: "name", after: "G" },
        { rowKey: "r1", column: "name", after: "A" },
      ],
      resolver()
    );

    expect(shown.map((entry) => entry.rowKey)).toEqual(["r2", "r1"]);
  });
});
