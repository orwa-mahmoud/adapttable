# @adapttable/cli

[![AdaptTable — scaffold a table for any UI kit from one engine](https://adapttable.orwamahmoud.com/media/core/tour.gif)](https://adapttable.orwamahmoud.com/react/demo/)

**[📖 Documentation](https://adapttable.orwamahmoud.com/)** · **[🚀 Live demo](https://adapttable.orwamahmoud.com/react/demo/)** · **[Get started](https://adapttable.orwamahmoud.com/react/getting-started/)**

The scaffolding CLI for [AdaptTable](https://github.com/orwa-mahmoud/adapttable).
One command detects your UI kit, picks your package manager, writes a
starter table, and tells you exactly what to install.

```bash
npx @adapttable/cli init
```

```
AdaptTable — detected Mantine.

1. Install the packages:
   pnpm add @adapttable/core @adapttable/mantine @mantine/hooks

2. Scaffolded: src/PeopleTable.tsx

3. Render <PeopleTable /> and you're done.
```

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

## What it does

- **Detects your UI kit** from `package.json` — Mantine, MUI, Chakra, Ant
  Design, Radix Themes, Base UI, shadcn/ui (via `components.json`), or
  Tailwind — falling back to the unstyled adapter.
- **Detects your package manager** from the lockfile (pnpm / yarn / bun /
  npm) and **prints** the right install command — it never installs
  anything itself; you run the command it shows.
- **Scaffolds** `src/PeopleTable.tsx`, a sortable starter table wired to
  the matching adapter (every optional behavior is one feature import away — see
  the docs). Pass `--force` to overwrite an existing file.
- **One step it can't do for you:** wrap your app in the kit's provider
  (`MantineProvider`, MUI's `ThemeProvider`, `ChakraProvider`, antd's
  `ConfigProvider`, Radix's `Theme`) if it isn't already — that's the
  most common first-run failure.

## Migrate from v2

```bash
npx @adapttable/cli migrate-v3 src
npx @adapttable/cli migrate-v3 src --check
```

The command moves the 72 adapter-contract imports to
`@adapttable/react/adapter`. Changes that need a behavior choice are reported
with their source locations and left untouched. A second run is a no-op.

## Programmatic use

The building blocks are exported and pure (easy to test/automate):

```ts
import { detectKit, runInit } from "@adapttable/cli";

detectKit({ "@mui/material": "^6" }).kit; // "mui"
```

## Features

- **Detects your UI kit** from `package.json` — Mantine, MUI, Chakra, Ant Design, Radix,
  Base UI, shadcn/ui (via `components.json`) or Tailwind.
- **Prints the exact install command** for the matching adapter plus the peer
  packages it needs (run it yourself with your package manager).
- **Scaffolds a working table** wired to your kit, not a blank file: sortable out
  of the box, with the full AdaptTable feature set (filtering, selection, editing,
  grouping, saved views, CSV export, virtualization, …) each one import away.
- **Migrates v2 source safely** — `migrate-v3` moves adapter-contract imports
  to `@adapttable/react/adapter` and reports every behavior-dependent change
  for manual review.
- **Programmatic API** — call it from your own scripts, not only the terminal.

## See it work

What `npx @adapttable/cli init` scaffolds, running.

**Row grouping** — group rows by a column with per-group subtotals

![row-grouping](https://adapttable.orwamahmoud.com/media/core/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![cell-editing](https://adapttable.orwamahmoud.com/media/core/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![filtering](https://adapttable.orwamahmoud.com/media/core/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![column-management](https://adapttable.orwamahmoud.com/media/core/parts/column-management.gif)

**RTL** — the whole table mirrors, not just the text

![rtl](https://adapttable.orwamahmoud.com/media/core/parts/rtl.gif)

## Documentation

[Getting started](https://adapttable.orwamahmoud.com/react/getting-started/) · [Live demo](https://adapttable.orwamahmoud.com/react/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://adapttable.orwamahmoud.com/react/comparison/)

- **Data** — [client vs server tiers](https://adapttable.orwamahmoud.com/data-tiers/) · [pagination & infinite scroll](https://adapttable.orwamahmoud.com/react/pagination/) · [URL-synced state](https://adapttable.orwamahmoud.com/react/url-state/)
- **Interaction** — [filtering](https://adapttable.orwamahmoud.com/react/filtering/) · [sorting](https://adapttable.orwamahmoud.com/react/sorting/) · [selection & bulk actions](https://adapttable.orwamahmoud.com/react/selection/) · [row expansion](https://adapttable.orwamahmoud.com/react/row-expansion/) · [inline cell editing](https://adapttable.orwamahmoud.com/react/cell-editing/)
- **Columns** — [show/hide · reorder · pin · resize](https://adapttable.orwamahmoud.com/react/column-management/) · [row grouping & aggregates](https://adapttable.orwamahmoud.com/react/row-grouping/) · [CSV export](https://adapttable.orwamahmoud.com/react/customization/#csv-export)
- **More** — [i18n & RTL](https://adapttable.orwamahmoud.com/react/i18n-rtl/) · [virtualization](https://adapttable.orwamahmoud.com/react/virtualization/) · [customization](https://adapttable.orwamahmoud.com/react/customization/) · [API](https://adapttable.orwamahmoud.com/react/api/) · [FAQ](https://adapttable.orwamahmoud.com/faq/)

## License

[MIT](../../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
