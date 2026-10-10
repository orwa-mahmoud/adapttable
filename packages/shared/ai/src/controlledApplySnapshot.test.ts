import {
  createNeutralTable,
  createTableEngine,
  initialColumnLayout,
  type TableRevisionAxis,
  withColumnHidden,
  withColumnMoved,
  withColumnOrder,
  withColumnPinned,
} from "@adapttable/core";
import type { TableRuntimeView } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ControlledMethod,
  type ControlledMutationPlan,
  planControlledMutation,
} from "./controlledApplySnapshot";

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));

function view(): TableRuntimeView {
  return {
    rows: [
      { id: "1", value: 10 },
      { id: "2", value: 20 },
    ],
    getRowId: (row) => String((row as { id: string }).id),
    rowLabel: (row) => String((row as { id: string }).id),
    query: {
      page: 1,
      limit: 10,
      search: "",
      setPage: vi.fn(),
      setLimit: vi.fn(),
      setSearch: vi.fn(),
      setSort: vi.fn(),
    },
    columnLayout: {
      keys: ["a", "b", "c"],
      hidden: [],
      setHidden: vi.fn(),
      setOrder: vi.fn(),
      move: vi.fn(),
    },
    selection: {
      selectedIds: new Set(["1"]),
      allMatching: false,
      acrossPages: true,
      replace: vi.fn(),
    },
    pinning: { columns: {}, rows: { top: [], bottom: [] } },
    groupingState: {
      groupBy: undefined,
      aggregateOverrides: {},
      columnLabel: (key) => key,
      setGroupBy: vi.fn(),
    },
  };
}

function planned(
  method: ControlledMethod,
  args: readonly unknown[],
  before: TableRuntimeView
): ControlledMutationPlan {
  const result = planControlledMutation(method, args, before);
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
  return result.plan;
}

function hidden(
  before: TableRuntimeView,
  ids: readonly string[]
): TableRuntimeView {
  if (!before.columnLayout) throw new Error("layout required");
  return { ...before, columnLayout: { ...before.columnLayout, hidden: ids } };
}

function ordered(
  before: TableRuntimeView,
  keys: readonly string[]
): TableRuntimeView {
  if (!before.columnLayout) throw new Error("layout required");
  return { ...before, columnLayout: { ...before.columnLayout, keys } };
}

function selected(
  before: TableRuntimeView,
  ids: readonly string[],
  allMatching = false
): TableRuntimeView {
  if (!before.selection) throw new Error("selection required");
  return {
    ...before,
    selection: { ...before.selection, selectedIds: new Set(ids), allMatching },
  };
}

function withEngine(before = view()) {
  const engine = createTableEngine<unknown>({
    data: before.rows,
    columns: [{ key: "id" }, { key: "value" }],
    rowKey: before.getRowId,
  });
  cleanup.push(engine.dispose);
  return {
    engine,
    before: { ...before, neutralTable: createNeutralTable(engine, "people") },
  };
}

