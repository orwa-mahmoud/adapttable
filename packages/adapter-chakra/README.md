# @adapttable/chakra

[![@adapttable/chakra — a Chakra UI data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/demo-chakra.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-chakra.mp4)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/chakra)**

The **Chakra UI adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included Chakra data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, and dark mode. Built on the headless
`@adapttable/core` engine. (Targets Chakra UI **v3**.)

```bash
pnpm add @adapttable/chakra @adapttable/core @chakra-ui/react @emotion/react react react-dom
```

## Quickstart

```tsx
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { DataTable, useFrontendData, type ColumnDef } from "@adapttable/chakra";

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

export function People({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns });
  return (
    <ChakraProvider value={defaultSystem}>
      <DataTable source={source} columns={columns} rowKey={(r) => r.id} />
    </ChakraProvider>
  );
}
```

Dark mode follows Chakra's color mode; pass `colorScheme` to tint accents.
Swap `useFrontendData` for `useBackendData` to drive the same table from a
server-paginated query.

## Features

Sortable headers, `Checkbox` selection + bulk actions with confirm, `Tag`
filter chips, `Drawer` filters, prev/next pagination, `Skeleton`/`Alert`
states, auto desktop table ↔ mobile cards, RTL (`dir`), `slots`, `size`,
and an injectable `confirm`.

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © Orwa Mahmoud
