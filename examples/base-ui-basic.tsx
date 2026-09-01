import {
  type ColumnDef,
  DataTable,
  useFrontendData,
} from "@adapttable/base-ui";
import { rowActions } from "@adapttable/base-ui/row-actions";

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com", role: "Engineer" },
  { id: "2", name: "Alan Turing", email: "alan@example.com", role: "Founder" },
  {
    id: "3",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "Admiral",
  },
];

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "email", header: "Email", accessor: (r) => r.email },
  { key: "role", header: "Role", accessor: (r) => r.role, sortable: true },
];

/**
 * Base UI table: no provider and no stylesheet import — the adapter injects
 * its own chrome CSS and renders Base UI's `Popover`, `Dialog`, `Select` and
 * `Checkbox` for the overlays, so focus, portalling and z-index come from the
 * kit. Search, sorting, pagination and URL-synced state come built in. Swap
 * `useFrontendData` for `useQuerySource` to drive the same table from a
 * server-paginated query.
 */
export function BaseUiBasicExample() {
  const source = useFrontendData<Person>({ data: PEOPLE, columns });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      features={[
        rowActions<Person>([
          {
            key: "edit",
            label: "Edit",
            onClick: (row) => alert(`Edit ${row.name}`),
          },
        ]),
      ]}
      searchPlaceholder="Search people…"
    />
  );
}
