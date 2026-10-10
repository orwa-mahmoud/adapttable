import type { ColumnDef } from "@adapttable/vue";
import { defineComponent, h, shallowRef } from "vue";

import { DataTable } from "../../src";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "../../src/editing";
import { filters } from "../../src/filters";
import { headerFilters } from "../../src/header-filters";
interface Person {
  id: string;
  name: string;
  amount: number;
  active: boolean;
}
const query = new URLSearchParams(window.location.search);
const unit = query.get("unit") ?? "cell";
const mode = query.get("mode") === "drawer" ? "drawer" : "popover";
const rtl = query.has("rtl");
const mobile = query.has("mobile");
const columns: readonly ColumnDef<Person>[] = [
  {
    key: "name",
    header: "Name",
    editable: true,
    filter: query.has("choices")
      ? {
          type: "multiSelect",
          options: [
            { value: "Ada", label: "Ada" },
            { value: "Grace", label: "Grace" },
          ],
        }
      : "text",
    validate: (value) => (value === "bad" ? "Choose another name" : undefined),
  },
  {
    key: "amount",
    header: "Amount",
    editable: true,
    editor: "number",
    filter: "numberRange",
  },
  {
    key: "active",
    header: "Active",
    editable: true,
    editor: "boolean",
    filter: "boolean",
  },
];
interface Edit {
  row: Person;
  patch: Readonly<Record<string, unknown>>;
}
function applyEdits(rows: readonly Person[], edits: readonly Edit[]): Person[] {
  return rows.map((row) => {
    const edit = edits.find((item) => item.row.id === row.id);
    return edit ? { ...row, ...edit.patch } : row;
  });
}
export const FilterEditingDemo = defineComponent({
  setup() {
    const rows = shallowRef<readonly Person[]>([
      { id: "1", name: "Ada", amount: 2, active: true },
      { id: "2", name: "Grace", amount: 3, active: false },
    ]);
    const writes = shallowRef(0);
    const pending = shallowRef(false);
    let finish: (() => void) | undefined;
    let fail: (() => void) | undefined;
    const save = (edits: readonly Edit[]) => {
      writes.value++;
      pending.value = true;
      return new Promise<void>((resolve, reject) => {
        finish = () => {
          rows.value = applyEdits(rows.value, edits);
          pending.value = false;
          resolve();
        };
        fail = () => {
          pending.value = false;
          reject(new Error("Offline"));
        };
      });
    };
    const cell = editing<Person>(
      (row, key, value) => save([{ row, patch: { [key]: value } }]),
      { formatEditError: () => "Offline", onEditRollback: () => undefined }
    );
    let editor = cell;
    if (unit === "row")
      editor = rowEditing<Person>((row, patch) => save([{ row, patch }]), {
        formatEditError: () => "Offline",
      });
    if (unit === "batch")
      editor = batchEditing<Person>((edits) => save(edits), {
        formatEditError: () => "Offline",
      });
    const features = [
      filters<Person>([], { mode, tree: true }),
      headerFilters(),
      editor,
      dirtyIndicators(),
      ...(unit === "cell" ? [editHistory(), undoRedoButtons()] : []),
    ];
    return () =>
      h("main", { dir: rtl ? "rtl" : "ltr" }, [
        h("h1", "Native filters and editing"),
        h("button", { id: "outside", type: "button" }, "Outside"),
        h("output", { id: "writes" }, String(writes.value)),
        h(
          "button",
          {
            id: "accept",
            type: "button",
            disabled: !pending.value,
            onClick: () => finish?.(),
          },
          "Accept save"
        ),
        h(
          "button",
          {
            id: "reject",
            type: "button",
            disabled: !pending.value,
            onClick: () => fail?.(),
          },
          "Reject save"
        ),
        h(DataTable<Person>, {
          data: rows.value,
          columns,
          rowKey: (row: Person) => row.id,
          features,
          dir: rtl ? "rtl" : "ltr",
          forceMobile: mobile,
          urlSync: false,
          tableLabel: "People",
          classNames: {
            filterInput: "native-filter",
            filterOperator: "native-operator",
            filterSelect: "native-select",
            filterCheckboxGroup: "native-checkbox-group",
            filterCheckbox: "native-checkbox",
            editCellEditor: "native-editor",
          },
        }),
      ]);
  },
});
