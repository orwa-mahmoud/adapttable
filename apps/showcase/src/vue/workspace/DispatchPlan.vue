<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import { aggregate } from "@adapttable/vue";
import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import { cellNavigation } from "@adapttable/vue-unstyled/cell-navigation";
import { cellSpan } from "@adapttable/vue-unstyled/cell-span";
import { exportCsv } from "@adapttable/vue-unstyled/export-csv";
import { findInTable } from "@adapttable/vue-unstyled/find-in-table";
import { rowReorder } from "@adapttable/vue-unstyled/row-reorder";
import { statusBar } from "@adapttable/vue-unstyled/status-bar";
import { tree } from "@adapttable/vue-unstyled/tree";
import { computed, h, shallowRef } from "vue";

import { workspaceCopy } from "./copy";
import { type Order, regionLabel, type WorkspaceProps } from "./data";
import { type Region, REGIONS, runId, useWorkspaceSession } from "./session";

interface Delivery {
  id: string;
  region: Region;
  kind: "run" | "order";
  owner: string;
  name: string;
  driver: string;
  parcels: number;
  pickup: string;
  vehicle: string;
  children?: readonly Delivery[];
}
const props = defineProps<WorkspaceProps & { rows: readonly Order[] }>();
const text = computed(() => workspaceCopy[props.locale]);
const session = useWorkspaceSession();
const drivers = ["Amira Hassan", "Theo Martin", "Sofia Reyes"];
const deliveries = computed<readonly Delivery[]>(() =>
  session.state.value.dispatch.runs.map((region) => {
    const index = REGIONS.indexOf(region);
    const driver = drivers[index] ?? "";
    const pickup = ["09:00–10:30", "11:00–12:30", "14:00–15:30"][index] ?? "";
    const vehicle = `${text.value.van} ${new Intl.NumberFormat(props.locale).format(index + 1)}`;
    const byId = new Map(props.rows.map((row) => [row.id, row]));
    const children = session.state.value.dispatch.orders[region].flatMap(
      (id): Delivery[] => {
        const order = byId.get(id);
        if (order?.status !== "Ready") return [];
        return [
          {
            id,
            region,
            kind: "order",
            name: order.customer,
            owner: order.owner,
            driver,
            parcels: order.lines.length,
            pickup,
            vehicle,
          },
        ];
      }
    );
    return {
      id: runId(region),
      region,
      kind: "run",
      name: `${regionLabel(region, props.locale)} · ${text.value.deliveryRun}`,
      owner: "",
      driver,
      pickup,
      vehicle,
      parcels: children.reduce((sum, row) => sum + row.parcels, 0),
      children,
    };
  })
);
const selected = computed({
  get: () => session.state.value.dispatch.selected,
  set: (ids: readonly string[]) => session.updateDispatch({ selected: ids }),
});
const message = shallowRef("");
const columns = computed<readonly ColumnDef<Delivery>[]>(() => [
  { key: "name", header: text.value.run, width: 280 },
  { key: "driver", header: text.value.driver, width: 170 },
  { key: "owner", header: text.value.owner, width: 160 },
  {
    key: "pickup",
    header: text.value.pickup,
    width: 160,
    cell: ({ row }) => h("bdi", { dir: "ltr" }, row.pickup),
  },
  { key: "vehicle", header: text.value.vehicle, width: 116 },
  {
    key: "parcels",
    header: text.value.parcels,
    width: 100,
    type: "number",
    align: "end",
  },
]);
function move(from: number, to: number, row: Delivery): void {
  if (row.kind === "run") {
    const runs = [...session.state.value.dispatch.runs];
    if (runs[from] !== row.region) return;
    const [region] = runs.splice(from, 1);
    if (region) runs.splice(to, 0, region);
    session.updateDispatch({ runs });
  } else {
    const ids = [...session.state.value.dispatch.orders[row.region]];
    if (ids[from] !== row.id) return;
    const [id] = ids.splice(from, 1);
    if (id) ids.splice(to, 0, id);
    session.updateDispatch({
      orders: { ...session.state.value.dispatch.orders, [row.region]: ids },
    });
  }
  message.value = text.value.moved;
}
const features = [
  tree<Delivery>({
    getChildren: (row) => row.children,
    treeColumn: "name",
    expandedIds: () => session.state.value.dispatch.expanded,
    onExpandedIdsChange: (ids) => session.updateDispatch({ expanded: ids }),
  }),
  cellNavigation(),
  findInTable({ button: true }),
  statusBar(),
  rowReorder<Delivery>(move, { movePolicy: "never" }),
  exportCsv<Delivery>({ scope: "all", filename: "dispatch-plan.csv" }),
];
const manifest = computed(() =>
  deliveries.value.flatMap((run) => run.children ?? [])
);
const manifestColumns = computed<readonly ColumnDef<Delivery>[]>(() => [
  {
    key: "pickup",
    header: text.value.pickup,
    width: 168,
    cell: ({ row }) => h("bdi", { dir: "ltr" }, row.pickup),
  },
  { key: "name", header: text.value.destination, width: 240, sortable: true },
  { key: "vehicle", header: text.value.vehicle, width: 116 },
  {
    key: "parcels",
    header: text.value.parcels,
    width: 100,
    align: "end",
    type: "number",
  },
]);
const manifestFeatures = [
  cellSpan<Delivery>(({ row, column, sectionRows, sectionRowIndex }) => {
    if (column.key !== "pickup") return undefined;
    let count = 1;
    while (sectionRows[sectionRowIndex + count]?.pickup === row.pickup) count++;
    return { rowSpan: count };
  }),
  cellNavigation(),
  findInTable({ button: true }),
  statusBar(),
  exportCsv<Delivery>({ scope: "page", filename: "pickup-manifest.csv" }),
];
const summary = aggregate<Delivery>({ parcels: "sum" });
</script>
<template>
  <section class="workspace-view" aria-labelledby="dispatch-heading">
    <header class="workspace-view__head">
      <div>
        <p class="workspace-eyebrow">02 / {{ text.dispatch }}</p>
        <h2 id="dispatch-heading">{{ text.dispatchTitle }}</h2>
        <p>{{ text.dispatchLead }}</p>
      </div>
    </header>
    <p class="workspace-feedback" role="status">
      {{ message || text.dispatchNote }}
    </p>
    <DataTable
      v-model:selected-ids="selected"
      data-workspace-table="dispatch"
      :data="deliveries"
      :columns="columns"
      :row-key="(row) => row.id"
      :features="features"
      :summary-row="summary"
      :labels="getLabels(locale)"
      :locale="locale"
      :dir="locale === 'ar' ? 'rtl' : 'ltr'"
      :force-mobile="mobile"
      :defaults="{ limit: 10 }"
      url-key="workspace-dispatch"
      :url-sync="true"
      :search-debounce-ms="0"
      :table-label="text.dispatch"
      selectable
    >
      <template #tableFooter
        ><p class="workspace-table-note">{{ text.dispatchNote }}</p></template
      >
    </DataTable>
    <div class="workspace-subhead">
      <h3>{{ text.manifest }}</h3>
      <p>{{ text.manifestLead }}</p>
    </div>
    <DataTable
      data-workspace-table="manifest"
      :data="manifest"
      :columns="manifestColumns"
      :row-key="(row) => row.id"
      :features="manifestFeatures"
      :summary-row="summary"
      :labels="getLabels(locale)"
      :locale="locale"
      :dir="locale === 'ar' ? 'rtl' : 'ltr'"
      :force-mobile="mobile"
      :defaults="{ limit: 6 }"
      url-key="workspace-manifest"
      :url-sync="true"
      :search-debounce-ms="0"
      :table-label="text.manifest"
      selectable
    >
      <template #tableFooter
        ><p class="workspace-table-note">{{ text.spanNote }}</p></template
      >
    </DataTable>
  </section>
</template>