describe("controlled mutation target planning", () => {
  it("confirms the full hidden set and distinguishes a refusal from foreign hides", () => {
    const before = view();
    const plan = planned("hideColumn", ["a", true], before);
    expect(plan.changed).toBe(true);
    expect(plan.classify(hidden(before, ["a"]))).toBe("accepted");
    expect(plan.classify(before)).toBe("unconfirmed");
    expect(plan.classify(hidden(before, ["a", "b"]))).toBe("foreign");
    expect(plan.classify(hidden(before, ["b"]))).toBe("foreign");
  });

  it("accepts actual hide/show no-ops without requiring a revision change", () => {
    const before = hidden(view(), ["a"]);
    expect(planned("hideColumn", ["a", true], before).changed).toBe(false);
    expect(planned("hideColumn", ["a", true], before).classify(before)).toBe(
      "accepted"
    );
    const show = planned("hideColumn", ["a", false], before);
    expect(show.changed).toBe(true);
    expect(show.classify(hidden(before, []))).toBe("accepted");
    expect(planned("hideColumn", ["b", false], before).changed).toBe(false);
  });

  it("copies full order arguments and preserves hidden columns", () => {
    const before = hidden(view(), ["b"]);
    const order = ["c", "b", "a"];
    const plan = planned("setColumnOrder", [order], before);
    order.reverse();
    expect(plan.changed).toBe(true);
    expect(plan.classify(ordered(before, ["c", "b", "a"]))).toBe("accepted");
    expect(plan.classify(before)).toBe("unconfirmed");
    expect(plan.classify(hidden(ordered(before, ["c", "b", "a"]), []))).toBe(
      "foreign"
    );
    expect(planned("setColumnOrder", [["a", "b", "c"]], before).changed).toBe(
      false
    );
  });

  it("derives each move from the actual queue-head order", () => {
    const before = view();
    const first = planned("moveColumn", ["a", 2], before);
    const afterFirst = ordered(before, ["b", "c", "a"]);
    expect(first.classify(afterFirst)).toBe("accepted");
    const second = planned("moveColumn", ["b", 1], afterFirst);
    expect(second.classify(ordered(afterFirst, ["c", "b", "a"]))).toBe(
      "accepted"
    );
    expect(second.classify(ordered(before, ["a", "b", "c"]))).toBe(
      "unconfirmed"
    );
    expect(planned("moveColumn", ["b", 0], afterFirst).changed).toBe(false);
  });

  it("narrowing all matching with the same IDs is a real selection change", () => {
    const before = selected(view(), ["1", "2"], true);
    const ids = ["2", "1", "1"];
    const plan = planned("setSelection", [ids], before);
    ids.push("3");
    expect(plan.changed).toBe(true);
    expect(plan.classify(before)).toBe("unconfirmed");
    expect(plan.classify(selected(before, ["1", "2"]))).toBe("accepted");
    expect(plan.classify(selected(before, ["1", "2", "3"]))).toBe(
      "unconfirmed"
    );
  });

  it("handles explicit selection no-ops and clearing", () => {
    const before = selected(view(), ["2", "1"]);
    const noop = planned("setSelection", [["1", "2"]], before);
    expect(noop.changed).toBe(false);
    expect(noop.classify(selected(before, ["2", "1"]))).toBe("accepted");
    const clear = planned("setSelection", [undefined], before);
    expect(clear.classify(selected(before, []))).toBe("accepted");
    expect(clear.classify(selected(before, [], true))).toBe("unconfirmed");
  });

  it.each(["allMatching", "acrossPages"] as const)(
    "does not invent missing selection %s",
    (key) => {
      const before = view();
      if (!before.selection) throw new Error("selection required");
      const unknown = {
        ...before,
        selection: { ...before.selection, [key]: undefined },
      };
      expect(
        planControlledMutation("setSelection", [["1"]], unknown)
      ).toMatchObject({ ok: false, code: "apply-not-confirmed" });
    }
  );

  it.each([
    ["hideColumn", ["a", "true"]],
    ["hideColumn", [42, true]],
    ["setColumnOrder", [["a", 2]]],
    ["moveColumn", ["a", "99"]],
    ["moveColumn", [false, 1]],
    ["setSelection", [[1]]],
  ] as const)("rejects malformed %s arguments", (method, args) => {
    expect(planControlledMutation(method, args, view())).toMatchObject({
      ok: false,
      code: "invalid-arguments",
    });
  });

  it("refuses absent views, models, and setters", () => {
    expect(
      planControlledMutation("hideColumn", ["a", true], undefined)
    ).toMatchObject({ ok: false, code: "not-wired" });
    expect(
      planControlledMutation("hideColumn", ["a", true], {
        ...view(),
        columnLayout: undefined,
      })
    ).toMatchObject({ ok: false, code: "not-wired" });
    expect(
      planControlledMutation("setSelection", [[]], {
        ...view(),
        selection: undefined,
      })
    ).toMatchObject({ ok: false, code: "not-wired" });
    expect(
      planControlledMutation("setColumnOrder", [["a"]], {
        ...view(),
        columnLayout: { keys: ["a"], hidden: [] },
      })
    ).toMatchObject({ ok: false, code: "not-wired" });
  });

  it("does not mutate host collections, call setters, or enforce hiding policy", () => {
    const before = ordered(view(), ["a"]);
    const keys = before.columnLayout?.keys;
    const ids = before.selection?.selectedIds;
    expect(planControlledMutation("hideColumn", ["a", true], before).ok).toBe(
      true
    );
    planned("setSelection", [["2"]], before).classify(selected(before, ["2"]));
    expect(before.columnLayout?.keys).toBe(keys);
    expect(before.columnLayout?.hidden).toEqual([]);
    expect(before.selection?.selectedIds).toBe(ids);
    expect([...(ids ?? [])]).toEqual(["1"]);
    expect(before.columnLayout?.setHidden).not.toHaveBeenCalled();
    expect(before.columnLayout?.move).not.toHaveBeenCalled();
    expect(before.columnLayout?.setOrder).not.toHaveBeenCalled();
    expect(before.selection?.replace).not.toHaveBeenCalled();
  });
});

