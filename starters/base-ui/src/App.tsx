import { type ColumnDef, DataTable } from "@adapttable/base-ui";

import { type Person, people } from "./data";

// Declare columns by key: headers auto-derive, cells read the key, and each
// `filter` becomes a native kit widget with a removable chip and URL state.
const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true, filter: "text" },
  { key: "role", filter: { type: "select", options: "auto" } },
  { key: "status", filter: { type: "select", options: "auto" } },
  {
    key: "salary",
    header: "Salary (USD)",
    align: "end",
    sortable: true,
    accessor: (r) => r.salary.toLocaleString(),
    sortValue: (r) => r.salary,
    filter: "numberRange",
  },
  { key: "hiredAt", header: "Hired", sortable: true, filter: "dateRange" },
];

export function App() {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(r) => r.id}
      searchPlaceholder="Search people…"
    />
  );
}
