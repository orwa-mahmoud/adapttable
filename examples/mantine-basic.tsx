import "@mantine/core/styles.css";

import { DataTable } from "@adapttable/mantine";
import { rowActions } from "@adapttable/mantine/row-actions";
import { MantineProvider } from "@mantine/core";

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

/**
 * The zero-ceremony table: pass `data` and declare columns by key — headers
 * auto-derive ("name" → "Name"), cells read the key directly, and search,
 * sorting, pagination and URL-synced state are all built in.
 */
export function MantineBasicExample() {
  return (
    <MantineProvider>
      <DataTable
        data={PEOPLE}
        columns={[
          { key: "name", sortable: true },
          { key: "email" },
          { key: "role", sortable: true },
        ]}
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
    </MantineProvider>
  );
}
