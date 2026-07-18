# Get started with AdaptTable — React table for your UI kit

<video src="https://orwa-mahmoud.github.io/adapttable/media/demo-core.mp4" poster="https://orwa-mahmoud.github.io/adapttable/media/demo-core-poster.png?v=2" controls playsinline preload="none" style="width:100%;border-radius:8px"></video>

AdaptTable is a headless, UI-agnostic React data table. Pick the adapter for
your design system and you get a styled, sortable, filterable, paginated
table with URL-synced state, selection + bulk actions, RTL, and dark mode.

## Install

The fastest path is the CLI — it detects your UI kit from `package.json`,
prints the install command, and scaffolds a starter `src/PeopleTable.tsx`:

```bash
npx @adapttable/cli init
```

Prefer zero install first? Open a live starter in
[StackBlitz (Mantine)](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)
— or [any other kit](#try-it-in-stackblitz).

Or install manually: `@adapttable/core`, the adapter for your kit, and the
kit's own packages (peer dependencies — skip what you already have).
`react` / `react-dom` 18 or 19 are peers everywhere.

```bash
# Mantine
pnpm add @adapttable/core @adapttable/mantine @mantine/core @mantine/hooks

# Material UI
pnpm add @adapttable/core @adapttable/mui @mui/material

# Chakra UI (v3)
pnpm add @adapttable/core @adapttable/chakra @chakra-ui/react @emotion/react

# Ant Design
pnpm add @adapttable/core @adapttable/antd antd

# Radix Themes
pnpm add @adapttable/core @adapttable/radix @radix-ui/themes

# Base UI
pnpm add @adapttable/core @adapttable/base-ui @base-ui/react

# shadcn/ui — one import, pre-wired with the shadcn class preset
pnpm add @adapttable/core @adapttable/shadcn

# Tailwind / unstyled — bring your own classes
pnpm add @adapttable/core @adapttable/unstyled
```

## Provider setup

Each adapter renders with its UI kit's own components, so your app needs that
kit's provider once at the root — exactly as the kit's docs describe.

**Mantine**

```tsx
// main.tsx — once per app, straight from Mantine's own setup guide.
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";

<MantineProvider>
  <App />
</MantineProvider>;
```

**Material UI** — works with the default theme out of the box; wrap in
`ThemeProvider` to customize:

```tsx
import { createTheme, ThemeProvider } from "@mui/material";

<ThemeProvider theme={createTheme()}>
  <App />
</ThemeProvider>;
```

**Chakra UI** (v3) — the provider takes a system; use the built-in
`defaultSystem` or your own:

```tsx
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

<ChakraProvider value={defaultSystem}>
  <App />
</ChakraProvider>;
```

**Ant Design** — works without a provider; add `ConfigProvider` for theme or
locale:

```tsx
import { ConfigProvider } from "antd";

<ConfigProvider>
  <App />
</ConfigProvider>;
```

**Radix Themes** — import the Themes stylesheet and wrap in `<Theme>` (see
Radix Themes docs).

**Base UI** — no provider. Import `@adapttable/base-ui` (it side-effect-loads
minimal chrome CSS) or `@adapttable/base-ui/styles.css` once at the app entry.

**shadcn/ui** — no provider. `@adapttable/shadcn` is the unstyled adapter
pre-wired with the shadcn class preset, so it inherits your app's existing
shadcn/ui theme (its CSS variables + Tailwind config) automatically.

**Unstyled** — no provider. It renders semantic HTML with `data-*` and
`className` hooks for your own CSS or Tailwind.

## Your first table

Pass `data` and declare columns — that's the whole thing:

```tsx
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/base-ui", "@adapttable/shadcn",
// "@adapttable/unstyled" — same props everywhere.
import { DataTable } from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
  role: string;
  status: string;
  hiredAt: string;
}

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Ada Lovelace",
    role: "Engineer",
    status: "active",
    hiredAt: "2021-03-01",
  },
  {
    id: "2",
    name: "Alan Turing",
    role: "Founder",
    status: "active",
    hiredAt: "2019-06-15",
  },
  {
    id: "3",
    name: "Grace Hopper",
    role: "Admiral",
    status: "retired",
    hiredAt: "2018-01-20",
  },
];

export function PeopleTable() {
  return (
    <DataTable
      data={PEOPLE}
      columns={[
        { key: "name", sortable: true },
        { key: "role" },
        { key: "status", filter: { type: "select", options: "auto" } },
        { key: "hiredAt", filter: "dateRange" },
      ]}
      rowKey={(r) => r.id}
    />
  );
}
```

What you just got without writing any of it: search, sorting, pagination
(paged on desktop, infinite scroll on mobile), URL-synced state (reload-safe,
shareable links), empty/loading states, a mobile card layout, and a filter
form built from those `filter` declarations with kit-native widgets — each
filter also drives its own removable chip, URL parsing, and row predicate.

- Headers auto-derive from keys (`hiredAt` → "Hired At"); pass `header` to
  control the text in any language.
- Dot-path keys reach nested values: `{ key: "department.name" }`.
- Filters that aren't columns go in a table-level array:

```tsx
<DataTable
  data={PEOPLE}
  columns={columns}
  filters={[
    { key: "companyId", type: "select", label: "Company", options: companies },
    { key: "budget", type: "numberRange" },
  ]}
  rowKey={(r) => r.id}
/>
```

## Try it in StackBlitz

Prefer to try before installing? Each starter is a minimal Vite app — one table
on a demo dataset — that boots in the browser with no local setup. Pick your
kit:

- [Mantine](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)
- [Material UI](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mui)
- [Chakra UI](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/chakra)
- [Ant Design](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/antd)
- [Radix Themes](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/radix)
- [Base UI](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/base-ui)
- [shadcn/ui](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/shadcn)
- [Unstyled / Tailwind](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/unstyled)

The source for each lives in
[`starters/`](https://github.com/orwa-mahmoud/adapttable/tree/main/starters).

## Where next

- [Columns](./columns.md) — headers, custom cells, the Columns menu
  (show/hide, reorder, pin), resizing.
- [Filtering](./filtering.md) — every filter type, options sources, chips,
  popover vs drawer.
- [Data tiers](./data-tiers.md) — server data without a query library
  (`onQueryChange`), or full control via `source` and TanStack Query.
- [Demo](https://orwa-mahmoud.github.io/adapttable/demo/) — every adapter,
  live.

Full surface: [API reference](./api.md) ·
[core concepts](./concepts.md).
