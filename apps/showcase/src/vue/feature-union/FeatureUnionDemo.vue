<script setup lang="ts">
import {
  type ColumnDef,
  DataTable,
  type DataTableProps,
} from "@adapttable/vue-unstyled";
import {
  cellNavigation,
  type CellRange,
} from "@adapttable/vue-unstyled/cell-navigation";
import { editing } from "@adapttable/vue-unstyled/editing";
import { exportCsv } from "@adapttable/vue-unstyled/export-csv";
import { findInTable } from "@adapttable/vue-unstyled/find-in-table";
import { rowReorder } from "@adapttable/vue-unstyled/row-reorder";
import { statusBar } from "@adapttable/vue-unstyled/status-bar";
import { tree } from "@adapttable/vue-unstyled/tree";
import { virtualize } from "@adapttable/vue-unstyled/virtualize";
import { computed, shallowRef } from "vue";

interface UnionRow {
  id: string;
  name: string;
  score: number;
  children?: readonly UnionRow[];
}
interface CapturedExport {
  scope: string;
  rowIds: readonly string[];
  columnKeys: readonly string[];
}
function makeRows(): readonly UnionRow[] {
  return [
    {
      id: "source",
      name: "Source group",
      score: -1,
      children: Array.from({ length: 160 }, (_, index) => ({
        id: `leaf-${index}`,
        name: `Loaded child ${index}`,
        score: index,
      })),
    },
    { id: "destination", name: "Destination group", score: -2, children: [] },
  ];
}
const rows = shallowRef(makeRows());
const shown = shallowRef(true);
const rtl = shallowRef(true);
const acceptEdits = shallowRef(false);
const acceptMoves = shallowRef(false);
const nativeConfirmation = shallowRef(false);
const selectedIds = shallowRef<readonly string[]>([]);
const range = shallowRef<CellRange | null>(null);
const scope = shallowRef<"range" | "page">("range");
const lastExport = shallowRef<CapturedExport | null>(null);
const exportRequests = shallowRef(0);
const editRequests = shallowRef(0);
const acceptedEdits = shallowRef(0);
const moveRequests = shallowRef(0);
const acceptedMoves = shallowRef(0);
const sourceVersion = shallowRef(1);
const pendingMove = shallowRef("");
let settleMove: ((accepted: boolean) => void) | undefined;

const columns: readonly ColumnDef<UnionRow>[] = [
  { key: "name", header: "Name" },
  {
    key: "secret",
    header: "Hidden field",
    accessor: () => "hidden-only-value",
  },
  ...Array.from({ length: 24 }, (_, index) => ({
    key: `metric-${index}`,
    header: `Metric ${index}`,
    accessor: (row: UnionRow) =>
      index === 18 && row.id === "leaf-120"
        ? "far-cell-120"
        : `${row.id}:metric-${index}`,
  })),
  {
    key: "tail",
    header: "Score",
    accessor: (row: UnionRow) => row.score,
    editable: true,
    editor: "number",
    parseValue: Number,
  },
];
const layout: NonNullable<DataTableProps<UnionRow>["columnLayout"]> = {
  hidden: ["secret"],
  order: [],
  pinned: { name: "start", tail: "end" },
  widths: Object.fromEntries(columns.map((column) => [column.key, 150])),
};
function updateRow(
  list: readonly UnionRow[],
  id: string,
  update: (row: UnionRow) => UnionRow
): readonly UnionRow[] {
  return list.map((row) => {
    if (row.id === id) return update(row);
    return row.children
      ? { ...row, children: updateRow(row.children, id, update) }
      : row;
  });
}
function withoutRow(
  list: readonly UnionRow[],
  id: string
): readonly UnionRow[] {
  return list
    .filter((row) => row.id !== id)
    .map((row) =>
      row.children ? { ...row, children: withoutRow(row.children, id) } : row
    );
}
function reorderSiblings(
  list: readonly UnionRow[],
  rowId: string,
  from: number,
  to: number
): readonly UnionRow[] {
  if (list[from]?.id === rowId) {
    const next = [...list];
    const [row] = next.splice(from, 1);
    if (row) next.splice(to, 0, row);
    return next;
  }
  return list.map((row) =>
    row.children
      ? { ...row, children: reorderSiblings(row.children, rowId, from, to) }
      : row
  );
}
const navigation = cellNavigation({
  onRangeChange: (next) => {
    range.value = next;
  },
});
const hierarchy = tree<UnionRow>({
  getChildren: (row) => row.children,
  defaultExpandedIds: ["source", "destination"],
});
const edit = editing<UnionRow>((row, key, value) => {
  editRequests.value++;
  if (!acceptEdits.value || key !== "tail") return;
  acceptedEdits.value++;
  rows.value = updateRow(rows.value, row.id, (current) => ({
    ...current,
    score: Number(value),
  }));
});
const reorder = computed(() =>
  rowReorder<UnionRow>(
    (from, to, row) => {
      moveRequests.value++;
      if (!acceptMoves.value) return;
      acceptedMoves.value++;
      rows.value = reorderSiblings(rows.value, row.id, from, to);
    },
    {
      movePolicy: "confirm",
      confirmMove: nativeConfirmation.value
        ? undefined
        : (request) => {
            pendingMove.value = request.row.id;
            return new Promise<boolean>((resolve) => {
              settleMove = resolve;
            });
          },
      onTreeMove: (row, _from, to, position) => {
        moveRequests.value++;
        if (!acceptMoves.value) return;
        acceptedMoves.value++;
        const remaining = withoutRow(rows.value, row.id);
        if (to.id === null) {
          const next = [...remaining];
          next.splice(position, 0, row);
          rows.value = next;
        } else {
          rows.value = updateRow(remaining, to.id, (parent) => {
            const children = [...(parent.children ?? [])];
            children.splice(position, 0, row);
            return { ...parent, children };
          });
        }
      },
    }
  )
);
const features = computed(() => [
  hierarchy,
  virtualize({ maxHeight: 320, virtualOverscan: 2, virtualizeColumns: true }),
  navigation,
  findInTable({ button: true }),
  statusBar(),
  edit,
  reorder.value,
  exportCsv<UnionRow>({
    scope: scope.value,
    request: (info) => {
      exportRequests.value++;
      lastExport.value = {
        scope: info.scope,
        rowIds: info.rows.map((row) => row.id),
        columnKeys: info.columns.map((column) => column.key),
      };
    },
  }),
]);
const destinationIds = computed(
  () =>
    rows.value
      .find((row) => row.id === "destination")
      ?.children?.map((row) => row.id) ?? []
);
function answerMove(accepted: boolean): void {
  const settle = settleMove;
  settleMove = undefined;
  pendingMove.value = "";
  settle?.(accepted);
}
function replaceRows(): void {
  rows.value = makeRows();
  sourceVersion.value++;
}
</script>

