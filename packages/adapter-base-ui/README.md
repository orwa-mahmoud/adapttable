# `@adapttable/base-ui`

Base UI adapter for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) — a batteries-included data table on [`@base-ui/react`](https://base-ui.com/) with sorting, filtering, URL state, selection, RTL, and dark mode.

## Install

```bash
pnpm add @adapttable/core @adapttable/base-ui @base-ui/react
```

Import the adapter styles once in your app entry (or rely on the side-effect import from `@adapttable/base-ui`):

```ts
import "@adapttable/base-ui/styles.css";
```

## Quick start

```tsx
import {
  DataTable,
  useFrontendData,
  type ColumnDef,
} from "@adapttable/base-ui";

interface Person {
  id: string;
  name: string;
  email: string;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "email", header: "Email", accessor: (r) => r.email },
];

export function PeopleTable({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}
```

Behavior lives in `@adapttable/core`; this package only renders Base UI primitives (Popover, Drawer, Select, Checkbox, Tooltip, Button, Input) plus minimal chrome CSS.
