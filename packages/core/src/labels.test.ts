import { describe, expect, it } from "vitest";

import { defaultLabels, resolveLabels } from "./labels";

describe("resolveLabels", () => {
  it("returns the defaults when no overrides are given", () => {
    expect(resolveLabels(undefined)).toBe(defaultLabels);
  });

  it("merges overrides on top of the defaults", () => {
    const merged = resolveLabels({ search: "Buscar" });
    expect(merged.search).toBe("Buscar");
    expect(merged.noData).toBe(defaultLabels.noData);
  });

  it("ignores undefined override entries", () => {
    const merged = resolveLabels({ search: undefined, filters: "Filtros" });
    expect(merged.search).toBe(defaultLabels.search);
    expect(merged.filters).toBe("Filtros");
  });

  it("overrides function labels", () => {
    const merged = resolveLabels({ selectedCount: (n) => `${n} picked` });
    expect(merged.selectedCount(3)).toBe("3 picked");
  });
});

describe("defaultLabels", () => {
  it("provides English builders", () => {
    expect(defaultLabels.showing({ from: 1, to: 10, total: 50 })).toBe(
      "Showing 1–10 of 50"
    );
    expect(defaultLabels.pageOf({ page: 2, total: 5 })).toBe("Page 2 of 5");
    expect(defaultLabels.selectedCount(3)).toBe("3 selected");
    expect(defaultLabels.goToPage(4)).toBe("Go to page 4");
  });
});

it("formats the select-all-matching banner labels", () => {
  expect(defaultLabels.pageSelected(8)).toBe("All 8 on this page selected");
  expect(defaultLabels.selectAllMatching(57)).toBe("Select all 57 matching");
  expect(defaultLabels.allMatchingSelected(57)).toBe(
    "All 57 matching selected"
  );
});

describe("defaultLabels — every function label", () => {
  /** One argument per label whose shape is not a plain count. */
  const ARGS: Record<string, unknown[]> = {
    showing: [{ from: 1, to: 10, total: 42 }],
    page: [{ page: 3, total: 9 }],
    removeFilter: ["Status"],
    exportFile: ["xlsx"],
    gridCellPosition: [4, 100],
    gridRangeSelection: [
      { fromRow: 1, toRow: 2, fromColumn: 3, toColumn: 4, cells: 8 },
    ],
    findMatchCount: [2, 7],
    assistantReceiptStatus: ["staged"],
    assistantReceiptAction: [{ kind: "filter", status: "executed" }],
    assistantReceiptTerms: [
      { kind: "filter", terms: [{ column: "COLUMN_X", value: "VALUE_X" }] },
    ],
    assistantReceiptChange: [{ before: "BEFORE_X", after: "AFTER_X" }],
    groupTotal: ["Core"],
    proposalChange: [
      {
        row: "ROW_X",
        column: "COLUMN_X",
        before: "BEFORE_X",
        after: "AFTER_X",
      },
    ],
    columnRenamed: [{ previous: "COLUMN_OLD", name: "COLUMN_NEW" }],
    assistantConnection: ["connecting"],
    // Both answer `undefined` for a token this language has no sentence for,
    // so they are given one it does.
    assistantUndoBlocked: ["table-moved"],
    assistantCapabilityName: ["edit.cells"],
    assistantAlwaysAllowedRevoke: ["edit.cells"],
    assistantReceipt: [{ capability: "view.setGroupBy", status: "executed" }],
    sortedBy: [{ column: "COLUMN_X", ascending: true }],
  };

  it("returns a real string for the arguments it is given", () => {
    for (const [key, value] of Object.entries(defaultLabels)) {
      if (typeof value !== "function") continue;
      const args = ARGS[key] ?? [3];
      const out = (value as (...a: unknown[]) => string)(...args);
      expect(out, key).toBeTypeOf("string");
      expect(out.length, key).toBeGreaterThan(0);
    }
  });

  it("says one cell, not one cells", () => {
    // Counting labels read as English at 1 as well as at 12.
    for (const key of [
      "gridRangeCopied",
      "gridRangePasted",
      "gridRangeFilled",
      "editUndone",
      "editRedone",
    ] as const) {
      const label = defaultLabels[key];
      expect(label(1), key).toContain("1 cell ");
      expect(label(4), key).toContain("4 cells ");
    }
  });

  it("says No matches when a find turns up nothing", () => {
    expect(defaultLabels.findMatchCount(1, 0)).toBe("No matches");
  });

  it("formats one pending proposal and a change without a column or value", () => {
    expect(defaultLabels.pendingProposals(1)).toBe("1 proposed change");
    expect(defaultLabels.pendingProposals(3)).toBe("3 proposed changes");
    expect(defaultLabels.proposalChange({ row: "ROW_X" })).toBe("ROW_X");
    expect(
      defaultLabels.proposalChange({
        row: "ROW_X",
        column: "COLUMN_X",
        after: "AFTER_X",
      })
    ).toContain("AFTER_X");
    expect(
      defaultLabels.proposalChange({
        row: "ROW_X",
        column: "COLUMN_X",
        before: "BEFORE_X",
      })
    ).toContain("BEFORE_X");
  });
});

describe("what a receipt card says happened", () => {
  it("separates taking a filter off from putting one on", () => {
    expect(
      defaultLabels.assistantReceiptAction({
        kind: "filter",
        status: "executed",
      })
    ).toBe("Filter applied");
    expect(
      defaultLabels.assistantReceiptAction({
        kind: "filter",
        status: "executed",
        cleared: true,
      })
    ).toBe("Filters cleared");
  });

  it("words a filter and an edit differently from the same pair", () => {
    const terms = [{ column: "Salary", value: "185" }];
    expect(defaultLabels.assistantReceiptTerms({ kind: "filter", terms })).toBe(
      "Salary is 185"
    );
    expect(defaultLabels.assistantReceiptTerms({ kind: "edit", terms })).toBe(
      "Salary set to 185"
    );
  });

  it("joins several terms, and names the sort direction", () => {
    expect(
      defaultLabels.assistantReceiptTerms({
        kind: "filter",
        terms: [
          { column: "Team", value: "Platform" },
          { column: "Status", value: "Active" },
        ],
      })
    ).toBe("Team is Platform, Status is Active");
    expect(
      defaultLabels.assistantReceiptTerms({
        kind: "sort",
        terms: [{ column: "Salary" }],
        direction: "desc",
      })
    ).toBe("Salary, descending");
  });

  it("says nothing when there is nothing to name", () => {
    expect(
      defaultLabels.assistantReceiptTerms({ kind: "filter", terms: [] })
    ).toBeUndefined();
    expect(
      defaultLabels.assistantReceiptTerms({ kind: "group" })
    ).toBeUndefined();
  });
});
