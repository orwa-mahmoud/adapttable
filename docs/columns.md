# React table columns — ColumnDef, sort, pin, custom cells

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Columns are plain objects — declare a `key` and the table renders the value, derives the header, and wires sorting and filtering around it. Everything beyond the key is an opt-in refinement.

## Example

```tsx
import { type CellProps, type ColumnDef, DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, shadcn, unstyled
import { Badge } from "@mantine/core";

interface Person {
  id: string;
  name: string;
  nameAr: string;
  department: { name: string };
  salary: number;
  status: "active" | "on-leave";
  hiredAt: string;
}

const people: Person[] = [
  {
    id: "1",
    name: "Amira Hassan",
    nameAr: "أميرة حسن",
    department: { name: "Engineering" },
    salary: 96000,
    status: "active",
    hiredAt: "2021-03-15",
  },
  {
    id: "2",
    name: "Tom Becker",
    nameAr: "توم بيكر",
    department: { name: "Design" },
    salary: 78000,
    status: "on-leave",
    hiredAt: "2022-11-01",
  },
  {
    id: "3",
    name: "Lina Park",
    nameAr: "لينا بارك",
    department: { name: "Engineering" },
    salary: 105000,
    status: "active",
    hiredAt: "2019-07-20",
  },
];

// Define Cell components at module level so their identity is stable.
function StatusCell({ row }: CellProps<Person>) {
  return (
    <Badge color={row.status === "active" ? "green" : "yellow"}>
      {row.status}
    </Badge>
  );
}

const columns: ColumnDef<Person>[] = [
  // Bare key: auto header "Name"; i18n swaps the data path when locale="ar".
  { key: "name", i18n: { ar: "nameAr" }, sortable: true },
  // Dot path reaches nested values; auto header "Department Name".
  { key: "department.name", header: "Department" },
  // accessor formats; sortValue keeps the column sortable by the raw number.
  {
    key: "salary",
    header: "Salary (USD)",
    accessor: (r) => r.salary.toLocaleString(),
    sortValue: (r) => r.salary,
    sortable: true,
    align: "end",
    width: 140,
  },
  // Cell: a full React component receiving { row, rowIndex }.
  { key: "status", Cell: StatusCell, mobileLabel: "Status" },
  { key: "hiredAt", hideOnMobile: true, meta: { exportFormat: "date" } },
];

export function People() {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(r) => r.id}
      locale="en"
    />
  );
}
```

## How it works

- A bare `{ key }` is a complete column: the key doubles as the row's data path (dot paths reach nested values, `"department.name"`), and the header is auto-humanised (`hiredAt` → "Hired At"). An explicit `header` always wins, in any language.
- Cell content resolves `Cell` → `accessor` → the key's data path. `Cell` is a React component receiving `{ row, rowIndex }`; `accessor` is the lighter function form.
- `sortable` opts a column into sorting; on frontend data the comparator reads `sortValue`, falling back to the column's accessor. See [sorting](./sorting.md).
- `i18n` maps locale tags to alternative data paths; the table's `locale` prop picks one (exact tag → primary subtag → `key`). The cell, client-side sort, and the column's filter all follow the resolved path — header text does not.
- `hideOnMobile` / `hideOnDesktop` drop a column per layout; `mobileLabel` overrides the label on mobile cards.
- `key` is also the value sent to a backend as `sortBy`, so keep it API-stable.

## Options

| Prop            | Type                             | Default                      | Description                                                                |
| --------------- | -------------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `key`           | `string`                         | required                     | Unique id; data path for the cell value; the backend `sortBy` value.       |
| `header`        | `ReactNode`                      | humanised from `key`         | Header content, pre-translated by the caller.                              |
| `accessor`      | `(row) => ReactNode`             | read the key's data path     | Lightweight cell renderer.                                                 |
| `Cell`          | `ComponentType<CellProps<TRow>>` | —                            | Component per row, receives `{ row, rowIndex }`; wins over `accessor`.     |
| `sortable`      | `boolean`                        | `false`                      | Enable sorting for this column.                                            |
| `sortValue`     | `(row) => SortableValue`         | the generated accessor value | Primitive extractor for the client-side sort. See [sorting](./sorting.md). |
| `align`         | `"start" \| "center" \| "end"`   | `"start"`                    | Text alignment within the cell.                                            |
| `width`         | `number \| string`               | —                            | Width passed through to the rendered header/cell.                          |
| `mobileLabel`   | `string`                         | `header` (when a string)     | Label on mobile card layouts.                                              |
| `hideOnMobile`  | `boolean`                        | `false`                      | Hide the column entirely on mobile.                                        |
| `hideOnDesktop` | `boolean`                        | `false`                      | Hide the column entirely on desktop.                                       |
| `i18n`          | `Record<string, string>`         | —                            | Per-locale data paths for the column's value.                              |
| `meta`          | `Record<string, unknown>`        | —                            | Free-form bag your own code can read back.                                 |
| `locale`        | `string` (table prop)            | —                            | Active locale tag (`"ar"`, `"ar-EG"`); drives `i18n` path resolution.      |

## Notes

- Define `Cell` components at module level (or memoise them) — an inline component re-mounts every render and defeats row memoisation.
- Path-derived cells render primitives only; a non-primitive value at the path renders nothing. Use `accessor` or `Cell` for objects.
- A column whose `accessor` returns JSX needs `sortValue` to be sortable — without it the sort silently no-ops and a dev warning fires.
- `mobileLabel` only falls back to `header` when the header is a string; with a JSX header, set `mobileLabel` explicitly (it also names the column in the Columns menu).
- Duplicate column keys trigger a development warning — keys must be unique within the table.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
