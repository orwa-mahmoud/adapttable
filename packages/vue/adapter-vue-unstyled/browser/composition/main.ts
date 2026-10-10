import type { ColumnDef } from "@adapttable/vue";
import { defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../../src";
import { editing } from "../../src/editing";
import { filters } from "../../src/filters";
import { headerFilters } from "../../src/header-filters";
import { tree } from "../../src/tree";
interface Row {
  id: string;
  name: string;
  children?: readonly Row[];
}
const query = new URLSearchParams(window.location.search);
const mode = query.get("mode") === "drawer" ? "drawer" : "popover";
const columns: readonly ColumnDef<Row>[] = [{ key: "name", editable: true }];
const child: Row = { id: "c", name: "Child" };
const parent: Row = { id: "p", name: "Parent", children: [child] };
const writes = shallowRef(0);
const selection = shallowRef<readonly string[]>([]);
const mounts = shallowRef(0);
const Table = defineComponent({
  setup() {
    mounts.value++;
    return () =>
      h(DataTable<Row>, {
        data: [parent],
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        dir: query.has("rtl") ? "rtl" : "ltr",
        forceMobile: query.has("mobile"),
        classNames: {
          filtersPopover: "consumer-flex",
          filtersDrawer: "consumer-flex",
        },
        selectable: true,
        selectedIds: selection.value,
        "onUpdate:selectedIds": (ids: string[]) => {
          selection.value = ids;
        },
        features: [
          tree<Row>({
            getChildren: (row) => row.children,
            defaultExpandedIds: ["p"],
          }),
          editing<Row>(() => {
            writes.value++;
          }),
          filters<Row>([{ key: "name", type: "text" }], { mode }),
          headerFilters(),
        ],
      });
  },
});
const Other = defineComponent(
  () => () => h("button", { id: "other" }, "Other view")
);
export const CompositionDemo = defineComponent({
  setup() {
    const shown = shallowRef(true);
    return () =>
      h("main", [
        h(
          "button",
          {
            id: "toggle",
            onClick: () => {
              shown.value = !shown.value;
            },
          },
          "Switch view"
        ),
        h("output", { id: "mounts" }, String(mounts.value)),
        h("output", { id: "writes" }, String(writes.value)),
        h("output", { id: "selection" }, JSON.stringify(selection.value)),
        h(KeepAlive, null, {
          default: () => (shown.value ? h(Table) : h(Other)),
        }),
      ]);
  },
});
