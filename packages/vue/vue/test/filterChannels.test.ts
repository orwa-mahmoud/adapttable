import { FILTER_ENGINE_IMPL, type FilterDef } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import type { TableFeature } from "../src/features/tableFeature";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
  score: number;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada", score: 2 },
  { id: "g", name: "Grace", score: 1 },
];
const columns = [{ key: "name" }, { key: "score" }];
describe("optional source filter channel", () => {
  it("composes neutral filtering, host predicates, facets and live definition replacement", async () => {
    const scope = effectScope();
    const defs = shallowRef<readonly FilterDef<Row>[]>([
      { key: "name", type: "text" },
    ]);
    const features = shallowRef<readonly TableFeature<Row>[]>([
      {
        id: "filters",
        apply: () => ({
          filterEngine: FILTER_ENGINE_IMPL,
          filters: defs.value,
        }),
      },
    ]);
    const shell = scope.run(() =>
      useDataTableShell({
        data,
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        features,
        filterFn: (row) => row.score > 0,
      })
    );
    if (!shell) throw new Error("missing shell");
    shell.source.value.setExtra("name", "ada");
    await nextTick();
    expect(shell.table.rows.value.map((row) => row.id)).toEqual(["a"]);
    expect(shell.filterRuntime.value?.defs[0]?.key).toBe("name");
    expect(shell.source.value.facets).toBeDefined();
    defs.value = [{ key: "name", type: "text", getValue: (row) => row.id }];
    await nextTick();
    expect(shell.table.rows.value).toEqual([]);
    features.value = [];
    await nextTick();
    expect(shell.filterRuntime.value).toBeUndefined();
    expect(shell.table.rows.value).toHaveLength(2);
    expect(shell.runtime.view()?.filterDefs).toBeUndefined();
    scope.stop();
  });
  it("keeps source write keys as arrays and numbers rather than stringifying them", async () => {
    const scope = effectScope();
    const shell = scope.run(() =>
      useDataTableShell({
        data,
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        features: [
          {
            id: "filters",
            apply: () => ({
              filterEngine: FILTER_ENGINE_IMPL,
              filters: [
                {
                  key: "name",
                  type: "multiSelect",
                  options: [{ value: "Ada", label: "Ada" }],
                },
                { key: "score", type: "numberRange" },
              ],
            }),
          },
        ],
      })
    );
    if (!shell) throw new Error("missing shell");
    shell.source.value.setExtra("name", ["Ada"]);
    shell.source.value.setExtra("scoreMin", 2);
    await nextTick();
    expect(shell.source.value.extra.name).toEqual(["Ada"]);
    expect(shell.source.value.extra.scoreMin).toBe(2);
    expect(shell.table.rows.value.map((row) => row.id)).toEqual(["a"]);
    scope.stop();
  });
});

it("publishes custom registered predicates into the initial source and retracts them on removal", async () => {
  const scope = effectScope();
  const register: TableFeature<Row> = {
    id: "custom-type",
    setup: (host) => host.extendFilterType("text", { match: () => false }),
  };
  const filter: TableFeature<Row> = {
    id: "filters",
    apply: () => ({
      filterEngine: FILTER_ENGINE_IMPL,
      filters: [{ key: "name", type: "text" }],
    }),
  };
  const features = shallowRef<readonly TableFeature<Row>[]>([filter, register]);
  const shell = scope.run(() =>
    useDataTableShell({
      data,
      columns,
      rowKey: (row: Row) => row.id,
      urlSync: false,
      features,
    })
  );
  if (!shell) throw new Error("missing shell");
  shell.source.value.setExtra("name", "a");
  await nextTick();
  expect(shell.table.rows.value).toEqual([]);
  features.value = [filter];
  await nextTick();
  expect(shell.table.rows.value).toHaveLength(2);
  scope.stop();
});

it("invalidates only changed authored option loaders in table-local caches", async () => {
  const old = vi.fn(() => Promise.resolve([{ value: "old", label: "Old" }]));
  const next = vi.fn(() => Promise.resolve([{ value: "next", label: "Next" }]));
  const kept = vi.fn(() => Promise.resolve([{ value: "kept", label: "Kept" }]));
  const scope = effectScope();
  const defs = shallowRef<readonly FilterDef<Row>[]>([
    { key: "name", type: "select", options: old },
    { key: "score", type: "select", options: kept },
  ]);
  const shell = scope.run(() =>
    useDataTableShell({
      data,
      columns,
      rowKey: (row: Row) => row.id,
      urlSync: false,
      features: [
        {
          id: "filters",
          apply: () => ({
            filterEngine: FILTER_ENGINE_IMPL,
            filters: defs.value,
          }),
        },
      ],
    })
  );
  if (!shell) throw new Error("missing shell");
  const load = async (key: string) => {
    const options = shell.filterRuntime.value?.defs.find(
      (def) => def.key === key
    )?.options;
    if (typeof options !== "function") throw new Error("missing loader");
    return options();
  };
  expect(await load("name")).toEqual([{ value: "old", label: "Old" }]);
  await load("score");
  defs.value = [{ key: "name", type: "select", options: next }, defs.value[1]!];
  await nextTick();
  expect(await load("name")).toEqual([{ value: "next", label: "Next" }]);
  await load("score");
  expect(old).toHaveBeenCalledOnce();
  expect(next).toHaveBeenCalledOnce();
  expect(kept).toHaveBeenCalledOnce();
  scope.stop();
});

it("applies neutral filter trees together with the host tree predicate", async () => {
  const scope = effectScope();
  const allow = shallowRef(true);
  const shell = scope.run(() =>
    useDataTableShell(() => ({
      data,
      columns,
      rowKey: (row: Row) => row.id,
      urlSync: false,
      filterTreeFn: () => allow.value,
      filterKey: allow.value ? "allow" : "deny",
      features: [
        {
          id: "filters",
          apply: () => ({
            filterEngine: FILTER_ENGINE_IMPL,
            filters: [{ key: "name", type: "text" }],
          }),
        },
      ],
    }))
  );
  if (!shell) throw new Error("missing shell");
  shell.source.value.setFilterTree?.({
    combinator: "and",
    conditions: [{ key: "name", op: "contains", value: "Ada" }],
  });
  await nextTick();
  expect(shell.table.rows.value.map((row) => row.id)).toEqual(["a"]);
  allow.value = false;
  await nextTick();
  expect(shell.table.rows.value).toEqual([]);
  scope.stop();
});
