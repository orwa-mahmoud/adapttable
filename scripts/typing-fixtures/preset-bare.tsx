/**
 * The junior-facing preset expression, exactly as a consumer writes it.
 *
 * This must compile without a type argument, cast or ignore directive.
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

export const presetBare = (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    features={standardFeatures()}
  />
);
