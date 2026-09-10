/**
 * What is aggregated, who decided it, and what a reader may change.
 *
 * The list these tests pin is the one the panel and the column menu both
 * draw from, so a disagreement here is a disagreement on screen.
 */
import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { resetDevWarnings } from "../utils/devWarn";
import {
  allowsOperation,
  allowsReaderOperation,
  offerableOperations,
  resolveAggregatable,
  resolveAggregatableColumns,
} from "./aggregatable";
import { aggregate, CUSTOM_AGGREGATE, declaredAggregates } from "./aggregate";
import {
  addAggregation,
  aggregationModel,
  columnAggregationSignature,
  computedAggregateKeys,
  declaredByDeveloper,
  effectiveAggregateOps,
  initialOperation,
  reconcileAggregations as reconcile,
  removeAggregation,
  restoreAggregationDefaults,
  serializeAggregationDerivedKey,
} from "./aggregationModel";

interface Row {
  budget: number;
  team: string;
}

const median = (values: readonly unknown[]) => values.length;

const COLUMNS: ColumnMetadata<Row>[] = [
  {
    key: "budget",
    aggregatable: {
      default: "sum",
      operations: [
        "sum",
        "avg",
        { id: "median", label: "Median", calculate: median },
      ],
    },
  },
  { key: "load", aggregatable: { operations: ["avg", "count"] } },
  { key: "team", aggregatable: false },
  { key: "note" },
];

const model = (
  overrides: Readonly<Partial<Record<string, string>>> = {},
  extra: Partial<Parameters<typeof aggregationModel<Row>>[0]> = {}
) => aggregationModel<Row>({ columns: COLUMNS, overrides, ...extra });

