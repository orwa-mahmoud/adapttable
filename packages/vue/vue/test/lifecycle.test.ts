import type { ColumnLayoutState, TableSource } from "@adapttable/core";
import { featureStateKey, type TableRuntime } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  onScopeDispose,
  shallowRef,
  watch,
} from "vue";

import { useFeatureLifecycle } from "../src/featureLifecycle";
import {
  featureOptionsOf,
  normalizeFeatures,
  type TableFeature,
} from "../src/features/tableFeature";
import { createFeatureState } from "../src/featureState";
import { useFrontendData } from "../src/source/useFrontendData";
import { useDataTable } from "../src/useDataTable";
import {
  type ResolvedTableOptions,
  useDataTableShell,
} from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
}
const columns = [{ key: "name", sortable: true }];
const rowKey = (row: Row): string => row.id;
const rows: readonly Row[] = [{ id: "a", name: "Ada" }];
it("source replacement invalidates neutral identity even when revision axes match", async () => {
  const scope = effectScope();
  const result = scope.run(() => {
    const a = useFrontendData<Row>({
      data: rows,
      columns,
      getRowId: rowKey,
      urlSync: false,
    });
    const b = useFrontendData<Row>({
      data: [{ id: "b", name: "Bea" }],
      columns,
      getRowId: rowKey,
      urlSync: false,
    });
    const source = shallowRef<TableSource<Row>>(a.value);
    const shell = useDataTableShell<Row>({
      source,
      columns,
      rowKey,
      urlSync: false,
    });
    return { a, b, source, shell };
  });
  if (!result) throw new Error("scope missing");
  await nextTick();
  const { a, b, source, shell } = result;
  source.value = a.value;
  const one = shell.runtime.view()?.neutralTable;
  expect(one).toBeDefined();
  source.value = b.value;
  const two = shell.runtime.view()?.neutralTable;
  expect(two).not.toBe(one);
  expect(two?.rows("visible")[0]?.id).toBe("b");
  source.value = { ...b.value, tableEngine: undefined };
  expect(shell.runtime.view()?.neutralTable).toBeUndefined();
  source.value = a.value;
  expect(shell.runtime.view()?.neutralTable).not.toBe(one);
  source.value = b.value;
  source.value = a.value;
  source.value = b.value;
  expect(shell.runtime.rowAt(0)?.id).toBe("b");
  const disposeA = vi.spyOn(a.value.tableEngine!, "dispose");
  const disposeB = vi.spyOn(b.value.tableEngine!, "dispose");
  scope.stop();
  expect(shell.runtime.view()).toBeUndefined();
  expect(disposeA).not.toHaveBeenCalled();
  expect(disposeB).not.toHaveBeenCalled();
});
it("controlled layout composes an event but resets rejected changes before the next event", async () => {
  const changes: ColumnLayoutState[] = [];
  const controlled = shallowRef<ColumnLayoutState>({
    hidden: [],
    order: [],
    pinned: {},
    widths: {},
  });
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell<Row>({
      data: rows,
      columns: [...columns, { key: "id" }],
      rowKey,
      urlSync: false,
      columnLayout: controlled,
      onColumnLayoutChange: (next) => changes.push(next),
    })
  );
  if (!shell) throw new Error("shell missing");
  shell.table.layout.value.setHidden("name", true);
  shell.table.layout.value.setHidden("id", true);
  expect(changes.map((change) => change.hidden)).toEqual([
    ["name"],
    ["name", "id"],
  ]);
  expect(shell.table.layout.value.state.hidden).toEqual([]);
  await nextTick();
  shell.table.layout.value.setHidden("id", true);
  expect(changes.at(-1)?.hidden).toEqual(["id"]);
  controlled.value = { ...controlled.value, hidden: ["name"] };
  expect(shell.table.columns.value.map((column) => column.key)).toEqual(["id"]);
  scope.stop();
});
it("KeepAlive suspends external interaction while retaining one feature scope", async () => {
  const showing = shallowRef(true);
  const activity: boolean[] = [];
  let mounts = 0;
  let disposals = 0;
  const Child = defineComponent({
    setup() {
      useDataTableShell({
        data: rows,
        columns,
        rowKey,
        urlSync: false,
        features: [
          {
            id: "live",
            mount: (context) => {
              mounts++;
              watch(context.active, (value) => activity.push(value), {
                immediate: true,
                flush: "sync",
              });
              onScopeDispose(() => {
                disposals++;
              });
            },
          },
        ],
      });
      return () => h("p", "table");
    },
  });
  const Other = defineComponent({ render: () => h("p", "other") });
  const root = document.createElement("div");
  const app = createApp({
    render: () =>
      h(KeepAlive, null, {
        default: () => (showing.value ? h(Child) : h(Other)),
      }),
  });
  app.mount(root);
  await nextTick();
  showing.value = false;
  await nextTick();
  showing.value = true;
  await nextTick();
  expect(activity).toEqual([false, true, false, true]);
  expect(mounts).toBe(1);
  expect(disposals).toBe(0);
  app.unmount();
  expect(disposals).toBe(1);
  expect(activity.at(-1)).toBe(false);
});
function modelContext() {
  const source = useFrontendData({
    data: rows,
    columns,
    getRowId: rowKey,
    urlSync: false,
  });
  const options = shallowRef<ResolvedTableOptions<Row>>({
    source,
    columns,
    rowKey,
    urlSync: false,
  });
  const table = useDataTable({ source, columns, rowKey });
  return { table, options, filterRuntime: shallowRef(undefined) };
}
describe("retained feature resource failures", () => {
  const runtime: TableRuntime<Row> = {
    view: () => undefined,
    rowAt: () => undefined,
    labels: () => undefined,
    featureIds: () => [],
  };
  it("rolls back a failed mount and runs every cleanup once", () => {
    const cleanup: string[] = [];
    const scope = effectScope();
    const host = scope.run(() =>
      useFeatureLifecycle({
        ...modelContext(),
        runtime,
        state: createFeatureState(),
        active: shallowRef(true),
        reconcile: () => undefined,
        flushAdmission: () => undefined,
      })
    );
    if (!host) throw new Error("missing host");
    const failed: TableFeature<Row> = {
      id: "failed",
      setup: (registry) => {
        registry.onDispose(() => {
          cleanup.push("registered");
          throw new Error("cleanup failed");
        });
      },
      mount: () => {
        onScopeDispose(() => cleanup.push("scope"));
        throw new Error("mount failed");
      },
    };
    expect(() => host.reconcile([failed])).toThrow(AggregateError);
    expect(cleanup).toEqual(["registered", "scope"]);
    scope.stop();
    expect(cleanup).toEqual(["registered", "scope"]);
  });
  it("cleans all removed resources even if one throws", () => {
    const cleanup: string[] = [];
    const scope = effectScope();
    const host = scope.run(() =>
      useFeatureLifecycle({
        ...modelContext(),
        runtime,
        state: createFeatureState(),
        active: shallowRef(true),
        reconcile: () => undefined,
        flushAdmission: () => undefined,
      })
    );
    if (!host) throw new Error("missing host");
    host.reconcile([
      {
        id: "a",
        mount: () => () => {
          cleanup.push("a");
          throw new Error("a");
        },
      },
      {
        id: "b",
        mount: () => () => {
          cleanup.push("b");
        },
      },
    ]);
    expect(() => host.reconcile([])).toThrow(AggregateError);
    expect(cleanup).toEqual(["a", "b"]);
    scope.stop();
    expect(cleanup).toEqual(["a", "b"]);
  });
  it("chooses a duplicate winner consistently before any apply or mount", () => {
    const first = vi.fn(() => ({ value: 1 }));
    const second = vi.fn(() => ({ value: 2 }));
    const winners = normalizeFeatures([
      { id: "custom", apply: first },
      { id: "custom", apply: second },
    ]);
    expect(featureOptionsOf(winners)).toEqual({ value: 2 });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(() => normalizeFeatures([{ id: " " }])).toThrow(
      "non-empty stable id"
    );
  });
  it("removing a controller retracts its commands and typed state", () => {
    const scope = effectScope();
    const state = createFeatureState();
    const KEY = featureStateKey<number>("counter");
    const host = scope.run(() =>
      useFeatureLifecycle({
        ...modelContext(),
        runtime,
        state,
        active: shallowRef(true),
        reconcile: () => undefined,
        flushAdmission: () => undefined,
      })
    );
    if (!host) throw new Error("missing host");
    host.reconcile([
      {
        id: "commands",
        setup: (registry) =>
          registry.registerCommand({
            key: "hello",
            label: "Hello",
            onSelect: () => undefined,
          }),
        mount: (context) => context.state.set(KEY, 1),
      },
    ]);
    expect(host.host.value.commands).toHaveLength(1);
    expect(state.get(KEY).value).toBe(1);
    host.reconcile([]);
    expect(host.host.value.commands).toHaveLength(0);
    expect(state.get(KEY).value).toBeUndefined();
    scope.stop();
  });
});

