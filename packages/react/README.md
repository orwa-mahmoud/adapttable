# @adapttable/react

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)**

Headless React binding for [AdaptTable](https://github.com/orwa-mahmoud/adapttable).
Hooks, structural Chrome and React `ColumnDef` types live here. The
framework-neutral engine — models, sort, filter, page, revisions — lives in
`@adapttable/core`. Visible controls belong to the kit you pick.

```bash
pnpm add @adapttable/react @adapttable/core
```

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.
Requires React and React DOM 18 or 19.

## Usage

```tsx
import { useDataTable, useFrontendData } from "@adapttable/react";
import type { ColumnDef } from "@adapttable/react";

interface Person {
  id: string;
  name: string;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
];

function HeadlessTable({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns, getRowId: (row) => row.id });
  const table = useDataTable({ columns, source, rowKey: (row) => row.id });
  // Add your header and row markup using the prop-getters.
  return <table {...table.getTableProps()} />;
}
```

Kit users keep importing `DataTable` from `@adapttable/mui` (or another
published adapter). This package is the binding those kits sit on, and the
import for a host that wires Chrome itself.

## API

- `useDataTable` — prop-getters and headless table state
- `useFrontendData` / `useServerData` / `useQuerySource` — sources
- `useTableEngine` — subscribe to a `TableEngine` from `@adapttable/core`
- `ColumnDef` — React column (extends core `ColumnModel`)
- Chrome components and feature providers — `@adapttable/react/adapter`,
  `@adapttable/react/features`

See [Upgrading from v2](https://orwa-mahmoud.github.io/adapttable/migrate-from-v2/)
for the core → react import map.