<template>
  <main class="feature-union-demo">
    <h1>Vue Unstyled combined features</h1>
    <p>
      Experimental Vue packages. Explore a tree with loaded
      descendants, virtual rows and columns, keyboard navigation and host-owned
      changes.
    </p>
    <fieldset>
      <legend>Host controls</legend>
      <label><input v-model="rtl" type="checkbox" />RTL layout</label>
      <label
        ><input v-model="acceptEdits" type="checkbox" />Accept edit
        requests</label
      >
      <label
        ><input v-model="acceptMoves" type="checkbox" />Accept move
        requests</label
      >
      <label
        ><input v-model="nativeConfirmation" type="checkbox" />Use native move
        confirmation</label
      >
      <label
        >Export scope<select v-model="scope">
          <option value="range">Selected cell range</option>
          <option value="page">Source page</option>
        </select></label
      >
      <button id="union-toggle" type="button" @click="shown = !shown">
        {{ shown ? "Suspend table" : "Resume table" }}
      </button>
      <button type="button" @click="replaceRows">Replace source rows</button>
      <button type="button" :disabled="!pendingMove" @click="answerMove(true)">
        Approve pending move
      </button>
      <button type="button" :disabled="!pendingMove" @click="answerMove(false)">
        Reject pending move
      </button>
    </fieldset>
    <div class="host-results" aria-live="polite">
      <output id="union-range" aria-label="Cell range">{{
        JSON.stringify(range)
      }}</output>
      <output id="union-selected" aria-label="Selected row IDs">{{
        JSON.stringify(selectedIds)
      }}</output>
      <output id="union-export" aria-label="Captured export">{{
        JSON.stringify(lastExport)
      }}</output>
      <output id="union-export-count" aria-label="Export requests">{{
        exportRequests
      }}</output>
      <output id="union-edit-count" aria-label="Edit requests">{{
        editRequests
      }}</output>
      <output id="union-accepted-edits" aria-label="Accepted edits">{{
        acceptedEdits
      }}</output>
      <output id="union-move-count" aria-label="Move requests">{{
        moveRequests
      }}</output>
      <output id="union-accepted-moves" aria-label="Accepted moves">{{
        acceptedMoves
      }}</output>
      <output id="union-pending" aria-label="Pending move row">{{
        pendingMove
      }}</output>
      <output id="union-destination" aria-label="Destination children">{{
        JSON.stringify(destinationIds)
      }}</output>
      <output id="union-source-version" aria-label="Source version">{{
        sourceVersion
      }}</output>
    </div>
    <KeepAlive>
      <DataTable
        v-if="shown"
        v-model:selected-ids="selectedIds"
        data-demo-table="feature-union"
        :data="rows"
        :columns="columns"
        :row-key="(row) => row.id"
        :features="features"
        :column-layout="layout"
        :defaults="{ limit: 1000 }"
        pagination-mode="infinite"
        :force-mobile="false"
        :searchable="false"
        :url-sync="false"
        :dir="rtl ? 'rtl' : 'ltr'"
        selectable
        table-label="Combined feature records"
      />
    </KeepAlive>
  </main>
</template>

<style scoped>
.feature-union-demo {
  max-width: 980px;
  margin: 24px auto;
  padding: 16px;
}
fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-block-end: 16px;
}
label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.host-results {
  display: grid;
  gap: 4px;
  font-size: 12px;
  overflow-wrap: anywhere;
  margin-block-end: 16px;
}
output::before {
  content: attr(aria-label) ": ";
  font-weight: bold;
}
</style>