describe("what a column offers", () => {
  it("reads a declared default, and the operations beside it", () => {
    const resolved = resolveAggregatable(COLUMNS[0]!);
    expect(resolved?.initial).toBe("sum");
    expect(resolved?.operations.map((operation) => operation.id)).toEqual([
      "sum",
      "avg",
      "median",
    ]);
    expect(resolved?.operations[2]).toMatchObject({
      builtIn: false,
      label: "Median",
      calculate: median,
    });
  });

  it("offers nothing for an omitted or refused column", () => {
    expect(resolveAggregatable(COLUMNS[2]!)).toBeUndefined();
    expect(resolveAggregatable(COLUMNS[3]!)).toBeUndefined();
    expect(
      resolveAggregatable({ key: "x", aggregatable: { operations: [] } })
    ).toBeUndefined();
  });

  it("takes `true` from the column's declared value type, never from a row", () => {
    expect(
      resolveAggregatable({
        key: "n",
        aggregatable: true,
        filter: { type: "number" },
      })?.operations.map((operation) => operation.id)
    ).toEqual(["sum", "avg", "min", "max", "count"]);
    expect(
      resolveAggregatable({
        key: "d",
        aggregatable: true,
        editor: "date",
      })?.operations.map((operation) => operation.id)
    ).toEqual(["min", "max", "count"]);
    expect(
      resolveAggregatable({
        key: "n",
        aggregatable: true,
        filter: { type: "numberRange" },
      })?.operations.map((operation) => operation.id)
    ).toEqual(["sum", "avg", "min", "max", "count"]);
    expect(
      resolveAggregatable({
        key: "d",
        aggregatable: true,
        filter: { type: "dateRange" },
      })?.operations.map((operation) => operation.id)
    ).toEqual(["min", "max", "count"]);
    // Nothing declared: counting is the one operation that means something
    // for every kind of value, so it is the whole of the honest answer.
    expect(
      resolveAggregatable({ key: "t", aggregatable: true })?.operations.map(
        (operation) => operation.id
      )
    ).toEqual(["count"]);
  });

  it("refuses a default the column does not offer, and says so", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const resolved = resolveAggregatable({
      key: "budget",
      aggregatable: { default: "max", operations: ["sum"] },
    });
    // Refused, not quietly swapped for a different calculation.
    expect(resolved?.initial).toBeUndefined();
    expect(resolved?.operations.map((operation) => operation.id)).toEqual([
      "sum",
    ]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"max"'));
    warn.mockRestore();
    resetDevWarnings();
  });

  it("refuses a custom operation that collides with removal or custom", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(
      resolveAggregatable({
        key: "x",
        aggregatable: {
          operations: [
            { id: "none", label: "Off" },
            { id: "custom", label: "Mine" },
          ],
        },
      })
    ).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
    resetDevWarnings();
  });

  it("treats datetime and time as ordered, and ignores a typeless object", () => {
    expect(
      resolveAggregatable({
        key: "when",
        aggregatable: true,
        editor: { type: "datetime" },
      })?.operations.map((operation) => operation.id)
    ).toEqual(["min", "max", "count"]);
    expect(
      resolveAggregatable({
        key: "clock",
        aggregatable: true,
        filter: { type: "time" },
      })?.operations.map((operation) => operation.id)
    ).toEqual(["min", "max", "count"]);
    expect(
      resolveAggregatable({
        key: "mystery",
        aggregatable: true,
        filter: { options: [] },
      })?.operations.map((operation) => operation.id)
    ).toEqual(["count"]);
  });

  it("exposes the shared allow and offer gates", () => {
    const columns = [
      COLUMNS[0]!,
      COLUMNS[2]!,
      { key: "when", aggregatable: true, editor: "date" },
    ];
    const resolved = resolveAggregatableColumns(columns);
    expect([...resolved.keys()]).toEqual(["budget", "when"]);
    const budget = resolved.get("budget");
    expect(allowsOperation(budget, "sum")).toBe(true);
    expect(allowsOperation(budget, "max")).toBe(false);
    expect(allowsOperation(undefined, "sum")).toBe(false);
    expect(allowsReaderOperation(budget, "median")).toBe(true);
    expect(
      allowsReaderOperation(budget, "median", { grouping: "server" })
    ).toBe(false);
    expect(
      allowsReaderOperation(budget, "sum", {
        grouping: "server",
        aggregateOperations: ["avg"],
      })
    ).toBe(false);
    expect(
      offerableOperations(undefined).map((operation) => operation.id)
    ).toEqual([]);
    expect(
      offerableOperations(budget, { grouping: "server" }).map(
        (operation) => operation.id
      )
    ).toEqual(["sum", "avg"]);
  });

  it("refuses a second custom operation that repeats an id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(
      resolveAggregatable({
        key: "x",
        aggregatable: {
          operations: [
            { id: "median", label: "Median", calculate: median },
            { id: "median", label: "Again", calculate: median },
          ],
        },
      })?.operations.map((operation) => operation.id)
    ).toEqual(["median"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("twice"));
    warn.mockRestore();
    resetDevWarnings();
  });

  it("refuses an unknown name, a reserved id, and a duplicate", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(
      resolveAggregatable({
        key: "x",
        aggregatable: {
          operations: [
            "sum",
            "sum",
            "nope" as "sum",
            { id: "count", label: "Mine" },
            { id: "", label: "" },
          ],
        },
      })?.operations.map((operation) => operation.id)
    ).toEqual(["sum"]);
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
    resetDevWarnings();
  });
});

describe("what is active before anyone touches it", () => {
  it("shows the developer's declared default, and only that", () => {
    const { items, candidates, atDefaults } = model();
    expect(items).toEqual([
      {
        columnKey: "budget",
        operationId: "sum",
        editable: true,
        origin: "declared",
        operations: expect.anything(),
      },
    ]);
    // Available, and off: nothing is activated on a reader's behalf.
    expect(candidates.map((entry) => [entry.columnKey, entry.active])).toEqual([
      ["budget", true],
      ["load", false],
    ]);
    expect(atDefaults).toBe(true);
    expect(model().hasDefaults).toBe(true);
  });

  it("activates nothing when no column declares a default", () => {
    const columns: ColumnMetadata<Row>[] = [
      { key: "budget", aggregatable: { operations: ["sum"] } },
    ];
    const empty = aggregationModel<Row>({ columns, overrides: {} });
    expect(empty.items).toEqual([]);
    expect(empty.hasDefaults).toBe(false);
  });

  it("treats a host query aggregate as a restore baseline", () => {
    expect(
      aggregationModel<Row>({
        columns: [{ key: "load", aggregatable: { operations: ["avg"] } }],
        overrides: {},
        queryAggregates: [{ key: "load", fn: "avg" }],
      }).hasDefaults
    ).toBe(true);
  });

  it("takes an initial operation from an existing declared mapper", () => {
    const declared = aggregate<Row>({ load: "avg" });
    const { items } = model({}, { declared: declaredAggregates(declared) });
    expect(items.map((item) => [item.columnKey, item.operationId])).toEqual([
      ["budget", "sum"],
      ["load", "avg"],
    ]);
  });

  it("lets an explicit column default win over the mapper's", () => {
    const declared = aggregate<Row>({ budget: "avg" });
    const { items } = model({}, { declared: declaredAggregates(declared) });
    // One column, one owner: the explicit declaration on the column.
    expect(items[0]).toMatchObject({ columnKey: "budget", operationId: "sum" });
  });

  it("shows a host's own mapper output as read-only, never as a choice", () => {
    const { items } = model(
      {},
      { computedKeys: ["team", "mystery"], declared: { team: "custom" } }
    );
    const readOnly = items.filter((item) => !item.editable);
    expect(readOnly.map((item) => item.columnKey)).toEqual(["team", "mystery"]);
    // "custom" is a function, not an operation — it is not named as one.
    expect(readOnly[0]?.operationId).toBeUndefined();
    expect(readOnly.every((item) => item.operations.length === 0)).toBe(true);
  });
});

