import type { ColumnMetadata } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import {
  type AggregationInputs,
  aggregationsFor,
  type AggregationState,
  applyAggregations,
} from "./aggregationCommands";

function column(key: string, patch: Record<string, unknown> = {}) {
  return {
    key,
    header: key,
    // `aggregatable: true` means "whatever this column's type implies", and
    // core reads that from the filter or the editor — a `ColumnMetadata` has
    // no `type` of its own. Declaring it the way a real numeric column is
    // declared is what makes sum, avg, min and max offerable here.
    filter: "number",
    aggregatable: true,
    ...patch,
  } as unknown as ColumnMetadata<unknown>;
}

function inputs(
  state: Partial<AggregationState> = {},
  patch: Partial<AggregationInputs> = {}
): AggregationInputs {
  return {
    state: {
      columns: [column("salary"), column("bonus")],
      aggregateOverrides: {},
      setAggregateOverrides: vi.fn(),
      ...state,
    },
    grouping: "client",
    allows: () => true,
    ...patch,
  };
}

describe("which aggregates an agent may offer", () => {
  it("offers nothing when the host never wired reader control", () => {
    expect(
      aggregationsFor(inputs({ setAggregateOverrides: undefined }))
    ).toBeUndefined();
  });

  it("offers nothing when the source does not group", () => {
    expect(aggregationsFor(inputs({}, { grouping: false }))).toBeUndefined();
  });

  it("offers nothing when a server will not honour an aggregate", () => {
    // A control that silently does nothing is worse than no control.
    expect(
      aggregationsFor(
        inputs({ honorsAggregates: false }, { grouping: "server" })
      )
    ).toBeUndefined();
    expect(
      aggregationsFor(
        inputs({ honorsAggregates: true }, { grouping: "server" })
      )
    ).toBeDefined();
  });

  it("leaves out a column the agent may not read", () => {
    const offered = aggregationsFor(
      inputs({}, { allows: (key) => key !== "bonus" })
    );

    expect(offered?.columns.map((entry) => entry.id)).toEqual(["salary"]);
  });

  it("reports what is currently active", () => {
    const offered = aggregationsFor(
      inputs({ aggregateOverrides: { salary: "sum" } })
    );

    expect(offered?.active).toEqual([{ id: "salary", operation: "sum" }]);
  });
});

describe("setting an aggregate", () => {
  it("refuses before writing anything when one key is forbidden", () => {
    const setAggregateOverrides = vi.fn();
    const state = { setAggregateOverrides };

    expect(() =>
      applyAggregations(inputs(state, { allows: (key) => key !== "bonus" }), {
        set: { salary: "sum", bonus: "sum" },
      })
    ).toThrow(/"bonus" cannot use operation "sum"/);
    // A half-applied patch is harder to explain than a refused one.
    expect(setAggregateOverrides).not.toHaveBeenCalled();
  });

  it("refuses an operation the column does not offer", () => {
    expect(() =>
      applyAggregations(inputs(), { set: { salary: "not-an-operation" } })
    ).toThrow(/cannot use operation/);
  });

  it("refuses a removal the agent may not make", () => {
    expect(() =>
      applyAggregations(inputs({}, { allows: () => false }), {
        remove: ["salary"],
      })
    ).toThrow(/"salary" cannot be removed/);
  });

  it("refuses to touch a table with no reader control at all", () => {
    expect(() =>
      applyAggregations(inputs({ setAggregateOverrides: undefined }), {
        set: { salary: "sum" },
      })
    ).toThrow(/setAggregations is not wired/);
  });

  it("restores the defaults without validating a patch", () => {
    const setAggregateOverrides = vi.fn();
    applyAggregations(inputs({ setAggregateOverrides }), {
      restoreDefaults: true,
    });

    expect(setAggregateOverrides).toHaveBeenCalledTimes(1);
  });

  it("writes the override once every key has passed", () => {
    const setAggregateOverrides = vi.fn();
    applyAggregations(inputs({ setAggregateOverrides }), {
      set: { salary: "sum" },
    });

    expect(setAggregateOverrides).toHaveBeenCalledTimes(1);
    expect(setAggregateOverrides.mock.calls[0]?.[0]).toMatchObject({
      salary: "sum",
    });
  });
});

describe("what an agent may not aggregate", () => {
  it("leaves out a column the host excluded from the agent", () => {
    const offered = aggregationsFor(
      inputs({}, { allows: (key) => key !== "bonus" })
    );

    expect(offered?.columns.map((entry) => entry.id)).toEqual(["salary"]);
  });

  it("has no state to read when the host wired none", () => {
    expect(aggregationsFor(inputs({}, { state: undefined }))).toBeUndefined();
  });

  it("names a built-in operation in the reader's own words", () => {
    const offered = aggregationsFor(inputs());
    const sum = offered?.columns[0]?.operations.find(
      (operation) => operation.id === "sum"
    );

    // The label comes from core's own table, so a surface naming an aggregate
    // shows the same word the table shows.
    expect(sum?.label).toBeDefined();
    expect(sum?.label).not.toBe("sum");
  });
});

describe("applying an aggregation an agent asked for", () => {
  it("refuses to set one on a column the host excluded", () => {
    const setAggregateOverrides = vi.fn();
    expect(() =>
      applyAggregations(
        inputs({ setAggregateOverrides }, { allows: (key) => key !== "bonus" }),
        { set: { bonus: "sum" } }
      )
    ).toThrow(/bonus/);
    expect(setAggregateOverrides).not.toHaveBeenCalled();
  });

  it("refuses to set one on a column the table does not have", () => {
    const setAggregateOverrides = vi.fn();
    expect(() =>
      applyAggregations(inputs({ setAggregateOverrides }), {
        set: { nonesuch: "sum" },
      })
    ).toThrow(/nonesuch/);
    expect(setAggregateOverrides).not.toHaveBeenCalled();
  });

  it("refuses an operation the column does not offer", () => {
    const setAggregateOverrides = vi.fn();
    expect(() =>
      applyAggregations(inputs({ setAggregateOverrides }), {
        set: { salary: "median" },
      })
    ).toThrow(/median/);
    expect(setAggregateOverrides).not.toHaveBeenCalled();
  });

  it("refuses when the host wired no way to set one", () => {
    expect(() =>
      applyAggregations(inputs({ setAggregateOverrides: undefined }), {
        set: { salary: "sum" },
      })
    ).toThrow(/not wired/);
  });

  it("puts every column back to what the developer declared", () => {
    const setAggregateOverrides = vi.fn();
    applyAggregations(
      inputs({ setAggregateOverrides, aggregateOverrides: { salary: "avg" } }),
      { restoreDefaults: true }
    );

    expect(setAggregateOverrides).toHaveBeenCalledTimes(1);
  });

  it("refuses a removal naming a column the table does not have", () => {
    const setAggregateOverrides = vi.fn();

    // Said plainly rather than quietly ignored: an agent removing an
    // aggregate from a column that is not there has misread the table, and a
    // silent success would leave it believing otherwise.
    expect(() =>
      applyAggregations(
        inputs({
          setAggregateOverrides,
          aggregateOverrides: { salary: "sum" },
        }),
        { remove: ["nonesuch"] }
      )
    ).toThrow(/nonesuch/);
    expect(setAggregateOverrides).not.toHaveBeenCalled();
  });
});
