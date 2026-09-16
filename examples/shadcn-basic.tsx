import { type ColumnDef, DataTable, useFrontendData } from "@adapttable/shadcn";
import { rowActions } from "@adapttable/shadcn/row-actions";

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
 * shadcn/ui table: the unstyled engine pre-wired with shadcn's design tokens
 * (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, …), so
 * it inherits your app's shadcn theme. No provider needed — just have
 * shadcn/ui + Tailwind configured, and let Tailwind scan this package (add it
 * as a `@source` in your Tailwind v4 CSS) so its utility classes compile.
 */
export function ShadcnBasicExample() {
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
