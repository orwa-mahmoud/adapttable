import { describe, expect, it, vi } from "vitest";

import {
  ContextIncludeError,
  DEFAULT_COMPACT_TOKENS,
  fitColumns,
  selectGuides,
  selectionOrder,
  selectionVersion,
  utf8Bytes,
} from "./contextSelection";
import type { ContextCapability, ContextColumn } from "./contextSnapshot";
import type { CapabilityGuide } from "./types";

function capability(key: string): ContextCapability {
  return { key, summary: `Do ${key}.` };
}

function guide(key: string, size = 20): CapabilityGuide {
  return {
    schemaVersion: "adapttable.agent.v1",
    key,
    guide: "x".repeat(size),
    input: { type: "object", properties: {} },
  } as unknown as CapabilityGuide;
}

const ALL = [
  "columns.describe",
  "view.setPage",
  "view.setSort",
  "view.setFilters",
  "view.setSearch",
  "rows.read",
  "view.setGroupBy",
  "view.setAggregations",
  "edit.cells",
  "rows.delete",
].map(capability);

describe("the order guides are considered in", () => {
  it("puts the common operations first, in their own order", () => {
    const order = selectionOrder(ALL.map((entry) => entry.key));

    expect(order.slice(0, 7)).toEqual([
      "view.setFilters",
      "view.setSort",
      "view.setSearch",
      "view.setPage",
      "rows.read",
      "view.setGroupBy",
      "view.setAggregations",
    ]);
  });

  it("takes host priorities next, then registry order", () => {
    const order = selectionOrder(
      ALL.map((entry) => entry.key),
      ["rows.delete"]
    );

    expect(order[7]).toBe("rows.delete");
    expect(order).toContain("columns.describe");
  });

  it("names nothing twice and nothing the table lacks", () => {
    const order = selectionOrder(
      ["view.setPage"],
      ["view.setPage", "not.a.key"]
    );

    expect(order).toEqual(["view.setPage"]);
  });

  it("is deterministic", () => {
    const keys = ALL.map((entry) => entry.key);
    expect(selectionOrder(keys, ["edit.cells"])).toEqual(
      selectionOrder(keys, ["edit.cells"])
    );
  });
});

describe("choosing what travels upfront", () => {
  it("carries everything when the budget is generous", () => {
    const chosen = selectGuides(ALL, (key) => guide(key), {
      profile: "full",
    });

    expect(chosen.selected).toHaveLength(ALL.length);
    expect(chosen.deferred).toEqual([]);
  });

  it("defers whole guides rather than cutting one in half", () => {
    const chosen = selectGuides(ALL, (key) => guide(key, 4_000), {
      tokenBudget: 1_500,
    });

    expect(chosen.selected.length).toBeGreaterThan(0);
    expect(chosen.deferred.length).toBeGreaterThan(0);
    for (const key of chosen.selected) {
      const entry = chosen.capabilities.find((item) => item.key === key);
      // Whole or not at all: a truncated schema is a refused call.
      expect(entry?.input).toBeDefined();
      expect(entry?.guide).toHaveLength(4_000);
    }
  });

  it("names every deferral and why", () => {
    const chosen = selectGuides(ALL, (key) => guide(key, 4_000), {
      tokenBudget: 1_100,
    });

    expect(chosen.deferred.every((entry) => entry.reason === "budget")).toBe(
      true
    );
    expect(chosen.notes.join(" ")).toMatch(/describe/);
  });

  it("keeps the common operations when the budget is tight", () => {
    const chosen = selectGuides(ALL, (key) => guide(key, 800), {
      tokenBudget: 400,
    });

    expect(chosen.selected[0]).toBe("view.setFilters");
  });

  it("carries a requested key past the budget", () => {
    const chosen = selectGuides(ALL, (key) => guide(key, 4_000), {
      tokenBudget: 10,
      include: ["rows.delete"],
    });

    expect(chosen.selected).toContain("rows.delete");
  });

  it("refuses a request for a key this table does not offer", () => {
    expect(() =>
      selectGuides(ALL, (key) => guide(key), { include: ["nope"] })
    ).toThrow(ContextIncludeError);
    expect(() =>
      selectGuides(ALL, (key) => guide(key), { include: ["nope"] })
    ).toThrow(/not available on this table/);
  });

  it("leaves the output schema out of upfront guidance", () => {
    const withOutput = (key: string): CapabilityGuide => ({
      ...guide(key),
      output: { type: "object" },
    });
    const chosen = selectGuides(ALL, withOutput, { profile: "full" });

    // Input is what lets a model call correctly; output is bulk it can read
    // from the result it is handed.
    expect(chosen.capabilities[0]?.output).toBeUndefined();
  });

  it("reads a guide only for a capability it considers", () => {
    const guideFor = vi.fn((key: string) => guide(key, 6_000));
    selectGuides(ALL, guideFor, { tokenBudget: 1 });

    // Considered, yes — but nothing beyond the list, and never the data.
    expect(guideFor.mock.calls.length).toBeLessThanOrEqual(ALL.length);
  });

  it("keeps the common operations callable even when nothing would fit", () => {
    const chosen = selectGuides(ALL, (key) => guide(key, 20_000), {
      tokenBudget: 1,
    });

    // A context that meets a number while leaving a model unable to filter,
    // sort or page is not a smaller context — it is an assistant that cannot
    // answer. The common operations keep their guidance; everything else
    // defers by name and is one `describe` away.
    expect(chosen.selected).toEqual([
      "view.setFilters",
      "view.setSort",
      "view.setSearch",
      "view.setPage",
      "rows.read",
      "view.setGroupBy",
    ]);
    expect(chosen.deferred.map((entry) => entry.key)).toContain("edit.cells");
  });

  it("carries a guide the backend already asked about, ahead of the rest", () => {
    const chosen = selectGuides(ALL, (key) => guide(key, 20_000), {
      tokenBudget: 1,
      asked: ["edit.cells"],
    });

    // Cheaper than the discovery round it would otherwise spend asking again.
    expect(chosen.selected).toContain("edit.cells");
    expect(chosen.deferred.map((entry) => entry.key)).not.toContain(
      "edit.cells"
    );
  });

  it("gives compact a budget and full none", () => {
    const compact = selectGuides(ALL, (key) => guide(key, 4_000), {
      profile: "compact",
    });
    const full = selectGuides(ALL, (key) => guide(key, 4_000), {
      profile: "full",
    });

    expect(compact.deferred.length).toBeGreaterThan(0);
    expect(full.deferred).toEqual([]);
    expect(DEFAULT_COMPACT_TOKENS).toBe(1_000);
  });

  it("uses the host's tokenizer when it has one", () => {
    const estimateTokens = vi.fn(() => 1);
    selectGuides(ALL, (key) => guide(key), {
      tokenBudget: 100,
      estimateTokens,
    });

    expect(estimateTokens).toHaveBeenCalled();
  });
});

