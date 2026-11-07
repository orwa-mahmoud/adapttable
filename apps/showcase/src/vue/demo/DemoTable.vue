<script setup lang="ts">
import { applyRowReorder } from "@adapttable/core";
import { aggregate, useServerData } from "@adapttable/vue";
import { onScopeDispose, shallowRef } from "vue";

import {
  demoSession,
  demoUrlAdapter,
  registerDemoCapture,
} from "../../angular/demoTransitions.mjs";
import { formatMoney } from "../../people";
import {
  applyPersonEdit,
  fetchPeople,
  FILTER_DEFS,
  peopleColumns,
  peopleRows,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../matrix/data";
import { useShowcaseKit } from "../matrix/showcaseKit";

const props = defineProps<{ lab: boolean }>();
const kit = useShowcaseKit();
const query = new URLSearchParams(window.location.search);
const enabled = (key: string, initial = false): boolean =>
  query.has(key) ? query.get(key) === "on" : initial;
const server =
  query.get("mode") === "server" || query.get("mode") === "backend";
const editing = enabled("editing", true) && !server;
const grouped = enabled("grouping") && !server;
const rows = shallowRef<readonly Person[]>(
  demoSession.read("vue-people", peopleRows)
);
onScopeDispose(
  registerDemoCapture(() => demoSession.write("vue-people", rows.value))
);
const columns = peopleColumns({ editable: editing, status: kit.status });
const urlKey = props.lab ? "vue-lab" : "vue-live";
const log = shallowRef("");
const loading = shallowRef(false);
const error = shallowRef<Error | null>(null);
const serverRows = shallowRef<readonly Person[]>([]);
const total = shallowRef(0);
const source = server
  ? useServerData<Person>({
      rows: serverRows,
      total,
      loading,
      error,
      supports: { filterTree: true },
      urlKey,
      urlAdapter: demoUrlAdapter,
      defaults: { limit: 10 },
      onQueryChange: async (params, context) => {
        loading.value = true;
        error.value = null;
        try {
          const result = await fetchPeople(params);
          if (context.signal.aborted) return;
          serverRows.value = result.items;
          total.value = result.total;
        } catch (failure) {
          if (!context.signal.aborted)
            error.value =
              failure instanceof Error ? failure : new Error(String(failure));
        } finally {
          if (!context.signal.aborted) loading.value = false;
        }
      },
    })
  : undefined;
const filterMode = query.get("filters") === "drawer" ? "drawer" : "popover";
const features = [
  kit.filters(FILTER_DEFS, { mode: filterMode, tree: true }),
  ...(query.get("filters") === "header" ? [kit.headerFilters()] : []),
  kit.columnMenu(),
  kit.resizableColumns(),
  kit.savedViews({
    storageKey: `adapttable-${kit.key}-${urlKey}-views`,
    urlKey,
  }),
  kit.exportCsv<Person>({ filename: "people.csv" }),
  // The React live demo does not mount fullscreen, a status bar, or undo.
  ...(props.lab ? [kit.fullscreen(), kit.statusBar()] : []),
  ...(grouped
    ? [
        kit.groupingPanel<Person>(["team"], {
          groupAggregates: aggregate<Person>({ budget: "sum" }, { columns }),
          groupFooters: true,
        }),
      ]
    : []),
  ...(editing
    ? [
        // A visitor's first click on a value opens it, as a form field would.
        kit.editing<Person>(
          (row, key, value) => {
            rows.value = applyPersonEdit(rows.value, row, key, value);
          },
          { editActivation: "click" }
        ),
        ...(!props.lab
          ? [
              kit.rowEditing<Person>((row, patch) => {
                rows.value = rows.value.map((item) =>
                  item.id === row.id ? { ...item, ...patch } : item
                );
              }),
            ]
          : []),
        kit.editHistory(),
        ...(props.lab ? [kit.undoRedoButtons()] : []),
        kit.cellNavigation(),
      ]
    : []),
  ...(enabled("selection", true) && !server
    ? [
        kit.bulkActions([
          {
            key: "export",
            label: "Export",
            onClick: (ids) => {
              log.value = `Export: ${ids.length}`;
            },
          },
          {
            key: "archive",
            label: "Archive",
            onClick: (ids) => {
              const selected = new Set(ids);
              rows.value = rows.value.map((row) =>
                selected.has(row.id) ? { ...row, status: "Archived" } : row
              );
              log.value = `Archived ${ids.length} ${ids.length === 1 ? "row" : "rows"}`;
            },
          },
        ]),
      ]
    : []),
  ...(enabled("row-reorder") && !server
    ? [
        kit.rowReorder<Person>((from, to) => {
          rows.value = applyRowReorder(rows.value, from, to);
        }),
      ]
    : []),
  ...(!server && !props.lab
    ? [
        kit.rowActions<Person>([
          { key: "edit", label: "Edit", editsRow: true },
          {
            key: "delete",
            label: "Delete",
            color: "red",
            onClick: (row) => {
              rows.value = rows.value.filter((item) => item.id !== row.id);
            },
          },
        ]),
      ]
    : []),
  ...(enabled("row-actions") && !server
    ? [
        kit.rowActions<Person>([
          {
            key: "inspect",
            label: "Inspect",
            onClick: (row) => {
              log.value = `Inspect ${row.name}`;
            },
          },
        ]),
      ]
    : []),
];
const summary = enabled("summary")
  ? aggregate<Person>(
      { budget: "sum" },
      {
        columns,
        format: (value) =>
          typeof value === "number" ? formatMoney(value) : "",
      }
    )
  : undefined;
const density = query.get("density") === "compact" ? "compact" : "comfortable";
</script>

<template>
  <div
    class="mx-demo mx-ng mx-vue"
    :class="{ 'mx-ng--unstyled': kit.key === 'vue-unstyled' }"
    :data-adapter="kit.key"
    :style="{ '--kit': 'var(--brand)', '--c': 'var(--brand)' }"
  >
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        :data="source ? undefined : rows"
        :source="source"
        :columns="columns"
        :row-key="rowKey"
        table-label="People directory"
        :url-key="urlKey"
        :url-adapter="demoUrlAdapter"
        :selectable="enabled('selection', true)"
        :mobile-breakpoint="enabled('mobile') ? Number.MAX_SAFE_INTEGER : 768"
        :default-column-layout="
          props.lab ? undefined : { hidden: ['email', 'team'] }
        "
        :defaults="{ limit: props.lab ? 10 : 5 }"
        :density="density"
        :animate="enabled('motion', true)"
        :summary-row="summary"
        :features="features"
      />
    </div>
    <p v-if="log" role="status" class="hint">{{ log }}</p>
  </div>
</template>