it("retains explicit resource dependencies and tears down only replaced dependency scopes", () => {
  const scope = effectScope();
  const mounts = vi.fn();
  const cleanup = vi.fn();
  const reconcile = vi.fn();
  let flushValue = 0;
  const mount: NonNullable<TableFeature<Row>["mount"]> = (context) => {
    mounts();
    flushValue = context.flush(() => 42);
    return cleanup;
  };
  const host = scope.run(() =>
    useFeatureLifecycle({
      ...modelContext(),
      runtime: {
        view: () => undefined,
        rowAt: () => undefined,
        labels: () => undefined,
        featureIds: () => [],
      },
      state: createFeatureState(),
      active: shallowRef(true),
      reconcile,
      flushAdmission: () => undefined,
    })
  );
  if (!host) throw new Error("missing host");
  const first = {};
  const second = {};
  const setup: NonNullable<TableFeature<Row>["setup"]> = (registry) => {
    registry.registerEditor("custom", () => null);
    registry.registerAggregator("one", () => 1);
    return cleanup;
  };
  host.reconcile([{ id: "same", dependencies: [first], mount, setup }]);
  expect(flushValue).toBe(42);
  expect(reconcile).toHaveBeenCalledOnce();
  expect(host.host.value.editors.has("custom")).toBe(true);
  expect(host.host.value.aggregators.has("one")).toBe(true);
  host.reconcile([{ id: "same", dependencies: [first], mount, setup }]);
  expect(mounts).toHaveBeenCalledOnce();
  host.reconcile([{ id: "same", dependencies: [second], mount, setup }]);
  expect(mounts).toHaveBeenCalledTimes(2);
  expect(cleanup).toHaveBeenCalledTimes(2);
  host.dispose();
  host.dispose();
  host.reconcile([{ id: "ignored", mount }]);
  expect(mounts).toHaveBeenCalledTimes(2);
  scope.stop();
  expect(cleanup).toHaveBeenCalledTimes(4);
});
it.each([false, true])(
  "rolls back newly added features when a later mount fails, cleanupThrows=%s",
  (cleanupThrows) => {
    const scope = effectScope();
    const calls: string[] = [];
    const host = scope.run(() =>
      useFeatureLifecycle({
        ...modelContext(),
        runtime: {
          view: () => undefined,
          rowAt: () => undefined,
          labels: () => undefined,
          featureIds: () => [],
        },
        state: createFeatureState(),
        active: shallowRef(true),
        reconcile: () => undefined,
        flushAdmission: () => undefined,
      })
    );
    if (!host) throw new Error("missing host");
    const first: TableFeature<Row> = {
      id: "good",
      mount: () => () => {
        calls.push("cleanup");
        if (cleanupThrows) throw new Error("cleanup");
      },
    };
    const failing: TableFeature<Row> = {
      id: "bad",
      mount: () => {
        throw new Error("mount");
      },
    };
    expect(() => host.reconcile([first, failing])).toThrow(
      cleanupThrows ? "composition and rollback failed" : "mount"
    );
    expect(calls).toEqual(["cleanup"]);
    scope.stop();
  }
);
it("surfaces disposal failures after every resource and state has been released", () => {
  const scope = effectScope();
  const state = createFeatureState();
  const KEY = featureStateKey<string>("owned");
  const calls: string[] = [];
  const host = scope.run(() =>
    useFeatureLifecycle({
      ...modelContext(),
      runtime: {
        view: () => undefined,
        rowAt: () => undefined,
        labels: () => undefined,
        featureIds: () => [],
      },
      state,
      active: shallowRef(true),
      reconcile: () => undefined,
      flushAdmission: () => undefined,
    })
  );
  if (!host) throw new Error("missing host");
  host.reconcile([
    {
      id: "a",
      mount: (context) => {
        context.state.set(KEY, "live");
        return () => {
          throw new Error("failure");
        };
      },
    },
    {
      id: "b",
      mount: () => () => {
        calls.push("b");
      },
    },
  ]);
  expect(() => host.dispose()).toThrow("feature disposal failed");
  expect(calls).toEqual(["b"]);
  expect(state.get(KEY).value).toBeUndefined();
  scope.stop();
});
