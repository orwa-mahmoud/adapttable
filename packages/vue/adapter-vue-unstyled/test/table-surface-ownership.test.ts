import { type Attrs, type TableSource, useFrontendData } from "@adapttable/vue";
import { filterViewKey, useDataTableShell } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { filters } from "../src/filters";
import { rowActions } from "../src/row-actions";
import { rowDetail } from "../src/row-detail";
import { tick } from "./filter-editing-helpers";

interface Row {
  id: string;
  name: string;
}
const firstRow: Row = { id: "a", name: "Ada" };
function invoke(attrs: Attrs | undefined) {
  const action = attrs?.onClick;
  if (typeof action !== "function") throw new Error("Missing action callback");
  action(new MouseEvent("click"));
}

describe("retained row controls", () => {
  it("rebases a retained array chip on the latest bag without resurrecting removed values", async () => {
    const scope = effectScope();
    let source!: ReturnType<typeof useFrontendData<Row>>;
    const write = vi.fn(
      (key: string, value: Parameters<TableSource<Row>["setExtra"]>[1]) =>
        source.value.setExtra(key, value)
    );
    const shell = scope.run(() => {
      source = useFrontendData<Row>({
        data: [firstRow],
        columns: [{ key: "name" }],
        getRowId: (row) => row.id,
        arrayExtraKeys: ["team"],
        urlSync: false,
      });
      source.value.setExtra("team", ["Core", "Design"]);
      const features = [
        filters<Row>([
          {
            key: "team",
            type: "multiSelect",
            options: [
              { value: "Core", label: "Core" },
              { value: "Design", label: "Design" },
            ],
          },
        ]),
      ];
      return useDataTableShell<Row>(() => ({
        source: { ...source.value, setExtra: write },
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features,
        urlSync: false,
      }));
    });
    if (!shell) throw new Error("Missing shell");
    try {
      const chip = shell.state
        .get(filterViewKey<Row>())
        .value?.chips?.find((value) => value.key === "team:Core");
      if (!chip) throw new Error("Missing Core chip");
      source.value.setExtra("team", ["Core", "Design", "Other"]);
      await tick();
      chip.onRemove();
      expect(write).toHaveBeenCalledExactlyOnceWith("team", [
        "Design",
        "Other",
      ]);
      expect(source.value.extra.team).toEqual(["Design", "Other"]);
      chip.onRemove();
      expect(write).toHaveBeenCalledOnce();
    } finally {
      scope.stop();
    }
  });

  it("accepts an equivalent tree snapshot but never removes a changed condition at a stale path", async () => {
    const scope = effectScope();
    const original = {
      combinator: "and" as const,
      conditions: [{ key: "name", op: "contains", value: "Ada" }],
    };
    const tree = shallowRef<TableSource<Row>["filterTree"]>(original);
    const replace = vi.fn((next: TableSource<Row>["filterTree"]) => {
      tree.value = next;
    });
    const shell = scope.run(() => {
      const source = useFrontendData<Row>({
        data: [firstRow],
        columns: [{ key: "name" }],
        getRowId: (row) => row.id,
        urlSync: false,
      });
      const features = [filters<Row>([{ key: "name", type: "text" }])];
      return useDataTableShell<Row>(() => ({
        source: {
          ...source.value,
          filterTree: tree.value,
          setFilterTree: replace,
        },
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features,
        urlSync: false,
      }));
    });
    if (!shell) throw new Error("Missing shell");
    const chip = (index: number) => {
      const value = shell.state.get(filterViewKey<Row>()).value?.chips?.[index];
      if (!value) throw new Error("Missing tree chip");
      return value;
    };
    try {
      const retained = chip(0);
      tree.value = structuredClone(original);
      await tick();
      retained.onRemove();
      expect(replace).toHaveBeenCalledExactlyOnceWith(undefined);
      tree.value = original;
      await tick();
      const stale = chip(0);
      const other = { key: "name", op: "eq", value: "Other" };
      tree.value = {
        combinator: "and",
        conditions: [other, ...original.conditions],
      };
      await tick();
      stale.onRemove();
      expect(replace).toHaveBeenCalledOnce();
      chip(1).onRemove();
      expect(replace).toHaveBeenLastCalledWith({
        combinator: "and",
        conditions: [other],
      });
      const operand: { self?: unknown } = {};
      operand.self = operand;
      tree.value = {
        combinator: "and",
        conditions: [{ key: "name", op: "eq", value: operand }],
      };
      await tick();
      chip(0).onRemove();
      expect(replace).toHaveBeenLastCalledWith(undefined);
      expect(replace).toHaveBeenCalledTimes(3);
      tree.value = {
        combinator: "and",
        conditions: [{ key: "name", op: "custom", value: () => "first" }],
      };
      await tick();
      const opaque = chip(0);
      tree.value = {
        combinator: "and",
        conditions: [{ key: "name", op: "custom", value: () => "second" }],
      };
      await tick();
      opaque.onRemove();
      expect(replace).toHaveBeenCalledTimes(3);
      chip(0).onRemove();
      expect(replace).toHaveBeenCalledTimes(4);
      expect(tree.value).toBeUndefined();
    } finally {
      scope.stop();
    }
  });

  it("keeps same-owner wrapper refreshes usable and retires replaced source/row controls", async () => {
    const scope = effectScope();
    const replaceSource = shallowRef(false);
    const refresh = shallowRef(0);
    const rows = shallowRef<readonly Row[]>([firstRow]);
    const run = vi.fn();
    const expansion = vi.fn();
    const shell = scope.run(() => {
      const first = useFrontendData<Row>({
        data: rows,
        columns: [{ key: "name" }],
        getRowId: (row) => row.id,
        urlSync: false,
      });
      const second = useFrontendData<Row>({
        data: [firstRow],
        columns: [{ key: "name" }],
        getRowId: (row) => row.id,
        urlSync: false,
      });
      const features = [
        rowActions<Row>([{ key: "open", label: "Open", onClick: run }]),
        rowDetail<Row>((row) => row.name, [], {
          expandedRowIds: [],
          onExpandedRowIdsChange: expansion,
        }),
      ];
      return useDataTableShell<Row>(() => ({
        source: {
          ...(replaceSource.value ? second.value : first.value),
          isFetching: refresh.value % 2 === 1,
        },
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features,
        urlSync: false,
      }));
    });
    if (!shell) throw new Error("Missing shell");
    const row = () =>
      shell.desktop.value.bodySlots?.find((slot) => slot.kind === "row");
    const controls = () => {
      const slot = row();
      if (slot?.kind !== "row") throw new Error("Missing rendered row");
      return slot.wiring;
    };
    try {
      const original = controls();
      refresh.value++;
      rows.value = [...rows.value];
      await tick();
      invoke(original.actionControls?.[0]?.attrs);
      invoke(original.detail?.toggleAttrs);
      expect(run).toHaveBeenCalledExactlyOnceWith(firstRow);
      expect(expansion).toHaveBeenCalledExactlyOnceWith(["a"]);
      expect(controls().detail?.expanded).toBe(false);
      replaceSource.value = true;
      await tick();
      invoke(original.actionControls?.[0]?.attrs);
      invoke(original.detail?.toggleAttrs);
      expect(run).toHaveBeenCalledOnce();
      expect(expansion).toHaveBeenCalledOnce();
      replaceSource.value = false;
      await tick();
      invoke(original.actionControls?.[0]?.attrs);
      invoke(original.detail?.toggleAttrs);
      expect(run).toHaveBeenCalledOnce();
      expect(expansion).toHaveBeenCalledOnce();
      const restored = controls();
      rows.value = [{ id: "a", name: "Replacement" }];
      await tick();
      invoke(restored.actionControls?.[0]?.attrs);
      invoke(restored.detail?.toggleAttrs);
      expect(run).toHaveBeenCalledOnce();
      expect(expansion).toHaveBeenCalledOnce();
      const current = controls();
      invoke(current.actionControls?.[0]?.attrs);
      expect(run).toHaveBeenLastCalledWith(rows.value[0]);
      scope.stop();
      invoke(current.actionControls?.[0]?.attrs);
      invoke(current.detail?.toggleAttrs);
      expect(run).toHaveBeenCalledTimes(2);
      expect(expansion).toHaveBeenCalledOnce();
    } finally {
      scope.stop();
    }
  });
});