const foreignChanges: readonly [
  string,
  (before: TableRuntimeView) => TableRuntimeView,
][] = [
  [
    "row payload",
    (before) => ({ ...before, rows: [{ id: "1", value: 11 }, before.rows[1]] }),
  ],
  ["row order", (before) => ({ ...before, rows: [...before.rows].reverse() })],
  [
    "visible order",
    (before) => ({ ...before, visibleRows: [...before.rows].reverse() }),
  ],
  [
    "query",
    (before) => ({
      ...before,
      query: before.query ? { ...before.query, search: "other" } : undefined,
    }),
  ],
  [
    "filters",
    (before) => ({
      ...before,
      query: before.query
        ? { ...before.query, extra: { team: "other" } }
        : undefined,
    }),
  ],
  [
    "grouping",
    (before) => ({
      ...before,
      groupingState: before.groupingState
        ? { ...before.groupingState, groupBy: "a" }
        : undefined,
    }),
  ],
  [
    "aggregations",
    (before) => ({
      ...before,
      groupingState: before.groupingState
        ? { ...before.groupingState, aggregateOverrides: { a: "sum" } }
        : undefined,
    }),
  ],
  [
    "column pins",
    (before) => ({
      ...before,
      pinning: { ...before.pinning, columns: { b: "start" } },
    }),
  ],
  [
    "row pins",
    (before) => ({
      ...before,
      pinning: { columns: {}, rows: { top: ["1"], bottom: [] } },
    }),
  ],
  ["column order", (before) => ordered(before, ["b", "a", "c"])],
  ["selection IDs", (before) => selected(before, ["2"])],
  ["selection scope", (before) => selected(before, ["1"], true)],
  [
    "selection reach",
    (before) => ({
      ...before,
      selection: before.selection
        ? { ...before.selection, acrossPages: false }
        : undefined,
    }),
  ],
];

describe.each(["server", "engine"] as const)(
  "%s protected snapshots",
  (tier) => {
    it.each(foreignChanges)("refuses foreign %s", (_name, change) => {
      const owned = tier === "engine" ? withEngine() : undefined;
      const before = owned?.before ?? view();
      const plan = planned("hideColumn", ["a", true], before);
      const changed = change(hidden(before, ["a"]));
      if (
        owned &&
        [
          "row payload",
          "row order",
          "visible order",
          "query",
          "filters",
          "grouping",
          "aggregations",
        ].includes(_name)
      ) {
        owned.engine.invalidate([_name === "row payload" ? "data" : "view"]);
      }
      expect(plan.classify(changed)).toBe("foreign");
    });

    it("captures before values instead of retaining mutable rows and overlays", () => {
      const row = { id: "1", value: 10 };
      const rows = [row];
      const base = { ...view(), rows };
      const owned = tier === "engine" ? withEngine(base) : undefined;
      const before = owned?.before ?? base;
      const plan = planned("hideColumn", ["a", true], before);
      row.value = 20;
      owned?.engine.invalidate(["data"]);
      expect(plan.classify(hidden(before, ["a"]))).toBe("foreign");
    });
  }
);

