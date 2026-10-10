import {
  type FilterDef,
  type FilterFormSource,
  resolveLabels,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import {
  editableCustomControl,
  type TableEditingOptions,
  useEditableCell,
  useEditableCellModel,
  useTableEditing,
} from "../src/editing";
import { useFilterField } from "../src/filters/filterFieldChrome";
import {
  useBooleanFilter,
  useChecklistFilter,
  useFilterTree,
  useRangeFilter,
  useTextFilter,
} from "../src/filters/filterModels";
import { useHeaderFilter } from "../src/filters/headerFilterChrome";
interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const columns = [{ key: "name", editable: true }];
const labels = resolveLabels({});
function fixture(options: Partial<TableEditingOptions<Row>> = {}) {
  const scope = effectScope();
  const save = vi.fn();
  const table = scope.run(() =>
    useTableEditing<Row>({
      rows,
      columns,
      rowKey: (row) => row.id,
      onCellEdit: save,
      ...options,
    })
  )!;
  const cellScope = scope.run(() => effectScope())!;
  const target = shallowRef(rows[0]!);
  const cell = cellScope.run(() =>
    useEditableCellModel(() => ({
      editing: table.bundle.value,
      row: target.value,
      rowId: target.value.id,
      rowIndex: 0,
      column: columns[0]!,
      rows,
      columns,
      rowKey: (row: Row) => row.id,
      editLabel: "Edit",
      display: target.value.name,
    }))
  )!;
  return { scope, cellScope, target, table, cell, save };
}
const key = (value: string) => ({
  key: value,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
});
describe("cell-owned editing lifetimes", () => {
  it("owns the public raw cell controller across session retirement and disposal", () => {
    const view = fixture();
    const raw = view.cellScope.run(() =>
      useEditableCell(() => ({
        editing: view.table.bundle.value,
        row: rows[0]!,
        rowId: "a",
        column: columns[0]!,
        rows,
        columns,
        rowKey: (row: Row) => row.id,
      }))
    )!;
    raw.value.begin();
    const old = raw.value;
    view.table.bundle.value.state.begin("b", "name", "Bea", rows[1]);
    view.table.bundle.value.state.begin("a", "name", "Again", rows[0]);
    old.setDraft("Stale");
    old.commit();
    old.cancel();
    old.commitOnBlur();
    old.onEditorKeyDown(key("Enter"));
    old.keepConflict();
    old.takeConflict();
    expect(raw.value.draft).toBe("Again");
    const current = raw.value;
    current.setDraft("Current");
    current.commit();
    expect(view.save).toHaveBeenCalledExactlyOnceWith(
      rows[0],
      "name",
      "Current"
    );
    raw.value.begin();
    const disposed = raw.value;
    view.cellScope.stop();
    view.table.bundle.value.state.begin("b", "name", "Fresh", rows[1]);
    disposed.begin();
    disposed.setDraft("Late");
    disposed.cancel();
    disposed.rollback();
    disposed.dismissFailure();
    expect(view.table.bundle.value.state.draft).toBe("Fresh");
    view.scope.stop();
  });
  it("revokes every disposed cell action while the table and another editor stay alive", () => {
    const view = fixture();
    view.cell.value.controller.begin();
    const old = view.cell.value;
    const control = editableCustomControl(old);
    view.cellScope.stop();
    view.table.bundle.value.state.begin("b", "name", "Fresh", rows[1]);
    control.setDraft("Stale");
    control.commit();
    control.cancel();
    control.onBlur();
    control.onKeyDown(key("Enter"));
    old.controller.begin();
    old.controller.rollback();
    old.controller.dismissFailure();
    old.controller.keepConflict();
    old.controller.takeConflict();
    old.activate.onDoubleClick(key("Enter"));
    old.activate.onKeyDown(key("F2"));
    const focus = vi.fn();
    control.focusRef({ focus });
    expect(view.table.bundle.value.state.draft).toBe("Fresh");
    expect(view.table.bundle.value.state.active?.rowId).toBe("b");
    expect(view.save).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    view.scope.stop();
  });
  it("retires A → B → A session callbacks and keeps the current session writable", () => {
    const view = fixture();
    view.cell.value.controller.begin();
    const old = editableCustomControl(view.cell.value);
    view.table.bundle.value.state.begin("b", "name", "Bea", rows[1]);
    view.table.bundle.value.state.begin("a", "name", "Again", rows[0]);
    old.setDraft("stale");
    old.cancel();
    old.commit();
    old.onKeyDown(key("Escape"));
    expect(view.table.bundle.value.state.draft).toBe("Again");
    const current = editableCustomControl(view.cell.value);
    current.setDraft("Current");
    current.commit();
    expect(view.save).toHaveBeenCalledExactlyOnceWith(
      rows[0],
      "name",
      "Current"
    );
    view.scope.stop();
  });
  it.each(["row", "batch"] as const)(
    "owns %s cell controls across reused target and cell disposal",
    (unit) => {
      const save = vi.fn();
      const view = fixture(
        unit === "row"
          ? { rowEditing: true, onRowEdit: save }
          : { batchEditing: true, onBatchEdit: save }
      );
      if (unit === "row")
        view.table.bundle.value.rowEditing!.begin(rows[0]!, "a");
      const old = editableCustomControl(view.cell.value);
      view.target.value = rows[1]!;
      if (unit === "row")
        view.table.bundle.value.rowEditing!.begin(rows[1]!, "b");
      view.target.value = rows[0]!;
      if (unit === "row")
        view.table.bundle.value.rowEditing!.begin(rows[0]!, "a");
      old.setDraft("stale");
      old.cancel();
      old.commit();
      expect(view.cell.value.controller.draft).toBe("Ada");
      const current = editableCustomControl(view.cell.value);
      current.setDraft("Current");
      expect(view.cell.value.controller.draft).toBe("Current");
      view.cellScope.stop();
      current.setDraft("Late");
      current.cancel();
      current.commit();
      if (unit === "row")
        expect(view.table.bundle.value.rowEditing!.draftFor("name")).toBe(
          "Current"
        );
      else
        expect(
          view.table.bundle.value.batch!.draftFor(rows[0]!, "a", "name")
        ).toBe("Current");
      expect(save).not.toHaveBeenCalled();
      view.scope.stop();
    }
  );
  it("invalidates pending cell validation when only the cell scope stops", async () => {
    let accept: () => void = () => undefined;
    const pending = new Promise<undefined>((resolve) => {
      accept = () => resolve(undefined);
    });
    const view = fixture({ validateRow: () => pending });
    view.cell.value.controller.begin();
    view.cell.value.controller.setDraft("Pending");
    view.cell.value.controller.commit();
    view.cellScope.stop();
    accept();
    await pending;
    await nextTick();
    await Promise.resolve();
    expect(view.save).not.toHaveBeenCalled();
    view.scope.stop();
  });
});
it("suspends only the retained cell component and resumes its current session without remount", async () => {
  const view = fixture();
  const shown = shallowRef(true);
  let setups = 0;
  let cell!: ReturnType<typeof useEditableCellModel<Row>>;
  const Cell = defineComponent({
    setup() {
      setups++;
      cell = useEditableCellModel(() => ({
        editing: view.table.bundle.value,
        row: rows[0]!,
        rowId: "a",
        rowIndex: 0,
        column: columns[0]!,
        rows,
        columns,
        rowKey: (row: Row) => row.id,
        editLabel: "Edit",
        display: "Ada",
      }));
      return () => h("div", cell.value.controller.draft);
    },
  });
  const Other = defineComponent(() => () => h("div", "Other"));
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Cell) : h(Other)) })
  );
  app.mount(host);
  await nextTick();
  cell.value.controller.begin();
  const held = editableCustomControl(cell.value);
  held.setDraft("Kept");
  shown.value = false;
  await nextTick();
  held.setDraft("Late");
  held.commit();
  held.cancel();
  held.onBlur();
  held.onKeyDown(key("Enter"));
  expect(view.table.bundle.value.state.draft).toBe("Kept");
  expect(view.save).not.toHaveBeenCalled();
  shown.value = true;
  await nextTick();
  expect(setups).toBe(1);
  const current = editableCustomControl(cell.value);
  current.setDraft("Resumed");
  current.commit();
  expect(view.save).toHaveBeenCalledExactlyOnceWith(rows[0], "name", "Resumed");
  app.unmount();
  host.remove();
  view.scope.stop();
});
describe("filter control ownership", () => {
  it.each(["text", "numberRange", "boolean", "select", "multiSelect"] as const)(
    "revokes retained %s fields after disposal",
    (type) => {
      const write = vi.fn();
      const scope = effectScope();
      const model = scope.run(() =>
        useFilterField<Row>({
          id: "field",
          def: { key: "name", type, options: [{ value: "x", label: "X" }] },
          source: {
            extra: type === "numberRange" ? { nameOp: "gte" } : {},
            setExtra: write,
            setExtras: write,
          },
          labels,
        })
      )!;
      const controls = model.value.controls;
      scope.stop();
      for (const control of controls) {
        if (control.kind === "checkbox") control.props.onChange(true);
        else control.props.onChange(control.key === "operator" ? "eq" : "true");
      }
      expect(write).not.toHaveBeenCalled();
    }
  );
  it("routes live retained controls to the current source callback but retires replaced field identities", () => {
    const first = vi.fn();
    const latest = vi.fn();
    const scope = effectScope();
    const definition = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "text",
    });
    const source = shallowRef<FilterFormSource<Row>>({
      extra: {},
      setExtra: first,
      setExtras: first,
    });
    const model = scope.run(() => useTextFilter(definition, source))!;
    const old = model.value;
    source.value = { extra: {}, setExtra: latest, setExtras: latest };
    old.write("contains", "current");
    expect(latest).toHaveBeenCalledExactlyOnceWith({
      name: "current",
      nameOp: "contains",
    });
    expect(first).not.toHaveBeenCalled();
    latest.mockClear();
    definition.value = { key: "other", type: "text" };
    definition.value = { key: "name", type: "text" };
    old.setOp("eq");
    old.write("eq", "late");
    expect(latest).not.toHaveBeenCalled();
    model.value.write("contains", "fresh");
    expect(latest).toHaveBeenCalledOnce();
    scope.stop();
  });
  it("guards direct range, boolean, checklist and tree actions and accepts current tree callback replacement", () => {
    const scope = effectScope();
    const first = vi.fn();
    const latest = vi.fn();
    const source = shallowRef<FilterFormSource<Row>>({
      extra: {},
      allFilteredRows: rows,
      setExtra: first,
      setExtras: first,
    });
    const range = scope.run(() =>
      useRangeFilter<Row>({ key: "name", type: "numberRange" }, source)
    )!;
    const boolean = scope.run(() =>
      useBooleanFilter<Row>({ key: "name", type: "boolean" }, source)
    )!;
    const checklist = scope.run(() =>
      useChecklistFilter<Row>(
        {
          key: "name",
          type: "multiSelect",
          options: [{ value: "Ada", label: "Ada" }],
        },
        source
      )
    )!;
    const writer = shallowRef(first);
    const tree = scope.run(() =>
      useFilterTree<Row>(() => ({
        defs: [{ key: "name", type: "text" }],
        source: { filterTree: undefined, setFilterTree: writer.value },
      }))
    )!;
    const actions = tree.actions.value;
    writer.value = latest;
    actions.addCondition([]);
    expect(latest).toHaveBeenCalledOnce();
    latest.mockClear();
    const held = {
      range: range.value,
      boolean: boolean.value,
      checklist: checklist.value,
    };
    scope.stop();
    held.range.setOp("eq");
    held.range.write("eq", "1", "");
    held.boolean.write("true");
    held.checklist.setQuery("late");
    held.checklist.toggle("Ada", true);
    held.checklist.clear();
    held.checklist.selectAllVisible();
    actions.addCondition([]);
    actions.addGroup([]);
    actions.setCombinator([], "or");
    actions.remove([0]);
    actions.replace([0], { key: "name", op: "eq", value: "late" });
    tree.setExpanded(true);
    expect(first).not.toHaveBeenCalled();
    expect(latest).not.toHaveBeenCalled();
    expect(checklist.value.query).toBe("");
    expect(tree.expanded.value).toBe(false);
  });
  it("suspends fields and header overlays during KeepAlive, then resumes the same component", async () => {
    const write = vi.fn();
    const showing = shallowRef(true);
    let setupCount = 0;
    let field!: ReturnType<typeof useTextFilter<Row>>;
    let header!: ReturnType<typeof useHeaderFilter<Row>>;
    const Table = defineComponent({
      setup() {
        setupCount++;
        const source = { extra: {}, setExtra: write, setExtras: write };
        const def: FilterDef<Row> = { key: "name", type: "text" };
        field = useTextFilter(def, source);
        header = useHeaderFilter({ id: "header", def, source, labels });
        return () => h("button", "Table");
      },
    });
    const host = document.createElement("div");
    document.body.append(host);
    const Other = defineComponent(() => () => h("div", "Other"));
    const app = createApp(() =>
      h(KeepAlive, null, {
        default: () => (showing.value ? h(Table) : h(Other)),
      })
    );
    app.mount(host);
    await nextTick();
    const retained = field.value;
    const trigger = header.value.trigger;
    trigger.onClick();
    expect(header.value.open).toBe(true);
    showing.value = false;
    await nextTick();
    retained.write("contains", "late");
    trigger.onClick();
    header.value.close("escape");
    expect(write).not.toHaveBeenCalled();
    showing.value = true;
    await nextTick();
    expect(setupCount).toBe(1);
    expect(header.value.open).toBe(false);
    field.value.write("contains", "live");
    expect(write).toHaveBeenCalledOnce();
    app.unmount();
    host.remove();
  });
  it("keeps filter writers and editor activation inert during SSR", async () => {
    const write = vi.fn();
    const App = defineComponent({
      setup() {
        const source = { extra: {}, setExtra: write, setExtras: write };
        const field = useTextFilter<Row>({ key: "name", type: "text" }, source);
        field.value.write("contains", "SSR");
        const tree = useFilterTree<Row>({
          defs: [{ key: "name", type: "text" }],
          source: { setFilterTree: write },
        });
        tree.actions.value.addCondition([]);
        const editing = useTableEditing<Row>({
          rows,
          columns,
          rowKey: (row) => row.id,
          onCellEdit: write,
        });
        const cell = useEditableCell(() => ({
          editing: editing.bundle.value,
          row: rows[0]!,
          rowId: "a",
          column: columns[0]!,
          rows,
          columns,
          rowKey: (row: Row) => row.id,
        }));
        cell.value.begin();
        cell.value.setDraft("SSR");
        cell.value.commit();
        expect(editing.bundle.value.state.active).toBeNull();
        return () => h("div", "SSR");
      },
    });
    expect(await renderToString(createSSRApp(App))).toContain("SSR");
    expect(write).not.toHaveBeenCalled();
  });
});
