# @adapttable/shadcn

[![@adapttable/shadcn — a shadcn/ui data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/demo-shadcn.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-shadcn.mp4)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/shadcn)**

The **shadcn/ui adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a fully-styled React data table in **one import**, with sorting, filtering,
URL-synced state, selection + bulk actions, column management, RTL, and dark
mode. It's a thin wrapper over `@adapttable/unstyled` that applies the shadcn
class preset for you, built on the headless `@adapttable/core` engine.

```bash
pnpm add @adapttable/shadcn @adapttable/core react react-dom
```

> Requires shadcn/ui set up in your app (its CSS variables + Tailwind config) —
> this adapter only references shadcn's design tokens (`bg-card`,
> `text-muted-foreground`, `border-border`, `bg-primary`, …).
>
> The preset ships utility classes in this package, so let Tailwind scan it or
> they won't compile. In Tailwind v4, add it as a source in your CSS:
>
> ```css
> @source "../node_modules/@adapttable/shadcn/dist/**/*.js";
> ```

## Quickstart

```tsx
import { DataTable, useFrontendData, type ColumnDef } from "@adapttable/shadcn";

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
  const source = useFrontendData<Person>({ data, columns });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}
```

That's it — a styled shadcn table, no class wiring. Swap `useFrontendData` for
`useBackendData` to drive it from a server-paginated query; the component doesn't
change.

## Customizing

Restyle any part by passing your own `classNames` — they're merged **over** the
preset, per part, so you only override what you name:

```tsx
<DataTable
  source={source}
  columns={columns}
  rowKey={(r) => r.id}
  classNames={{ root: "rounded-2xl border-2 border-primary" }} // only the root changes
/>
```

Need the raw class map (e.g. to spread into your own `@adapttable/unstyled`
table)? It's exported:

```tsx
import { shadcnClassNames } from "@adapttable/shadcn";
```

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](./LICENSE) © Orwa Mahmoud

---

<div align="center">
<sub>Keywords: shadcn table, shadcn/ui data table, react data table, tailwind table, headless table, server-side pagination, url state, rtl table, typescript, dark mode.</sub>
</div>
