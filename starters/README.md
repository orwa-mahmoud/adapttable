# AdaptTable starters

One minimal [Vite](https://vite.dev) app per adapter — the kit's provider, the
adapter's `<DataTable>`, and a single table on a demo dataset. Every starter
composes the same features from its own kit's subpaths: `filters([])`,
`groupingPanel`, `columnMenu`, `resizableColumns`, `multiSort`,
`cellNavigation`, `editHistory`, `editing` and `exportCsv`. They exist so you
can try AdaptTable with **zero local setup**: open any one in StackBlitz and edit
a real table in the browser.

These are private workspace packages (nothing is published to npm). They are
typechecked as part of `pnpm check`, so they can't drift from the library.

## Open in StackBlitz

StackBlitz opens a repo subdirectory straight from GitHub — no account needed:

| Kit                 | Open                                                                                                     | Source                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Mantine             | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)           | [`mantine/`](./mantine)                     |
| Material UI         | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mui)               | [`mui/`](./mui)                             |
| Chakra UI           | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/chakra)            | [`chakra/`](./chakra)                       |
| Ant Design          | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/antd)              | [`antd/`](./antd)                           |
| Radix Themes        | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/radix)             | [`radix/`](./radix)                         |
| Base UI             | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/base-ui)           | [`base-ui/`](./base-ui)                     |
| shadcn/ui           | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/shadcn)            | [`shadcn/`](./shadcn)                       |
| Unstyled (CSS)      | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/unstyled)          | [`unstyled/`](./unstyled)                   |
| Unstyled + Tailwind | [StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/unstyled-tailwind) | [`unstyled-tailwind/`](./unstyled-tailwind) |

## Run one locally

```bash
pnpm --filter @adapttable/starter-mantine dev
```

Swap `mantine` for any kit (`mui`, `chakra`, `antd`, `radix`, `base-ui`,
`shadcn`, `unstyled`, `unstyled-tailwind`). Each starter depends on the **published** `@adapttable/*` packages
(so it installs cleanly on StackBlitz); inside this monorepo pnpm links them to
the local workspace versions.
