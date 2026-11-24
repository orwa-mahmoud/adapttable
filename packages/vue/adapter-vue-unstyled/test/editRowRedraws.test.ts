import { afterEach, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { selection } from "../src/selection";
import { cellNavigation } from "../src/cell-navigation";
import { editing } from "../src/editing";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = ["a", "b", "c", "d", "e"].map((id) => ({
  id,
  name: `Name ${id}`,
}));
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});

const columns: DataTableProps<Row>["columns"] = [
  { key: "name", header: "Name", editable: true },
];
const rowKey = (row: Row) => row.id;

it.each([
  { name: "editing" },
  { name: "selectable", selectable: true },
  { name: "navigation", nav: true },
  { name: "both", selectable: true, nav: true },
  { name: "writes back", writeBack: true },
  { name: "navigation writes back", nav: true, writeBack: true },
  {
    name: "selectable navigation writes back",
    selectable: true,
    nav: true,
    writeBack: true,
  },
])("redraws only the row whose cell is edited: $name", async (variant) => {
  const redrawn: string[] = [];
  const data = shallowRef<readonly Row[]>(rows);
  // A host's columns and row key stay the same between renders; only the
  // data changes.
  const features = [
    ...(variant.selectable ? [selection()] : []),
    editing<Row>((row, key, value) => {
      if (!("writeBack" in variant)) return;
      data.value = data.value.map((item) =>
        item === row ? { ...item, [key]: String(value) } : item
      );
    }),
    ...(variant.nav ? [cellNavigation()] : []),
  ];
  const props = (): DataTableProps<Row> => ({
    data: data.value,
    columns,
    rowKey,
    urlSync: false,
    searchable: false,
    features,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({ setup: () => () => h(DataTable<Row>, props()) })
  );
  app.mixin({
    updated(this: {
      $options: { name?: string };
      $props: { row?: { key?: string } };
    }) {
      if (this.$options.name === "AdaptTableRow")
        redrawn.push(this.$props.row?.key ?? "?");
    },
  });
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  await nextTick();
  const activate = root.querySelectorAll<HTMLButtonElement>(
    '[data-adapttable-part="edit-cell-activate"]'
  )[1]!;
  // Warm up on the same row: features that switch on with the first
  // interaction (cell navigation) are not counted as the edit's work.
  activate.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  await nextTick();
  await nextTick();
  root
    .querySelector('[data-adapttable-part="edit-cell-editor"]')
    ?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
  for (let tick = 0; tick < 3; tick++) await nextTick();
  redrawn.length = 0;
  root
    .querySelectorAll<HTMLButtonElement>(
      '[data-adapttable-part="edit-cell-activate"]'
    )[1]!
    .dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  await nextTick();
  await nextTick();
  const editor = root.querySelector<HTMLInputElement>(
    'input[data-adapttable-part="edit-cell-editor"], [data-adapttable-part="edit-cell-editor"] input'
  )!;
  expect(editor).not.toBeNull();
  editor.value = "Edited";
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
  editor.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
  );
  await nextTick();
  await nextTick();
  expect(new Set(redrawn)).toEqual(new Set(["b"]));
});
