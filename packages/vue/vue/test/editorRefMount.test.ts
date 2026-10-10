import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import { useEditableCellModel } from "../src/editing/editableCellChrome";
import { useTableEditing } from "../src/editing/editingModels";
import { useElementRef } from "../src/useElementRef";

interface Row {
  id: string;
  name: string;
}
const row = { id: "a", name: "Ada" };
const columns = [{ key: "name", editable: true }];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});
const Input = defineComponent(
  (props: { owner: (node: HTMLInputElement | null) => void }) => {
    const target = shallowRef<HTMLInputElement | null>(null);
    useElementRef(
      () => target.value,
      () => props.owner
    );
    return () => h("input", { ref: target, "data-editor": "" });
  },
  { props: ["owner"] }
);

it.each([
  { bridge: false, unit: "cell" },
  { bridge: true, unit: "cell" },
  { bridge: false, unit: "row" },
  { bridge: true, unit: "row" },
])(
  "focuses an existing $unit session on mount with bridge=$bridge",
  async ({ bridge, unit }) => {
    const tableScope = effectScope();
    const table = tableScope.run(() =>
      useTableEditing<Row>({
        rows: [row],
        columns,
        rowKey: (row) => row.id,
        onCellEdit: vi.fn(),
        rowEditing: unit === "row",
        onRowEdit: vi.fn(),
      })
    )!;
    if (unit === "row") table.bundle.value.rowEditing!.begin(row, "a");
    else table.bundle.value.state.begin("a", "name", "Ada", row);
    const Cell = defineComponent({
      setup() {
        const model = useEditableCellModel(() => ({
          row,
          rowId: "a",
          rowIndex: 0,
          rows: [row],
          columns,
          column: columns[0]!,
          editing: table.bundle.value,
          rowKey: (item: Row) => item.id,
          editLabel: "Edit name",
          display: row.name,
        }));
        expect(model.value.controller.mode).toBe("editing");
        return () =>
          bridge
            ? h(Input, { owner: model.value.editor.editorRef })
            : h("input", {
                "data-editor": "",
                ref: (node) =>
                  model.value.editor.editorRef(
                    node instanceof HTMLInputElement ? node : null
                  ),
              });
      },
    });
    const target = document.createElement("div");
    document.body.append(target);
    const app = createApp(Cell);
    app.mount(target);
    stops.push(() => {
      app.unmount();
      target.remove();
      tableScope.stop();
    });
    await nextTick();
    await nextTick();
    expect(target.querySelector("input")).not.toBeNull();
    expect(document.activeElement).toBe(target.querySelector("input"));
  }
);

it("does not admit retired-session or disposed editor targets", () => {
  const scope = effectScope();
  const next = { id: "b", name: "Bea" };
  const rows = [row, next];
  const table = scope.run(() =>
    useTableEditing<Row>({
      rows,
      columns,
      rowKey: (item) => item.id,
      onCellEdit: vi.fn(),
    })
  )!;
  const model = scope.run(() =>
    useEditableCellModel(() => ({
      row,
      rowId: "a",
      rowIndex: 0,
      rows,
      columns,
      column: columns[0]!,
      editing: table.bundle.value,
      rowKey: (item: Row) => item.id,
      editLabel: "Edit name",
      display: row.name,
    }))
  )!;
  model.value.controller.begin();
  const retired = model.value.editor.editorRef;
  table.bundle.value.state.begin("b", "name", "Bea", next);
  table.bundle.value.state.begin("a", "name", "Again", row);
  const focus = vi.fn();
  retired({ focus });
  expect(focus).not.toHaveBeenCalled();
  const current = model.value.editor.editorRef;
  current({ focus });
  expect(focus).toHaveBeenCalledOnce();
  current(null);
  scope.stop();
  current({ focus });
  expect(focus).toHaveBeenCalledOnce();
});
