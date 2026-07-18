# @adapttable/antd

[![@adapttable/antd — an Ant Design data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/demo-antd.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-antd.mp4)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/antd)**

The **Ant Design adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included antd data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, and dark mode. It drives antd's
high-level `<Table>` from the headless `@adapttable/core` engine, so you get
the antd look-and-feel wired to a shareable, server-or-client data source.

```bash
pnpm add @adapttable/antd @adapttable/core antd react react-dom
```

## Quickstart

```tsx
import { DataTable, useFrontendData, type ColumnDef } from "@adapttable/antd";

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

Wrap your app in antd's `ConfigProvider` to control the theme (including
`theme.darkAlgorithm`) and `direction="rtl"`, as usual. Swap `useFrontendData`
for `useBackendData` to drive the table from a server-paginated query — the
component doesn't change.

## Features

- Client or server data through one `TableSource`.
- URL-synced search / sort / filters / page — shareable, deep-linkable.
- Native antd `<Table>` header sort carets, row `Checkbox` selection (with
  indeterminate select-all) + bulk actions with confirm.
- Filter `Drawer` + removable `Tag` chips.
- antd `Pagination` (with page-size changer) in paged mode; **infinite
  scroll** (IntersectionObserver auto-load + a "Load more" fallback) in
  infinite mode.
- **Responsive:** a horizontally-scrollable `<Table>` on desktop, and an
  antd `Card` + `Descriptions` layout on mobile (auto by viewport).
- antd `Skeleton` loading (honouring `skeletonRows`), `Alert` error with
  retry, and an `Empty` state.
- Logical (RTL-aware) column alignment, column `width`, custom `Cell`
  renderers, and conditional row actions (`isHidden` / `isDisabled`).
- `slots` (skeleton, empty), `className`, `size`, `bordered`, injectable
  `confirm`.

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © Orwa Mahmoud
