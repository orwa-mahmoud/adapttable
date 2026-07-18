# @adapttable/base-ui

[![@adapttable/base-ui — a Base UI data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/demo-base-ui.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-base-ui.mp4)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/base-ui)**

The **Base UI adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included Base UI data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, and dark mode. Built on the headless
`@adapttable/core` engine. (Targets [`@base-ui/react`](https://base-ui.com/) **^1.6**.)

```bash
pnpm add @adapttable/base-ui @adapttable/core @base-ui/react react react-dom
```

Import the adapter styles once in your app entry (or rely on the side-effect import from `@adapttable/base-ui`):

```ts
import "@adapttable/base-ui/styles.css";
```

## Quickstart

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

Behavior lives in `@adapttable/core`; this package only renders Base UI primitives
(Popover, Drawer, Select, Checkbox, Tooltip, Button, Input) plus minimal chrome CSS.

## Links

- [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)
- [Documentation](https://orwa-mahmoud.github.io/adapttable/)
- [StackBlitz starter](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/base-ui)
