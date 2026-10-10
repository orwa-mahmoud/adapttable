import { h } from "vue";

import { DataTable } from "../src";
import { cellSpan } from "../src/cell-span";
import { collapsibleColumnGroups } from "../src/column-groups";
import { extraRows } from "../src/extra-rows";
import { fitColumns } from "../src/fit-columns";
import { multiSort } from "../src/multi-sort";
import { pinnedSummaryRows } from "../src/pinned-summary-rows";
import { resizableColumns } from "../src/resizable-columns";
import { rowActions } from "../src/row-actions";
import { rowAppearance } from "../src/row-appearance";
import { nestedTable, rowDetail } from "../src/row-detail";
import { rowPinning } from "../src/row-pinning";
import { tree } from "../src/tree";
import { virtualize } from "../src/virtualize";

export interface HierarchyRow {
  id: string;
  name: string;
  score: number;
  children?: readonly HierarchyRow[];
}
export const hierarchyRows: readonly HierarchyRow[] = [
  {
    id: "a",
    name: "Ada",
    score: 1,
    children: [{ id: "child", name: "Child", score: 3 }],
  },
  { id: "b", name: "Bea", score: 2 },
];

export const hierarchyColumns = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];

/** Genuine server and browser builds share the same host-owned data. */
export function rowHierarchyFixture(mobile: boolean) {
  const common = {
    data: hierarchyRows,
    columns: hierarchyColumns,
    rowKey: (row: HierarchyRow) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: mobile,
    dir: "rtl" as const,
  };
  return h("div", [
    h(DataTable<HierarchyRow>, {
      ...common,
      features: [
        tree<HierarchyRow>({
          getChildren: (row) => row.children,
          defaultExpandedIds: ["a"],
        }),
        nestedTable<HierarchyRow>(
          (row) => ({
            label: `${row.name} details`,
            table: (defaults) =>
              h(DataTable<HierarchyRow>, {
                ...defaults,
                data: row.children ?? [],
                columns: hierarchyColumns,
                rowKey: (child) => child.id,
                urlSync: false,
                forceMobile: mobile,
                searchable: false,
              }),
          }),
          ["a"]
        ),
      ],
    }),
    h(DataTable<HierarchyRow>, {
      ...common,
      features: [
        rowDetail((row: HierarchyRow) => h("p", `Detail: ${row.name}`), ["b"]),
        rowActions<HierarchyRow>([
          { key: "open", label: "Open", onClick: () => undefined },
        ]),
        rowPinning({ pinnedRowIds: { top: ["b"], bottom: [] } }),
        pinnedSummaryRows<HierarchyRow>({
          bottom: [{ id: "total", name: "Total", score: 3 }],
        }),
        extraRows([
          {
            key: "note",
            kind: "fullWidth",
            beforeRowId: "a",
            render: () => h("p", "Host note"),
          },
        ]),
        cellSpan<HierarchyRow>(({ row, column }) =>
          row.id === "a" && column.key === "name" ? { colSpan: 2 } : undefined
        ),
        rowAppearance<HierarchyRow>({
          rowClassName: (row) => `host-row-${row.id}`,
          rowHeight: 48,
        }),
        fitColumns(),
        resizableColumns(),
        collapsibleColumnGroups(),
        multiSort(),
        virtualize({ maxHeight: 300 }),
      ],
    }),
  ]);
}