describe("what a reader changes", () => {
  it("adds a column with its default, or its first operation", () => {
    expect(initialOperation(resolveAggregatable(COLUMNS[0]!)!)).toBe("sum");
    expect(initialOperation(resolveAggregatable(COLUMNS[1]!)!)).toBe("avg");
    const resolved = resolveAggregatable(COLUMNS[0]!)!;
    // A server that cannot run the declared default still has to pick something
    // it can run — never a name it would then fail to calculate.
    expect(
      initialOperation(resolved, {
        grouping: "server",
        aggregateOperations: ["avg"],
      })
    ).toBe("avg");
    expect(
      initialOperation(resolved, {
        grouping: "server",
        aggregateOperations: [],
      })
    ).toBe("");
  });

  it("keeps two columns apart when one of them changes", () => {
    const both = addAggregation(
      addAggregation({}, "budget", "avg"),
      "load",
      "count"
    );
    const { items } = model(both);
    expect(items.map((item) => [item.columnKey, item.operationId])).toEqual([
      ["budget", "avg"],
      ["load", "count"],
    ]);
    const changed = addAggregation(both, "budget", "median");
    expect(model(changed).items.map((item) => item.operationId)).toEqual([
      "median",
      "count",
    ]);
  });

  it("records the removal of a developer default, and forgets a reader's own", () => {
    // A deleted entry would hand the column straight back to the default the
    // reader just took away, so removal of a declared column is written down.
    const suppressed = removeAggregation({}, "budget", true);
    expect(suppressed).toEqual({ budget: "none" });
    expect(model(suppressed as Record<string, string>).items).toEqual([]);
    // Nothing declared it, so there is nothing to suppress.
    expect(removeAggregation({ load: "avg" }, "load", false)).toEqual({});
  });

  it("says whether the developer declared a column", () => {
    const input = { columns: COLUMNS, overrides: {} };
    expect(declaredByDeveloper(COLUMNS[0]!, input)).toBe(true);
    expect(declaredByDeveloper(COLUMNS[1]!, input)).toBe(false);
  });

  it("restores the declared setup, removals included", () => {
    const changed = { budget: "none", load: "count" };
    expect(model(changed).items.map((item) => item.columnKey)).toEqual([
      "load",
    ]);
    expect(model(changed).atDefaults).toBe(false);
    const restored = restoreAggregationDefaults();
    expect(model(restored as Record<string, string>).items).toEqual([
      expect.objectContaining({ columnKey: "budget", operationId: "sum" }),
    ]);
    expect(model(restored as Record<string, string>).atDefaults).toBe(true);
  });
});

