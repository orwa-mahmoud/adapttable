<script setup lang="ts">
import {
  DesktopTableChrome,
  elementRef,
  MobileCardsChrome,
  selectionCheckboxInputAttrs,
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { DataTable } from "@adapttable/vue-unstyled";
import { h, shallowRef } from "vue";

import { ModelCheckbox } from "./ModelCheckbox";
interface Row {
  id: string;
  name: string;
}
const params = new URLSearchParams(location.search);
const mobile = params.get("mobile") === "true";
const host = params.get("host");
const disabled = params.get("disabled") === "true";
const rows: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const selectedIds = shallowRef<readonly string[] | undefined>(
  host ? ["a", "off-page"] : undefined
);
const nativeIds = shallowRef<readonly string[]>(["a", "off-page"]);
const requests = shallowRef<readonly string[][]>([]);
const nativeRequests = shallowRef<readonly string[][]>([]);
// Rows draw in their own components, so the order their checkboxes report
// in is not the page's order: keep every one and focus the last on the page.
const rowCheckboxes = new Set<HTMLInputElement>();
const focusLastCheckbox = (): void => {
  const onPage = [...rowCheckboxes].filter((input) => input.isConnected);
  onPage.sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  onPage.at(-1)?.focus();
};
const shell = useDataTableShell<Row>(() => ({
  data: rows,
  columns: [{ key: "name", sortable: true }],
  rowKey: (row) => row.id,
  selectable: true,
  urlSync: false,
  forceMobile: mobile,
  selectedIds,
  defaultSelectedIds: ["a", "off-page"],
  onSelectionChange: (ids) => {
    requests.value = [...requests.value, ids];
    if (host === "accept") selectedIds.value = ids;
  },
}));
const rowKey = (row: Row) => row.id;
const slots: TableChromeSlots<Row> = {
  SortButton: ({ attrs, content }) => h("button", attrs, [content]),
  SelectionCheckbox: (control) =>
    h(ModelCheckbox, {
      ...selectionCheckboxInputAttrs(control.attrs),
      disabled,
      name: "selectedRows",
      "aria-describedby": "selection-hint",
      ref: elementRef<HTMLInputElement>(
        (target) => {
          if (!control.header && target) rowCheckboxes.add(target);
        },
        (instance) => {
          const value = (instance as { input?: unknown }).input;
          return value instanceof HTMLInputElement ? value : null;
        }
      ),
      modelValue: control.checked,
      indeterminate: control.indeterminate,
      "onUpdate:modelValue": control.onToggle,
    }),
};
const ContractTable = () =>
  mobile
    ? MobileCardsChrome({ model: shell.mobile.value, slots })
    : DesktopTableChrome({ model: shell.desktop.value, slots });
</script>
<template>
  <main>
    <h1>Native selection and model-event contract</h1>
    <p id="selection-hint">Each action requests one selection toggle.</p>
    <section data-selection-table="model">
      <ContractTable />
      <button type="button" @click="focusLastCheckbox">
        Focus last model checkbox
      </button>
      <output id="requests">{{ JSON.stringify(requests) }}</output>
      <output id="selected">{{
        JSON.stringify([...shell.selection.value!.selectedIds.value])
      }}</output>
    </section>
    <section data-selection-table="native">
      <DataTable
        :data="rows"
        :columns="[{ key: 'name' }]"
        :row-key="rowKey"
        :url-sync="false"
        :force-mobile="mobile"
        :selected-ids="nativeIds"
        @update:selected-ids="
          (ids) => {
            nativeRequests = [...nativeRequests, ids];
          }
        "
      />
      <output id="native-requests">{{ JSON.stringify(nativeRequests) }}</output>
    </section>
  </main>
</template>
