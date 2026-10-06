import { h } from "vue";

import { DataTable } from "../src";

export interface FixtureRow {
  id: string;
  name: string;
  score: number;
}
export const fixtureRows: FixtureRow[] = [
  { id: "a", name: "Ada", score: 1 },
  { id: "b", name: "Bea", score: 2 },
];

/** One fixture is rendered by the genuine Node build and hydrated by the client. */
export function tableFixture(
  mobile = false,
  suffix = "",
  selectedIds: readonly string[] = []
) {
  return h(DataTable<FixtureRow>, {
    data: fixtureRows.map((row) => ({ ...row, name: `${row.name}${suffix}` })),
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "score", header: "Score" },
    ],
    rowKey: (row: FixtureRow) => row.id,
    tableLabel: "People",
    dir: "rtl",
    forceMobile: mobile,
    urlSync: false,
    searchDebounceMs: 0,
    selectable: true,
    selectedIds,
    defaults: { limit: 1 },
    paginationMode: "paged",
  });
}
