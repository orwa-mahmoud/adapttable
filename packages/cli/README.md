# @adapttable/cli

[![AdaptTable — scaffold a table for any UI kit from one engine](https://orwa-mahmoud.github.io/adapttable/media/demo-core-tour.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-core-tour.mp4)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)**

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

## What it does

- **Detects your UI kit** from `package.json` — Mantine, MUI, Chakra, Ant
  Design, Radix Themes, or Tailwind (→ the unstyled adapter, or shadcn/ui when
  a `components.json` is present), falling back to unstyled.
- **Detects your package manager** from the lockfile (pnpm / yarn / bun /
  npm) and prints the right install command.
- **Scaffolds** `src/PeopleTable.tsx`, a ready-to-render starter using the
  matching adapter. Pass `--force` to overwrite an existing file.

## Programmatic use

The building blocks are exported and pure (easy to test/automate):

```ts
import { detectKit, runInit } from "@adapttable/cli";

detectKit({ "@mui/material": "^6" }).kit; // "mui"
```

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © Orwa Mahmoud
