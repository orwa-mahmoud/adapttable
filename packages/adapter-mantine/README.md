# @adapttable/mantine

[![@adapttable/mantine — a Mantine data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/demo-mantine.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-mantine.mp4)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)**

_Migrating from mantine-datatable? See the [migration guide](https://orwa-mahmoud.github.io/adapttable/migrate-from-mantine-datatable/)._

The **Mantine adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included React data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, dark mode, and optional entrance
animation. Built on the headless `@adapttable/core` engine.

```bash
pnpm add @adapttable/mantine @adapttable/core @mantine/core @mantine/hooks react react-dom
```

## Quickstart

```tsx
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import {
  DataTable,
  useFrontendData,
  type ColumnDef,
} from "@adapttable/mantine";

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
  return (
    <MantineProvider>
      <DataTable source={source} columns={columns} rowKey={(r) => r.id} />
    </MantineProvider>
  );
}
```

Swap `useFrontendData` for `useBackendData` to drive the same table from a
server-paginated `useInfiniteQuery` — nothing else changes.

## Features

- **Client or server data** through one `TableSource` contract.
- **URL-synced** search / sort / filters / page (shareable links).
- **Sorting** with accessible header controls.
- **Filter drawer + removable chips** (`filters` + `filterLabels`).
- **Selection + bulk actions** with confirm dialogs (`bulkActions`).
- **Row actions** with optional confirm.
- **Auto desktop table ↔ mobile cards** by viewport (or force `isMobile`).
- **RTL** via the `dir` prop; **dark mode** via Mantine's color scheme.
- **Optional entrance animation** (`animate`) — dependency-free, honors
  `prefers-reduced-motion`.
- **Customisation**: `slots`, `classNames`, custom `toolbar`, injectable
  `confirm`, and full headless escape hatch via `@adapttable/core`.

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © Orwa Mahmoud
