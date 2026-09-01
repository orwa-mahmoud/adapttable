/**
 * Configured preset inference, including row-shaped filter input.
 *
 * The table supplies TRow; no annotation belongs on `standardFeatures`.
 */
import { type ColumnDef, DataTable } from "@adapttable/mui";
import { standardFeatures } from "@adapttable/mui/preset";

interface Person {
  id: string;
  name: string;
  team: string;
}

const rows: Person[] = [{ id: "1", name: "Ada", team: "Core" }];
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
];

export const presetConfigured = (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    features={standardFeatures({
      grouping: "team",
      filters: [
        {
          key: "name",
          type: "text",
          label: "Name",
          getValue: (row: Person) => row.name,
        },
      ],
    })}
  />
);
