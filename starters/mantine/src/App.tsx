import { useState } from "react";

import { type ColumnDef, DataTable } from "@adapttable/mantine";
import { columnMenu } from "@adapttable/mantine/column-menu";
import { editing } from "@adapttable/mantine/editing";
import { exportCsv } from "@adapttable/mantine/export";
import { grouping } from "@adapttable/mantine/grouping";
import { resizableColumns } from "@adapttable/mantine/resizable-columns";

import { type Person, people } from "./data";

// Declare columns by key: headers auto-derive, cells read the key, and each
// `filter` becomes a native kit widget with a removable chip and URL state.
const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true, filter: "text", editable: true },
  { key: "role", filter: { type: "select", options: "auto" } },
  {
    key: "status",
    filter: { type: "select", options: "auto" },
    // Inline editing: double-click (or Enter/F2) opens the kit's own input.
    editable: true,
    editor: {
      type: "select",
      options: ["active", "on-leave", "retired"],
    },
  },
  {
    key: "salary",
    header: "Salary (USD)",
    align: "end",
    sortable: true,
    accessor: (r) => r.salary.toLocaleString(),
    sortValue: (r) => r.salary,
    filter: "numberRange",
    editable: true,
    editor: "number",
  },
  { key: "hiredAt", header: "Hired", sortable: true, filter: "dateRange" },
];

export function App() {
  const [rows, setRows] = useState(people);
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      searchPlaceholder="Search people…"
      // Each import is the switch: a feature the table never names is a
      // feature it never downloads.
      features={[
        // Column menu (show/hide, pin, reorder) + drag/keyboard resizing.
        columnMenu(),
        resizableColumns(),
        // Group rows by one column, with per-group subtotals — the same
        // mapper signature as `summaryRow`.
        grouping("role", {
          groupAggregates: (groupRows: readonly Person[]) => ({
            salary: `$${groupRows
              .reduce((sum, r) => sum + r.salary, 0)
              .toLocaleString()}`,
          }),
        }),
        // One toolbar button: exports exactly what the table shows.
        exportCsv({ filename: "people.csv", scope: "all" }),
        // The table never mutates rows — this handler applies each edit.
        editing((row: Person, key, nextValue) =>
          setRows((current) =>
            current.map((r) =>
              r.id === row.id ? { ...r, [key]: nextValue } : r
            )
          )
        ),
      ]}
    />
  );
}
