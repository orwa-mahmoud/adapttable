<script setup lang="ts">
/** Rows: pin from the 3-dot menu, and merge a team that runs down the page. */
import { shallowRef } from "vue";

import {
  PEOPLE,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

/** Cluster teammates so a Team span has a consecutive run to cover. */
function orderPeopleByTeam(rows: readonly Person[]): Person[] {
  return [...rows].sort((a, b) => {
    const byTeam = a.team.localeCompare(b.team);
    if (byTeam !== 0) return byTeam;
    return Number(a.id) - Number(b.id);
  });
}

/**
 * Merge a team that runs down consecutive rows. The origin of the run owns
 * the cell; the rows under it draw nothing there.
 */
function teamSpan({
  column,
  sectionRows,
  sectionRowIndex,
}: {
  column: { key: string };
  sectionRows: readonly Person[];
  sectionRowIndex: number;
}) {
  if (column.key !== "team") return undefined;
  const current = sectionRows.at(sectionRowIndex);
  if (current === undefined) return undefined;
  if (sectionRows[sectionRowIndex - 1]?.team === current.team) return undefined;
  let rowSpan = 1;
  while (sectionRows[sectionRowIndex + rowSpan]?.team === current.team) {
    rowSpan += 1;
  }
  return rowSpan > 1 ? { rowSpan } : undefined;
}

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const rows = shallowRef<readonly Person[]>(orderPeopleByTeam(PEOPLE));
let nextId = Math.max(...PEOPLE.map((row) => Number(row.id)));
const features = [
  kit.rowPinning(),
  kit.cellSpan(teamSpan),
  kit.rowActions<Person>([], {
    onAddRow: () => {
      const first = PEOPLE[0];
      if (!first) return;
      rows.value = [
        { ...first, id: String(++nextId), name: "New person" },
        ...rows.value,
      ];
    },
    onDuplicateRow: (row) => {
      rows.value = [{ ...row, id: String(++nextId) }, ...rows.value];
    },
    onDeleteRow: (row) => {
      rows.value = rows.value.filter((current) => current.id !== row.id);
    },
  }),
];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint">Open a row's ⋯ menu to pin it</span>
      <span class="hint">A team that runs down the page is one cell</span>
    </div>
    <div class="mx-demo__body mx-scroll">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="People"
        url-key="rows"
        row-actions-layout="menu"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :defaults="{ limit: 30 }"
        :features="features"
      />
    </div>
  </div>
</template>
