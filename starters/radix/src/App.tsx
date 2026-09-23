import { useState } from "react";

import { type ColumnDef, DataTable } from "@adapttable/radix";
import { cellNavigation } from "@adapttable/radix/cell-navigation";
import { columnMenu } from "@adapttable/radix/column-menu";
import { editHistory, editing } from "@adapttable/radix/editing";
import { exportCsv } from "@adapttable/radix/export";
import { filters } from "@adapttable/radix/filters";
import { groupingPanel } from "@adapttable/radix/grouping-panel";
import { multiSort } from "@adapttable/radix/multi-sort";
import { resizableColumns } from "@adapttable/radix/resizable-columns";

import { type Person, people } from "./data";

// Declare columns by key: headers auto-derive, cells read the key, and each
// `filter` becomes a native kit widget with a removable chip and URL state.
const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true, filter: "text", editable: true },
  { key: "role", sortable: true, filter: { type: "select", options: "auto" } },
  {
    key: "status",
    sortable: true,
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

// Per-group subtotals — the same mapper signature as `summaryRow`.
const groupAggregates = (groupRows: readonly Person[]) => ({
  salary: `$${groupRows
    .reduce((sum, r) => sum + r.salary, 0)
    .toLocaleString()}`,
});

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
        // Arms every column `filter` above: the Filters control, chips and URL.
        filters([]),
        // Drag a header onto the panel to group; starts grouped by role.
        groupingPanel<Person>("role", { groupAggregates }),
        // Column menu (show/hide, pin, reorder) + drag/keyboard resizing.
        columnMenu(),
        resizableColumns(),
        // Shift-click a second header to sort by more than one column.
        multiSort(),
        // Arrow keys move between cells; Shift+arrows select a range to copy.
        cellNavigation(),
        // Undo / redo for edits (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z).
        editHistory(),
        // The table never mutates rows — this handler applies each edit.
        editing((row: Person, key, nextValue) =>
          setRows((current) =>
            current.map((r) =>
              r.id === row.id ? { ...r, [key]: nextValue } : r
            )
          )
        ),
        // One toolbar button: exports every row that matches the view.
        exportCsv({ filename: "people.csv", scope: "all" }),
      ]}
    />
  );
}
