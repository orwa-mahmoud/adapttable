import {
  type QueryCondition,
  type QueryFilterGroup,
  useFrontendData,
} from "@adapttable/vue";
import { useDataTableShell } from "@adapttable/vue/adapter";
import { filterViewKey } from "@adapttable/vue/filters";
import { describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { filters } from "../src/filters";
import { tick } from "./filter-editing-helpers";

interface Row {
  id: string;
  name: string;
}
const row: Row = { id: "a", name: "Ada" };
function harness(initial: QueryFilterGroup) {
  const tree = shallowRef(initial);
  const revision = shallowRef(0);
  const write = vi.fn();
  const scope = effectScope();
  const shell = scope.run(() => {
    const source = useFrontendData<Row>({
      data: [row],
      columns: [{ key: "name" }],
      getRowId: (value) => value.id,
      urlSync: false,
    });
    const features = [filters<Row>([{ key: "name", type: "text" }])];
    return useDataTableShell<Row>(() => ({
      source: {
        ...source.value,
        filterTree: tree.value,
        setFilterTree: write,
        isFetching: revision.value % 2 === 1,
      },
      columns: [{ key: "name" }],
      rowKey: (value) => value.id,
      features,
      urlSync: false,
    }));
  });
  if (!shell) throw new Error("Missing shell");
  return {
    tree,
    revision,
    write,
    stop: () => scope.stop(),
    chip(index = 0) {
      const chip = shell.state.get(filterViewKey<Row>()).value?.chips?.[index];
      if (!chip) throw new Error("Missing tree chip");
      return chip;
    },
  };
}

describe("filter chip tree snapshots", () => {
  it.each(["key", "operator", "value", "condition"] as const)(
    "retires an opaque leaf after in-place %s replacement",
    async (change) => {
      const target: QueryCondition = {
        key: "name",
        op: "custom",
        value: () => "first",
      };
      const sibling: QueryCondition = {
        key: "name",
        op: "contains",
        value: "Sibling",
      };
      const tree: QueryFilterGroup = {
        combinator: "and",
        conditions: [target, sibling],
      };
      const state = harness(tree);
      try {
        const retained = state.chip();
        if (change === "key") target.key = "replacement";
        if (change === "operator") target.op = "different";
        if (change === "value") target.value = () => "second";
        if (change === "condition")
          tree.conditions = [
            { key: "name", op: "eq", value: "New leaf" },
            sibling,
          ];
        retained.onRemove();
        expect(state.write).not.toHaveBeenCalled();
        state.revision.value++;
        await tick();
        retained.onRemove();
        expect(state.write).not.toHaveBeenCalled();
        state.chip().onRemove();
        expect(state.write).toHaveBeenCalledExactlyOnceWith({
          combinator: "and",
          conditions: [sibling],
        });
        expect(tree.conditions).toHaveLength(2);
      } finally {
        state.stop();
      }
    }
  );

  it.each(["combinator", "reorder", "sibling", "path"] as const)(
    "retires nested paths after an in-place %s change",
    async (change) => {
      const target: QueryCondition = {
        key: "name",
        op: "contains",
        value: "Ada",
      };
      const sibling: QueryCondition = {
        key: "name",
        op: "custom",
        value: { opaque: true },
      };
      const nested: QueryFilterGroup = {
        combinator: "and",
        conditions: [target],
      };
      const tree: QueryFilterGroup = {
        combinator: "and",
        conditions: [nested, sibling],
      };
      const state = harness(tree);
      try {
        const retained = state.chip();
        if (change === "combinator") nested.combinator = "or";
        if (change === "reorder") tree.conditions = [sibling, nested];
        if (change === "sibling") sibling.value = { opaque: true };
        if (change === "path")
          nested.conditions = [{ combinator: "and", conditions: [target] }];
        state.revision.value++;
        await tick();
        retained.onRemove();
        expect(state.write).not.toHaveBeenCalled();
        state.chip(change === "reorder" ? 1 : 0).onRemove();
        const emptyGroup: QueryFilterGroup = {
          combinator: change === "combinator" ? "or" : "and",
          conditions:
            change === "path" ? [{ combinator: "and", conditions: [] }] : [],
        };
        expect(state.write).toHaveBeenCalledExactlyOnceWith({
          combinator: "and",
          conditions:
            change === "reorder"
              ? [sibling, emptyGroup]
              : [emptyGroup, sibling],
        });
      } finally {
        state.stop();
      }
    }
  );

  it("keeps equal primitive array snapshots live and detects in-place array changes beside an opaque sibling", async () => {
    const operand = ["Ada", 2, true, null];
    const opaque: QueryCondition = {
      key: "name",
      op: "custom",
      value: () => "opaque",
    };
    const original: QueryFilterGroup = {
      combinator: "and",
      conditions: [{ key: "name", op: "in", value: operand }, opaque],
    };
    const state = harness(original);
    try {
      const equivalent = state.chip();
      state.tree.value = {
        combinator: "and",
        conditions: [
          { key: "name", op: "in", value: [...operand] },
          { ...opaque },
        ],
      };
      await tick();
      equivalent.onRemove();
      expect(state.write).toHaveBeenCalledExactlyOnceWith({
        combinator: "and",
        conditions: [opaque],
      });
      state.tree.value = original;
      await tick();
      const stale = state.chip();
      operand[0] = "Grace";
      stale.onRemove();
      expect(state.write).toHaveBeenCalledOnce();
      state.revision.value++;
      await tick();
      state.chip().onRemove();
      expect(state.write).toHaveBeenCalledTimes(2);
      expect(state.write).toHaveBeenLastCalledWith({
        combinator: "and",
        conditions: [opaque],
      });
    } finally {
      state.stop();
    }
  });

  it("compares non-JSON primitives without coercion or JSON collisions", async () => {
    const first = [NaN, -0, Infinity, 1n, Symbol("token")];
    const condition: QueryCondition = {
      key: "name",
      op: "custom",
      value: first,
    };
    const state = harness({ combinator: "and", conditions: [condition] });
    try {
      const equal = state.chip();
      condition.value = [...first];
      state.revision.value++;
      await tick();
      equal.onRemove();
      expect(state.write).toHaveBeenCalledExactlyOnceWith(undefined);
      const stale = state.chip();
      condition.value = [NaN, 0, Infinity, 1n, first[4]];
      stale.onRemove();
      expect(state.write).toHaveBeenCalledOnce();
    } finally {
      state.stop();
    }
  });

  it("uses opaque identity without reading, serializing or coercing custom operand properties", async () => {
    const inspect = vi.fn(() => {
      throw new Error("Opaque operand must not be inspected");
    });
    const value = new Proxy(
      {},
      { get: inspect, ownKeys: inspect, getOwnPropertyDescriptor: inspect }
    );
    const target: QueryCondition = {
      key: "name",
      op: "contains",
      value: "Ada",
    };
    const opaque: QueryCondition = { key: "name", op: "custom", value };
    const state = harness({ combinator: "and", conditions: [target, opaque] });
    try {
      const retained = state.chip();
      state.tree.value = {
        combinator: "and",
        conditions: [{ ...target }, { ...opaque }],
      };
      await tick();
      retained.onRemove();
      expect(state.write).toHaveBeenCalledOnce();
      expect(inspect).not.toHaveBeenCalled();
      const stale = state.chip();
      state.tree.value.conditions = [{ ...target, value: "Bea" }, opaque];
      stale.onRemove();
      expect(state.write).toHaveBeenCalledOnce();
      expect(inspect).not.toHaveBeenCalled();
    } finally {
      state.stop();
    }
  });

  it("keeps custom arrays opaque without invoking metadata or coercion", async () => {
    for (const kind of ["metadata", "prototype"]) {
      const inspect = vi.fn(() => {
        throw new Error("Custom metadata must not be evaluated");
      });
      const makeValue = () => {
        const values = ["Ada"];
        if (kind === "metadata")
          Object.defineProperty(values, "toJSON", { get: inspect });
        else Object.setPrototypeOf(values, Object.create(Array.prototype));
        return values;
      };
      const target: QueryCondition = {
        key: "name",
        op: "custom",
        value: makeValue(),
      };
      const state = harness({ combinator: "and", conditions: [target] });
      try {
        const retained = state.chip();
        target.value = makeValue();
        retained.onRemove();
        expect(state.write).not.toHaveBeenCalled();
        expect(inspect).not.toHaveBeenCalled();
        state.revision.value++;
        await tick();
        state.chip().onRemove();
        expect(state.write).toHaveBeenCalledExactlyOnceWith(undefined);
        expect(inspect).not.toHaveBeenCalled();
      } finally {
        state.stop();
      }
    }
    const read = vi.fn(() => "Ada");
    const accessor = ["Ada"];
    Object.defineProperty(accessor, 0, { get: read });
    const target: QueryCondition = {
      key: "name",
      op: "custom",
      value: ["Ada"],
    };
    const state = harness({ combinator: "and", conditions: [target] });
    try {
      const retained = state.chip();
      target.value = accessor;
      retained.onRemove();
      expect(state.write).not.toHaveBeenCalled();
      expect(read).not.toHaveBeenCalled();
      state.revision.value++;
      await tick();
      // The neutral chip label reads display values; ownership checks must not.
      read.mockClear();
      state.chip().onRemove();
      expect(state.write).toHaveBeenCalledExactlyOnceWith(undefined);
      expect(read).not.toHaveBeenCalled();
    } finally {
      state.stop();
    }
  });

  it("treats custom operand internals as opaque while detecting replacement identity", async () => {
    const value: { nested: unknown; self?: unknown } = { nested: "first" };
    value.self = value;
    const target: QueryCondition = { key: "name", op: "custom", value };
    const state = harness({ combinator: "and", conditions: [target] });
    try {
      const retained = state.chip();
      value.nested = "second";
      state.revision.value++;
      await tick();
      retained.onRemove();
      expect(state.write).toHaveBeenCalledExactlyOnceWith(undefined);
      const stale = state.chip();
      target.value = { nested: "second" };
      stale.onRemove();
      expect(state.write).toHaveBeenCalledOnce();
      state.revision.value++;
      await tick();
      const disposed = state.chip();
      state.stop();
      disposed.onRemove();
      expect(state.write).toHaveBeenCalledOnce();
    } finally {
      state.stop();
    }
  });
});