describe("source and canonical snapshot safety", () => {
  it.each(["data", "view", "schema", "policy"] as const)(
    "protects engine %s, including mutable revision getters",
    (axis: TableRevisionAxis) => {
      const { engine, before } = withEngine();
      const plan = planned("hideColumn", ["a", true], before);
      expect(plan.source).toBe(before.neutralTable);
      engine.invalidate([axis]);
      expect(plan.classify(hidden(before, ["a"]))).toBe("foreign");
    }
  );

  it("refuses replaced, removed, and missing sources", () => {
    const { engine, before } = withEngine();
    const plan = planned("hideColumn", ["a", true], before);
    const accepted = hidden(before, ["a"]);
    expect(
      plan.classify({
        ...accepted,
        neutralTable: createNeutralTable(engine, "replacement"),
      })
    ).toBe("foreign");
    expect(plan.classify({ ...accepted, neutralTable: undefined })).toBe(
      "foreign"
    );
    expect(plan.classify(undefined)).toBe("foreign");
  });

  it("handles cycles, BigInt, dates, sets and maps deterministically", () => {
    const row: Record<string, unknown> = {
      id: "1",
      amount: 5n,
      date: new Date("2025-01-01"),
      tags: new Set(["b", "a"]),
      map: new Map([
        ["b", 2],
        ["a", 1],
      ]),
    };
    row.self = row;
    const before = { ...view(), rows: [row] };
    const plan = planned("hideColumn", ["a", true], before);
    const equivalent: Record<string, unknown> = {
      id: "1",
      amount: 5n,
      date: new Date("2025-01-01"),
      tags: new Set(["a", "b"]),
      map: new Map([
        ["a", 1],
        ["b", 2],
      ]),
    };
    equivalent.self = equivalent;
    expect(
      plan.classify(hidden({ ...before, rows: [equivalent] }, ["a"]))
    ).toBe("accepted");
    equivalent.amount = "5";
    expect(
      plan.classify(hidden({ ...before, rows: [equivalent] }, ["a"]))
    ).toBe("foreign");
  });

  it("protects selection reachability while replacing selected IDs", () => {
    const before = view();
    const plan = planned("setSelection", [["2"]], before);
    const accepted = selected(before, ["2"]);
    expect(
      plan.classify({
        ...accepted,
        selection: accepted.selection
          ? { ...accepted.selection, acrossPages: false }
          : undefined,
      })
    ).toBe("foreign");
    expect(plan.classify(hidden(accepted, ["a"]))).toBe("foreign");
  });
});

