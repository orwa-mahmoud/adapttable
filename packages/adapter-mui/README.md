# @adapttable/mui

[![@adapttable/mui — a Material UI data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/demo-mui.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-mui.mp4)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mui)**

_Migrating from MUI X DataGrid? See the [migration guide](https://orwa-mahmoud.github.io/adapttable/migrate-from-mui-x-datagrid/)._

The **Material UI adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included MUI data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, and dark mode. A free, headless
**alternative to MUI X DataGrid** built on `@adapttable/core`.

```bash
pnpm add @adapttable/mui @adapttable/core @mui/material @emotion/react @emotion/styled react react-dom
```

## Quickstart

```tsx
import { DataTable, useFrontendData, type ColumnDef } from "@adapttable/mui";

interface Person {
  id: string;
  name: string;
  city: string;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

export function People({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}
```

Wrap your app in MUI's `ThemeProvider` to control light/dark mode and RTL,
as usual. Swap `useFrontendData` for `useBackendData` to drive the table
from a server-paginated query — the component doesn't change.

## Features

- Client or server data through one `TableSource`.
- URL-synced search / sort / filters / page.
- `TableSortLabel` headers, `Checkbox` selection + bulk actions with confirm.
- Filter drawer + removable `Chip`s.
- `Pagination` footer, `Skeleton` loading, `Alert` error with retry.
- Auto desktop table ↔ mobile cards.
- `slots` (skeleton, empty), `className`, `size`, injectable `confirm`.

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © Orwa Mahmoud
