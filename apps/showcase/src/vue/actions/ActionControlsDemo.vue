<script setup lang="ts">
import type {
  BulkActionContext,
  ColumnDef,
  ExportAllControls,
  ExportAllResult,
} from "@adapttable/vue";
import { DataTable } from "@adapttable/vue-unstyled";
import { bulkActions } from "@adapttable/vue-unstyled/bulk-actions";
import { commandPalette } from "@adapttable/vue-unstyled/command-palette";
import { contextMenu } from "@adapttable/vue-unstyled/context-menu";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/vue-unstyled/editing";
import { exportCsv } from "@adapttable/vue-unstyled/export-csv";
import { print } from "@adapttable/vue-unstyled/print";
import { sidePanel } from "@adapttable/vue-unstyled/side-panel";
import { computed, ref, shallowRef } from "vue";
interface Person {
  id: string;
  name: string;
  amount: number;
}
const query = new URLSearchParams(globalThis.location?.search ?? "");
const mobile = query.has("mobile");
const rtl = query.has("rtl");
const shown = ref(true);
const aborted = ref(false);
const open = ref<string | null>("help");
const rows = ref<Person[]>(
  Array.from({ length: 9 }, (_, index) => ({
    id: String(index + 1),
    name: ["Ada", "Grace", "Linus"][index % 3] ?? "Person",
    amount: index + 1,
  }))
);
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", sortable: true, editable: true },
  { key: "amount", sortable: true, editor: "number", editable: true },
];
const events = ref<string[]>([]);
const bulkScope = shallowRef<BulkActionContext>();
const exportControls = shallowRef<ExportAllControls>();
let complete: ((value: ExportAllResult) => void) | undefined;
let reject: ((error: Error) => void) | undefined;
const note = (value: string) => {
  events.value = [...events.value, value];
};
const features = computed(() => [
  bulkActions([
    {
      key: "archive",
      label: "Archive selected",
      confirm: {
        title: "Archive records",
        message: (count) => `Archive ${count} records?`,
        confirmLabel: "Archive",
      },
      onClick: (ids, scope) => {
        bulkScope.value = scope;
        note(`bulk:${ids.join(",")}`);
      },
    },
  ]),
  commandPalette({
    button: true,
    commands: [
      {
        key: "host-action",
        label: "Inspect host selection",
        onSelect: () => note("command"),
      },
      {
        key: "disabled",
        label: "Unavailable command",
        disabled: true,
        onSelect: () => note("unexpected"),
      },
    ],
  }),
  contextMenu<Person>({
    items: (target) => [
      {
        key: "inspect",
        label:
          target.kind === "header"
            ? "Inspect column"
            : `Inspect ${target.row.name}`,
        onSelect: () => note(`context:${target.kind}`),
      },
    ],
  }),
  sidePanel({
    panels: [
      {
        key: "help",
        label: "Help",
        content:
          "Use the keyboard to inspect actions, selection scope, and export progress.",
      },
      {
        key: "details",
        label: "Details",
        content: () => `Host events: ${events.value.length}`,
      },
    ],
    open,
    onOpenChange: (next) => {
      open.value = next;
    },
  }),
  exportCsv<Person>({
    scope: "all",
    onExportAll: (_view, controls) => {
      exportControls.value = controls;
      aborted.value = false;
      controls.signal.addEventListener(
        "abort",
        () => {
          aborted.value = true;
        },
        { once: true }
      );
      note("export");
      return new Promise<ExportAllResult>((resolve, fail) => {
        complete = resolve;
        reject = fail;
      });
    },
  }),
  print(() => note("print"), true),
  editing<Person>((original, columnKey, value) => {
    rows.value = rows.value.map((row) =>
      row.id === original.id ? { ...row, [columnKey]: value } : row
    );
  }),
  editHistory(),
  undoRedoButtons(),
]);
</script>
<template>
  <main :dir="rtl ? 'rtl' : 'ltr'">
    <h1>Vue native table actions</h1>
    <p>Every data change is handled by this host fixture.</p>
    <button id="outside" type="button">Outside control</button>
    <button id="toggle-table" type="button" @click="shown = !shown">
      Toggle table
    </button>
    <button id="open-panel" type="button" @click="open = 'help'">
      Open help
    </button>
    <button
      id="progress"
      type="button"
      @click="exportControls?.setProgress?.(42)"
    >
      Report 42%
    </button>
    <button
      id="complete-export"
      type="button"
      @click="complete?.({ url: '/fixture.csv' })"
    >
      Complete export
    </button>
    <button
      id="reject-export"
      type="button"
      @click="reject?.(new Error('Host export failure'))"
    >
      Reject export
    </button>
    <output id="events">{{ JSON.stringify(events) }}</output>
    <output id="scope">{{ JSON.stringify(bulkScope) }}</output>
    <output id="aborted">{{ String(aborted) }}</output>
    <KeepAlive>
      <DataTable
        v-if="shown"
        :data="rows"
        :columns="columns"
        :row-key="(row) => row.id"
        :features="features"
        :defaults="{ limit: 2 }"
        :url-sync="false"
        :force-mobile="mobile"
        :dir="rtl ? 'rtl' : 'ltr'"
        selectable
      />
    </KeepAlive>
  </main>
</template>