describe("naming a selection", () => {
  it("changes when the profile or the settings change", () => {
    const base = selectionVersion("c1", "compact", ["a"], {});

    expect(selectionVersion("c1", "full", ["a"], {})).not.toBe(base);
    expect(
      selectionVersion("c1", "compact", ["a"], { tokenBudget: 5 })
    ).not.toBe(base);
    expect(selectionVersion("c2", "compact", ["a"], {})).not.toBe(base);
    expect(selectionVersion("c1", "compact", ["a"], {})).toBe(base);
  });
});

describe("measuring", () => {
  it("counts UTF-8 bytes, not characters", () => {
    expect(utf8Bytes("é")).toBeGreaterThan(utf8Bytes("e"));
  });
});

describe("fitting column descriptions to a budget", () => {
  const person: ContextColumn = {
    id: "person",
    label: "Person",
    type: "string",
    readable: true,
    writable: false,
    sortable: true,
    description: "Name on the row",
  };
  const salary: ContextColumn = {
    id: "salary",
    label: "Salary",
    type: "number",
    readable: true,
    writable: true,
    sortable: true,
    visible: false,
    hideable: true,
    description: "Hidden but still writable",
  };
  const notes: ContextColumn = {
    id: "notes",
    label: "Notes",
    type: "string",
    readable: true,
    writable: false,
    sortable: false,
    visible: false,
    description: "Hidden and read-only",
  };

  it("defers a hidden read-only column before a hidden writable one", () => {
    // Visible first, then a hidden column the agent can still write, then
    // a hidden column it can only read. A hide does not take a writable
    // column out of the prompt before a notes field.
    const fitted = fitColumns([person, salary, notes], (kept) =>
      kept.every(
        (column) => column.description === undefined || column.id !== "notes"
      )
    );
    expect(fitted.deferred).toEqual(["notes"]);
    expect(fitted.kept.map((column) => column.id)).toEqual([
      "person",
      "salary",
      "notes",
    ]);
    expect(
      fitted.kept.find((column) => column.id === "notes")?.description
    ).toBeUndefined();
    expect(fitted.kept.find((column) => column.id === "salary")?.hideable).toBe(
      true
    );
  });

  it("keeps every column listed when even the names overflow", () => {
    const fitted = fitColumns([person, salary], () => false);
    expect(fitted.deferred).toEqual(["person", "salary"]);
    expect(
      fitted.kept.every((column) => column.description === undefined)
    ).toBe(true);
  });
});
