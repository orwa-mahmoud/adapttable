import {
  type EditableColumnLike,
  type FilterDef,
  type FilterFormSource,
  resolveLabels,
} from "@adapttable/core";
import { slotRender, TOOLBAR_EXTRAS } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import {
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import {
  editableCellSlotKey,
  editing,
  editingModelKey,
  useBatchEditing,
  useEditableCell,
  useRowEditing,
  useTableEditing,
} from "../src/editing";
import { extendFeature, type TableFeature } from "../src/features/tableFeature";
import {
  FilterFieldChrome,
  filters,
  filterViewKey,
  useFilterField,
  useFilterOptions,
  useTextFilter,
} from "../src/filters";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", score: 1 },
  { id: "b", name: "Grace", score: 2 },
];
const columns: readonly EditableColumnLike<Row>[] = [
  { key: "name", editable: true, editor: "text" },
];
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function controls<TRow>(feature: TableFeature<TRow>): TableFeature<TRow> {
  return extendFeature(feature, [
    slotRender(TOOLBAR_EXTRAS, () => null),
    slotRender(editableCellSlotKey<TRow>(), () => null),
  ]);
}
describe("Vue filter models", () => {
  it("keeps a rejected controlled field value authoritative, without host mutation", () => {
    const scope = effectScope();
    const setExtras = vi.fn();
    const source: FilterFormSource<Row> = {
      extra: { name: "Ada" },
      setExtra: vi.fn(),
      setExtras,
    };
    const widget = scope.run(() =>
      useTextFilter<Row>({ key: "name", type: "text" }, source)
    )!;
    widget.value.write("startsWith", "Grace");
    expect(setExtras).toHaveBeenCalledWith({
      name: "Grace",
      nameOp: "startsWith",
    });
    expect(widget.value.value).toBe("Ada");
    expect(source.extra).toEqual({ name: "Ada" });
    scope.stop();
  });
  it("filters live frontend rows; removing feature removes engine and state immediately", () => {
    const scope = effectScope();
    const declarations = shallowRef<readonly TableFeature<Row>[]>([
      controls(filters<Row>([{ key: "name", type: "text" }])),
    ]);
    const shell = scope.run(() =>
      useDataTableShell<Row>(() => ({
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features: declarations,
        urlSync: false,
      }))
    )!;
    const view = shell.state.get(filterViewKey<Row>());
    expect(view.value?.defs[0]?.key).toBe("name");
    shell.source.value.setExtras({ name: "Ad" });
    expect(shell.table.rows.value.map((row) => row.id)).toEqual(["a"]);
    declarations.value = [];
    expect(shell.state.get(filterViewKey<Row>()).value).toBeUndefined();
    expect(shell.table.rows.value).toHaveLength(2);
    scope.stop();
  });
  it("two table filter states and panel toggles remain isolated with RTL propagated", () => {
    const scope = effectScope();
    const make = () =>
      useDataTableShell<Row>({
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features: [controls(filters<Row>([{ key: "name", type: "text" }]))],
        dir: "rtl",
        urlSync: false,
      });
    const [one, two] = scope.run(() => [make(), make()] as const)!;
    one.state.get(filterViewKey<Row>()).value!.trigger.onClick();
    expect(one.state.get(filterViewKey<Row>()).value?.open).toBe(true);
    expect(two.state.get(filterViewKey<Row>()).value?.open).toBe(false);
    expect(one.state.get(filterViewKey<Row>()).value?.dir).toBe("rtl");
    one.source.value.setExtra("name", "Ada");
    expect(two.table.rows.value).toHaveLength(2);
    scope.stop();
  });
  it("ignores a replaced options loader and after-disposal resolution", async () => {
    const old = deferred<readonly { value: string; label: string }[]>();
    const next = deferred<readonly { value: string; label: string }[]>();
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "select",
      options: () => old.promise,
    });
    const scope = effectScope();
    const state = scope.run(() => useFilterOptions(def))!;
    await tick();
    def.value = { key: "name", type: "select", options: () => next.promise };
    await tick();
    old.resolve([{ value: "old", label: "Old" }]);
    await tick();
    expect(state.value.options).toEqual([]);
    next.resolve([{ value: "new", label: "New" }]);
    await tick();
    expect(state.value.options[0]?.value).toBe("new");
    scope.stop();
  });
  it("replaces a same-key loader through the integrated filter runtime", async () => {
    const old = vi.fn(() => Promise.resolve([{ value: "old", label: "Old" }]));
    const next = vi.fn(() =>
      Promise.resolve([{ value: "next", label: "Next" }])
    );
    const defs = shallowRef<readonly FilterDef<Row>[]>([
      { key: "name", type: "select", options: old },
    ]);
    const scope = effectScope();
    const shell = scope.run(() =>
      useDataTableShell<Row>(() => ({
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        features: [controls(filters<Row>(defs.value))],
        urlSync: false,
      }))
    )!;
    const options = scope.run(() =>
      useFilterOptions(() => shell.filterRuntime.value!.defs[0]!)
    )!;
    await tick();
    await tick();
    expect(options.value.options[0]?.value).toBe("old");
    defs.value = [{ key: "name", type: "select", options: next }];
    await tick();
    await tick();
    expect(options.value.options[0]?.value).toBe("next");
    expect(next).toHaveBeenCalledOnce();
    scope.stop();
  });
  it("SSR never starts option loaders and renders required supplied controls only", async () => {
    const loader = vi.fn(() => Promise.resolve([]));
    const Component = defineComponent({
      setup() {
        const model = useFilterField({
          def: { key: "name", type: "text", options: loader },
          source: { extra: {}, setExtra: vi.fn(), setExtras: vi.fn() },
          labels: resolveLabels(undefined),
        });
        return () =>
          FilterFieldChrome({
            model: model.value,
            controls: {
              Input: (props) => h("i", props.attrs, props.value),
              Select: (props) => h("b", props.attrs, props.value),
              Checkbox: (props) => h("u", props.attrs),
            },
          });
      },
    });
    const first = await renderToString(createSSRApp(Component));
    const second = await renderToString(createSSRApp(Component));
    expect(loader).not.toHaveBeenCalled();
    expect(first).toBe(second);
    expect(first).not.toMatch(/<(input|button|select)\b/);
  });
});
describe("Vue editing lifecycle", () => {
  it("commits to the replaced host callback without changing the row", () => {
    const first = vi.fn();
    const second = vi.fn();
    const callback = shallowRef(first);
    const scope = effectScope();
    const model = scope.run(() =>
      useTableEditing<Row>(() => ({
        rows,
        columns,
        rowKey: (row) => row.id,
        onCellEdit: callback.value,
      }))
    )!;
    const controller = scope.run(() =>
      useEditableCell(() => ({
        editing: model.bundle.value,
        row: rows[0]!,
        column: columns[0]!,
        rowId: "a",
        rows,
        columns,
        rowKey: (row) => row.id,
      }))
    )!;
    controller.value.begin();
    controller.value.setDraft("New");
    callback.value = second;
    controller.value.commit();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(rows[0], "name", "New");
    expect(rows[0]!.name).toBe("Ada");
    scope.stop();
  });
  it("keeps a rejected validation open and cancels in-flight checks", async () => {
    const gate = deferred<string | undefined>();
    const commit = vi.fn();
    const cols: readonly EditableColumnLike<Row>[] = [
      { key: "name", editable: true, validate: () => gate.promise },
    ];
    const scope = effectScope();
    const model = scope.run(() =>
      useTableEditing<Row>({
        rows,
        columns: cols,
        rowKey: (row) => row.id,
        onCellEdit: commit,
      })
    )!;
    const controller = scope.run(() =>
      useEditableCell(() => ({
        editing: model.bundle.value,
        row: rows[0]!,
        column: cols[0]!,
        rowId: "a",
        rows,
        columns: cols,
        rowKey: (row) => row.id,
      }))
    )!;
    controller.value.begin();
    controller.value.setDraft("bad");
    controller.value.commit();
    expect(controller.value.validating).toBe(true);
    gate.resolve("Invalid");
    await tick();
    expect(controller.value.error).toBe("Invalid");
    expect(controller.value.mode).toBe("editing");
    expect(commit).not.toHaveBeenCalled();
    controller.value.cancel();
    expect(controller.value.mode).toBe("activatable");
    scope.stop();
  });
  it("cancels validation when its callback is replaced without letting stale answers win", async () => {
    const first = deferred<string | undefined>();
    const second = deferred<string | undefined>();
    const validator = shallowRef(() => first.promise);
    const commit = vi.fn();
    const scope = effectScope();
    const model = scope.run(() =>
      useTableEditing<Row>(() => ({
        rows,
        columns,
        rowKey: (row) => row.id,
        onCellEdit: commit,
        validateRow: validator.value,
      }))
    )!;
    const controller = scope.run(() =>
      useEditableCell(() => ({
        editing: model.bundle.value,
        row: rows[0]!,
        column: columns[0]!,
        rowId: "a",
        rows,
        columns,
        rowKey: (row) => row.id,
      }))
    )!;
    controller.value.begin();
    controller.value.setDraft("first");
    controller.value.commit();
    await tick();
    validator.value = () => second.promise;
    controller.value.setDraft("second");
    controller.value.commit();
    await tick();
    first.resolve(undefined);
    await tick();
    expect(commit).not.toHaveBeenCalled();
    second.resolve(undefined);
    await tick();
    expect(commit).toHaveBeenCalledOnce();
    expect(commit).toHaveBeenCalledWith(rows[0], "name", "second");
    scope.stop();
  });
  it("keeps dirty observation separate from visible dirty indicators", () => {
    const save = deferred<void>();
    const observe = vi.fn();
    const scope = effectScope();
    const model = scope.run(() =>
      useTableEditing<Row>({
        rows,
        columns,
        rowKey: (row) => row.id,
        onCellEdit: () => save.promise,
        onDirtyChange: observe,
      })
    )!;
    const controller = scope.run(() =>
      useEditableCell(() => ({
        editing: model.bundle.value,
        row: rows[0]!,
        column: columns[0]!,
        rowId: "a",
        rows,
        columns,
        rowKey: (row) => row.id,
      }))
    )!;
    controller.value.begin();
    controller.value.setDraft("new");
    controller.value.commit();
    expect(observe.mock.lastCall?.[0].count).toBe(1);
    expect(controller.value.isDirty).toBe(false);
    scope.stop();
    save.resolve();
  });
  it("never sends a validated write after feature scope disposal", async () => {
    const gate = deferred<string | undefined>();
    const commit = vi.fn();
    const cols: readonly EditableColumnLike<Row>[] = [
      { key: "name", editable: true, validate: () => gate.promise },
    ];
    const scope = effectScope();
    const model = scope.run(() =>
      useTableEditing<Row>({
        rows,
        columns: cols,
        rowKey: (row) => row.id,
        onCellEdit: commit,
      })
    )!;
    const controller = scope.run(() =>
      useEditableCell(() => ({
        editing: model.bundle.value,
        row: rows[0]!,
        column: cols[0]!,
        rowId: "a",
        rows,
        columns: cols,
        rowKey: (row) => row.id,
      }))
    )!;
    controller.value.begin();
    controller.value.setDraft("new");
    controller.value.commit();
    scope.stop();
    gate.resolve(undefined);
    await tick();
    expect(commit).not.toHaveBeenCalled();
  });
  it("keeps failed save and dirty mark until host-authorized rollback", async () => {
    const save = deferred<void>();
    const rollback = vi.fn();
    const scope = effectScope();
    const model = scope.run(() =>
      useTableEditing<Row>({
        rows,
        columns,
        rowKey: (row) => row.id,
        onCellEdit: () => save.promise,
        onEditRollback: rollback,
        dirtyIndicators: true,
      })
    )!;
    const controller = scope.run(() =>
      useEditableCell(() => ({
        editing: model.bundle.value,
        row: rows[0]!,
        column: columns[0]!,
        rowId: "a",
        rows,
        columns,
        rowKey: (row) => row.id,
      }))
    )!;
    controller.value.begin();
    controller.value.setDraft("new");
    controller.value.commit();
    expect(controller.value.saveStatus).toBe("saving");
    save.reject(new Error("Offline"));
    await tick();
    expect(controller.value.saveStatus).toBe("failed");
    expect(controller.value.isDirty).toBe(true);
    controller.value.rollback();
    expect(rollback).toHaveBeenCalledWith(rows[0], "name");
    expect(controller.value.isDirty).toBe(false);
    scope.stop();
  });
  it("reconciles a live row conflict without silently overwriting the draft", () => {
    const data = shallowRef(rows);
    const commit = vi.fn();
    const scope = effectScope();
    const model = scope.run(() =>
      useTableEditing<Row>(() => ({
        rows: data.value,
        columns,
        rowKey: (row) => row.id,
        onCellEdit: commit,
      }))
    )!;
    const controller = scope.run(() =>
      useEditableCell(() => ({
        editing: model.bundle.value,
        row: data.value[0]!,
        column: columns[0]!,
        rowId: "a",
        rows: data.value,
        columns,
        rowKey: (row) => row.id,
      }))
    )!;
    controller.value.begin();
    controller.value.setDraft("mine");
    data.value = [{ ...rows[0]!, name: "theirs" }, rows[1]!];
    expect(controller.value.conflict).toBeDefined();
    controller.value.commit();
    expect(commit).not.toHaveBeenCalled();
    controller.value.takeConflict();
    expect(controller.value.draft).toBe("theirs");
    scope.stop();
  });
  it("publishes and revokes the editing bundle while keeping unchanged feature sessions alive", () => {
    const callback = vi.fn();
    const scope = effectScope();
    const features = shallowRef<readonly TableFeature<Row>[]>([
      controls(editing<Row>(callback)),
    ]);
    const shell = scope.run(() =>
      useDataTableShell<Row>(() => ({
        data: rows,
        columns,
        rowKey: (row) => row.id,
        features,
        urlSync: false,
      }))
    )!;
    const bundle = shell.state.get(editingModelKey<Row>());
    bundle.value!.state.begin("a", "name", "Ada", rows[0]);
    bundle.value!.state.setDraft("pending");
    features.value = [controls(editing<Row>(vi.fn()))];
    expect(bundle.value?.state.draft).toBe("pending");
    features.value = [];
    expect(bundle.value).toBeUndefined();
    scope.stop();
  });
  it("forwards whole-row and batch requests only at save, never while drafting", () => {
    const rowCommit = vi.fn();
    const batchCommit = vi.fn();
    const scope = effectScope();
    const row = scope.run(() =>
      useRowEditing<Row>({ enabled: true, columns, onRowEdit: rowCommit })
    )!;
    const batch = scope.run(() =>
      useBatchEditing<Row>({
        enabled: true,
        columns,
        onBatchEdit: batchCommit,
      })
    )!;
    row.value.begin(rows[0]!, "a");
    row.value.setDraft("name", "row");
    expect(rowCommit).not.toHaveBeenCalled();
    row.value.save();
    expect(rowCommit).toHaveBeenCalledWith(rows[0], { name: "row" });
    batch.value.setDraft(rows[1]!, "b", "name", "batch");
    expect(batchCommit).not.toHaveBeenCalled();
    batch.value.saveAll();
    expect(batchCommit).toHaveBeenCalledOnce();
    scope.stop();
  });
});
