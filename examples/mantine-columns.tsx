import "@mantine/core/styles.css";

import { DataTable } from "@adapttable/mantine";
import { columnMenu } from "@adapttable/mantine/column-menu";
import { resizableColumns } from "@adapttable/mantine/resizable-columns";
import { MantineProvider } from "@mantine/core";

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  status: string;
  budget: number;
}

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "Engineer",
    team: "Core",
    status: "Active",
    budget: 25_300,
  },
  {
    id: "2",
    name: "Alan Turing",
    email: "alan@example.com",
    role: "Founder",
    team: "Platform",
    status: "Blocked",
    budget: 32_600,
  },
  {
    id: "3",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "Admiral",
    team: "Data",
    status: "Archived",
    budget: 39_900,
  },
];

/**
 * Full column management: the built-in "Columns" menu (show/hide, drag- or
 * keyboard-reorder with a live drop indicator, pin), drag/keyboard column
 * resizing, and an initial layout that pins "Name" to the left. `maxHeight`
 * turns on the scroll box so pinned columns actually stick while the table
 * scrolls sideways. Columns are bare keys — an `accessor` only appears
 * where a cell needs real formatting (money), with `sortValue` keeping the
 * sort numeric.
 */
export function MantineColumnsExample() {
  return (
    <MantineProvider>
      <DataTable
        data={PEOPLE}
        columns={[
          { key: "name", sortable: true },
          { key: "email" },
          { key: "role", sortable: true },
          { key: "team" },
          { key: "status" },
          {
            key: "budget",
            accessor: (r) => `$${r.budget.toLocaleString()}`,
            sortValue: (r) => r.budget,
            sortable: true,
          },
        ]}
        rowKey={(r) => r.id}
        features={[columnMenu(), resizableColumns()]}
        maxHeight={420}
        defaultColumnLayout={{
          pinned: { name: "start" },
          widths: { name: 220 },
        }}
      />
    </MantineProvider>
  );
}
