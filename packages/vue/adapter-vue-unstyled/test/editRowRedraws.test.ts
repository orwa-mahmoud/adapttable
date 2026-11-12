import { afterEach, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
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

it.each([
  { name: "editing" },
  { name: "selectable", selectable: true },
  { name: "navigation", nav: true },
  { name: "both", selectable: true, nav: true },
])("redraws only the row whose cell is edited: $name", async (variant) => {
  const redrawn: string[] = [];
  const data = shallowRef<readonly Row[]>(rows);
  const props = (): DataTableProps<Row> => ({
    data: data.value,
    columns: [{ key: "name", header: "Name", editable: true }],
    rowKey: (row) => row.id,
    urlSync: false,
    searchable: false,
    selectable: variant.selectable,
    features,
  });
  const features = [
    editing<Row>(() => undefined),
    ...(variant.nav ? [cellNavigation()] : []),
  ];
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
  redrawn.length = 0;
  activate.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
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
