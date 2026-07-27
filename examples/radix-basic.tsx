import "@radix-ui/themes/styles.css";

import { type ColumnDef, DataTable, useFrontendData } from "@adapttable/radix";
import { Theme } from "@radix-ui/themes";

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
 * Radix Themes table: appearance — light/dark, accent color, radius — is
 * inherited from the surrounding `<Theme>`; pass `accentColor` to tint the
 * table's own accents. Search, sorting, pagination and URL-synced state come
 * built in. Swap `useFrontendData` for `useQuerySource` to drive the same
 * table from a server-paginated query.
 */
export function RadixBasicExample() {
  const source = useFrontendData<Person>({ data: PEOPLE, columns });
  return (
    <Theme accentColor="iris">
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search people…"
        rowActions={[
          {
            key: "edit",
            label: "Edit",
            onClick: (row) => alert(`Edit ${row.name}`),
          },
        ]}
      />
    </Theme>
  );
}