describe("what the table refuses", () => {
  it("ignores an operation a column does not offer", () => {
    // A link written when the column offered Max, opened after it stopped.
    // The forbidden operation is never calculated, and the column falls back
    // to what the developer declared rather than vanishing.
    expect(model({ budget: "max" }).items).toEqual([
      expect.objectContaining({ columnKey: "budget", operationId: "sum" }),
    ]);
    expect(reconcile({ budget: "max" }, COLUMNS)).toEqual({});
    // A column with no declared default simply stays inactive.
    expect(model({ load: "sum" }).items.map((item) => item.columnKey)).toEqual([
      "budget",
    ]);
  });

  it("drops a column that is gone, and keeps an explicit removal", () => {
    expect(reconcile({ ghost: "sum", budget: "none" }, COLUMNS)).toEqual({
      budget: "none",
    });
  });

  it("keeps a host's own operation id through reconciliation", () => {
    expect(reconcile({ budget: "median" }, COLUMNS)).toEqual({
      budget: "median",
    });
    expect(model({ budget: "median" }).items[0]?.operationId).toBe("median");
  });

  it("returns the same object when nothing had to change", () => {
    const overrides = { budget: "avg" };
    expect(reconcile(overrides, COLUMNS)).toBe(overrides);
    expect(reconcile({ budget: undefined }, COLUMNS)).toEqual({});
  });

  it("takes the developer's original query aggregates, not a later response", () => {
    const { items } = model(
      { budget: "avg" },
      { queryAggregates: [{ key: "budget", fn: "sum" }] }
    );
    // The reader changed it; restore-defaults still sees the original Sum.
    expect(items[0]).toMatchObject({ columnKey: "budget", operationId: "avg" });
    expect(
      model({}, { queryAggregates: [{ key: "load", fn: "avg" }] }).items
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ columnKey: "budget", operationId: "sum" }),
        expect.objectContaining({ columnKey: "load", operationId: "avg" }),
      ])
    );
  });

  it("keeps a host cell when every offered operation is unavailable here", () => {
    const columns: ColumnMetadata<Row>[] = [
      {
        key: "budget",
        aggregatable: {
          operations: [{ id: "median", label: "Median" }],
        },
      },
    ];
    const { items, candidates } = aggregationModel<Row>({
      columns,
      overrides: {},
      computedKeys: ["budget"],
      source: { grouping: "client" },
    });
    expect(candidates).toEqual([]);
    expect(items).toEqual([
      expect.objectContaining({
        columnKey: "budget",
        editable: false,
      }),
    ]);
  });

  it("offers a backend-only operation only where the server listed it", () => {
    const columns: ColumnMetadata<Row>[] = [
      {
        key: "budget",
        aggregatable: {
          operations: [
            "sum",
            { id: "median", label: "Median" },
            { id: "p95", label: "P95", calculate: median },
          ],
        },
      },
    ];
    const local = aggregationModel<Row>({ columns, overrides: {} });
    expect(
      local.candidates[0]?.operations.map((operation) => operation.id)
    ).toEqual(["sum", "p95"]);
    const server = aggregationModel<Row>({
      columns,
      overrides: {},
      source: {
        grouping: "server",
        aggregateOperations: ["sum", "median"],
      },
    });
    expect(
      server.candidates[0]?.operations.map((operation) => operation.id)
    ).toEqual(["sum", "median"]);
  });

  it("reads computed keys from group rows without guessing the operation", () => {
    expect(
      computedAggregateKeys([
        { kind: "group", aggregateCells: { team: 3, mystery: 1 } },
        { kind: "row" },
        { kind: "groupFooter", aggregateCells: { team: 3 } },
      ])
    ).toEqual(["team", "mystery"]);
    expect(
      computedAggregateKeys([
        { kind: "group" },
        { kind: "groupFooter", aggregateCells: { budget: 1 } },
      ])
    ).toEqual(["budget"]);
  });

  it("keeps an opaque host aggregate visible on a reader-editable column", () => {
    const columns: ColumnMetadata<Row>[] = [
      { key: "budget", aggregatable: { operations: ["sum", "avg"] } },
    ];
    const { items, candidates } = aggregationModel<Row>({
      columns,
      overrides: {},
      computedKeys: ["budget"],
    });
    expect(items).toEqual([
      expect.objectContaining({
        columnKey: "budget",
        operationId: undefined,
        editable: true,
        origin: "host",
      }),
    ]);
    expect(candidates[0]?.active).toBe(true);
    expect(
      declaredByDeveloper(columns[0]!, {
        columns,
        overrides: {},
        computedKeys: ["budget"],
      })
    ).toBe(true);
  });

  it("keeps a host operation that is not on the reader's list", () => {
    const { items } = aggregationModel<Row>({
      columns: [
        { key: "budget", aggregatable: { operations: ["avg", "count"] } },
      ],
      overrides: {},
      declared: { budget: "sum" },
    });
    expect(items[0]).toMatchObject({
      columnKey: "budget",
      operationId: "sum",
      origin: "host",
      editable: true,
    });
  });

  it("does not activate an unsupported default or hide the host result", () => {
    const columns: ColumnMetadata<Row>[] = [
      {
        key: "budget",
        aggregatable: {
          default: "median",
          operations: ["sum", { id: "median", label: "Median" }],
        },
      },
    ];
    const { items } = aggregationModel<Row>({
      columns,
      overrides: {},
      declared: { budget: "sum" },
      source: { grouping: "client" },
    });
    expect(items[0]).toMatchObject({
      columnKey: "budget",
      operationId: "sum",
      origin: "host",
    });
  });

  it("drops a stale suppression once the column is locked", () => {
    const locked: ColumnMetadata<Row>[] = [{ key: "budget" }];
    expect(reconcile({ budget: "none" }, locked)).toEqual({});
    expect(
      aggregationModel<Row>({
        columns: locked,
        overrides: { budget: "none" },
        declared: { budget: "sum" },
      }).items[0]
    ).toMatchObject({
      columnKey: "budget",
      operationId: "sum",
      origin: "host",
    });
  });

  it("names the operation that will actually calculate, including defaults", () => {
    expect(
      effectiveAggregateOps<Row>({
        columns: COLUMNS,
        overrides: {},
      })
    ).toEqual({ budget: "sum" });
    expect(
      columnAggregationSignature({
        key: "budget",
        aggregatable: { operations: ["sum"] },
      })
    ).not.toBe(
      columnAggregationSignature({
        key: "budget",
        aggregatable: { operations: ["avg"] },
      })
    );
    expect(
      effectiveAggregateOps<Row>({
        columns: [{ key: "budget" }],
        overrides: {},
        declared: { extra: "sum", ghost: CUSTOM_AGGREGATE },
      })
    ).toEqual({ extra: "sum" });
    expect(
      effectiveAggregateOps<Row>({
        columns: [{ key: "note" }],
        overrides: {},
      })
    ).toBeUndefined();
    expect(columnAggregationSignature({ key: "note" })).toBe("note:-");
    expect(
      columnAggregationSignature({
        key: "load",
        aggregatable: { operations: ["avg"] },
      })
    ).toBe("load::avg");
  });

  it("fingerprints the effective operations, not override identity alone", () => {
    const sumDefault: ColumnMetadata<Row>[] = [
      {
        key: "budget",
        aggregatable: { default: "sum", operations: ["sum", "avg"] },
      },
    ];
    const avgDefault: ColumnMetadata<Row>[] = [
      {
        key: "budget",
        aggregatable: { default: "avg", operations: ["sum", "avg"] },
      },
    ];
    const sumOnly: ColumnMetadata<Row>[] = [
      { key: "budget", aggregatable: { default: "sum", operations: ["sum"] } },
    ];
    expect(
      serializeAggregationDerivedKey({ columns: sumDefault, overrides: {} })
    ).toBe("budget:sum");
    expect(
      serializeAggregationDerivedKey({ columns: avgDefault, overrides: {} })
    ).toBe("budget:avg");
    // Narrowing the offer without changing the effective operation is the
    // same configuration — the incremental cache must keep the groups.
    expect(
      serializeAggregationDerivedKey({ columns: sumOnly, overrides: {} })
    ).toBe(
      serializeAggregationDerivedKey({ columns: sumDefault, overrides: {} })
    );
    expect(
      serializeAggregationDerivedKey({
        columns: sumDefault,
        overrides: { budget: "none" },
      })
    ).toBe("|none:budget");
  });

  it("does not keep a computed key from a different dataset", () => {
    const columns: ColumnMetadata<Row>[] = [
      { key: "budget", aggregatable: { operations: ["sum"] } },
    ];
    expect(
      aggregationModel<Row>({
        columns,
        overrides: {},
        computedKeys: [],
      }).items
    ).toEqual([]);
  });
});