describe("controlled column-pin targets", () => {
  const pins = (
    columns: Record<string, "start" | "end"> = {}
  ): TableRuntimeView => ({
    ...view(),
    pinning: { columns, setColumnPin: vi.fn(), rows: { top: [], bottom: [] } },
  });
  it.each(["start", "end"] as const)(
    "accepts the exact %s pin and preserves unrelated pins",
    (side) => {
      const before = pins(Object.freeze({ b: "start" }));
      const plan = planned("pinColumn", ["a", side], before);
      expect(plan.changed).toBe(true);
      expect(plan.classify(pins({ a: side, b: "start" }))).toBe("accepted");
      expect(plan.classify(before)).toBe("unconfirmed");
      expect(plan.classify(pins({ a: side, b: "end" }))).toBe("foreign");
      expect(before.pinning?.columns).toEqual({ b: "start" });
    }
  );
  it("confirms unpin and already-unpinned no-op distinctly", () => {
    const before = pins({ a: "start", b: "end" });
    const remove = planned("pinColumn", ["a", undefined], before);
    expect(remove.changed).toBe(true);
    expect(remove.classify(pins({ b: "end" }))).toBe("accepted");
    const noop = planned("pinColumn", ["a", undefined], pins({ b: "end" }));
    expect(noop.changed).toBe(false);
    expect(noop.classify(pins({ b: "end" }))).toBe("accepted");
  });
  it("recognizes pin-map insertion-order equivalence and true pin no-op", () => {
    const before = pins({ a: "start", b: "end" });
    const plan = planned("pinColumn", ["a", "start"], before);
    expect(plan.changed).toBe(false);
    expect(plan.classify(pins({ b: "end", a: "start" }))).toBe("accepted");
  });
  it("refuses a normalized side without adopting the changed pin", () => {
    expect(
      planned("pinColumn", ["a", "start"], pins()).classify(pins({ a: "end" }))
    ).toBe("unconfirmed");
  });
  it("protects layout and row pinning during a column pin", () => {
    const plan = planned("pinColumn", ["a", "start"], pins());
    expect(plan.classify(ordered(pins({ a: "start" }), ["b", "a", "c"]))).toBe(
      "foreign"
    );
    expect(plan.classify(hidden(pins({ a: "start" }), ["b"]))).toBe("foreign");
    expect(
      plan.classify({
        ...pins({ a: "start" }),
        pinning: { columns: { a: "start" }, rows: { top: ["1"], bottom: [] } },
      })
    ).toBe("foreign");
  });
  it("uses authoritative declaration keys when a layout feature is absent", () => {
    const before = {
      ...pins(),
      columnLayout: undefined,
      groupingState: {
        ...view().groupingState!,
        columns: [{ key: "a" }, { key: "b" }],
      },
    };
    const plan = planned("pinColumn", ["a", "start"], before);
    expect(
      plan.classify({
        ...before,
        pinning: { ...before.pinning!, columns: { a: "start" } },
      })
    ).toBe("accepted");
  });
  it.each([
    ["a", null],
    ["a", "left"],
    [42, "start"],
  ] as const)("refuses malformed/unknown pin %j", (key, side) => {
    expect(
      planControlledMutation("pinColumn", [key, side], pins())
    ).toMatchObject({ ok: false, code: "invalid-arguments" });
  });
  it("requires a setter while retaining custom pin behavior without a column declaration", () => {
    expect(
      planControlledMutation("pinColumn", ["a", "start"], view())
    ).toMatchObject({ ok: false, code: "not-wired" });
    expect(
      planControlledMutation("pinColumn", ["a", "start"], {
        ...pins(),
        columnLayout: undefined,
      })
    ).toMatchObject({ ok: true });
  });
  it("matches core behavior for a prototype-named pin key", () => {
    const before = {
      ...pins(),
      columnLayout: { ...view().columnLayout!, keys: ["__proto__", "b"] },
    };
    const plan = planned("pinColumn", ["__proto__", "start"], before);
    const next = withColumnPinned(
      initialColumnLayout(undefined),
      "__proto__",
      "start"
    );
    expect(
      plan.classify({
        ...before,
        pinning: { ...before.pinning!, columns: next.pinned },
      })
    ).toBe("accepted");
    expect(Object.getPrototypeOf(next.pinned)).toBe(Object.prototype);
  });
});

describe("shared core transition parity", () => {
  it.each([
    -1,
    3,
    0.5,
    99,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NaN,
  ])("matches custom move semantics for index %s", (index) => {
    const before = view();
    const keys = before.columnLayout!.keys;
    const state = initialColumnLayout({ order: keys });
    const expected = withColumnMoved(state, keys, "a", index)?.order ?? keys;
    const plan = planned("moveColumn", ["a", index], before);
    expect(plan.classify(ordered(before, expected))).toBe("accepted");
    expect(plan.changed).toBe(
      JSON.stringify(expected) !== JSON.stringify(keys)
    );
  });
  it.each([
    ["a", "b"],
    ["a", "a", "c"],
    ["a", "b", "d"],
  ])("matches core no-op for a non-permutation %j", (...order) => {
    const before = view();
    const keys = before.columnLayout!.keys;
    const state = initialColumnLayout({ order: keys });
    const expected = withColumnOrder(state, keys, order)?.order ?? keys;
    const plan = planned("setColumnOrder", [order], before);
    expect(plan.changed).toBe(false);
    expect(plan.classify(ordered(before, expected))).toBe("accepted");
  });
  it("matches custom unknown-key transitions without adding column policy", () => {
    const before = view();
    const state = initialColumnLayout(undefined);
    const hiddenState = withColumnHidden(state, "missing", true);
    expect(
      planned("hideColumn", ["missing", true], before).classify(
        hidden(before, hiddenState.hidden)
      )
    ).toBe("accepted");
    expect(
      planned("moveColumn", ["missing", 99], before).classify(before)
    ).toBe("accepted");
    const pinView = {
      ...before,
      pinning: { ...before.pinning!, setColumnPin: vi.fn() },
    };
    const pinnedState = withColumnPinned(state, "missing", "start");
    expect(
      planned("pinColumn", ["missing", "start"], pinView).classify({
        ...pinView,
        pinning: { ...pinView.pinning, columns: pinnedState.pinned },
      })
    ).toBe("accepted");
  });
});
