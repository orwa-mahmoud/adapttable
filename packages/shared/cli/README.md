# @adapttable/cli

[![AdaptTable — scaffold a table for any UI kit from one engine](https://adapttable.orwamahmoud.com/media/core/tour.gif)](https://adapttable.orwamahmoud.com/react/demo/)

**[📖 Documentation](https://adapttable.orwamahmoud.com/)** · **[🚀 Live demo](https://adapttable.orwamahmoud.com/react/demo/)** · **[Get started](https://adapttable.orwamahmoud.com/react/getting-started/)**

The scaffolding CLI for [AdaptTable](https://github.com/orwa-mahmoud/adapttable).
One command detects your framework and UI kit, picks your package manager, writes a
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

- **Detects Angular** only when `package.json` lists `@angular/core` in
  dependencies or devDependencies **and** `angular.json` is present.
  Otherwise it keeps the React scaffold.
- **Detects your UI kit** from `package.json` — Mantine, MUI, Chakra, Ant
  Design, Radix Themes, Base UI, shadcn/ui (via `components.json`), or
  Tailwind for React; NG-ZORRO or native unstyled controls for Angular.
  Kit detection stays within the detected framework, including in mixed projects.
- **Detects your package manager** from the lockfile (pnpm / yarn / bun /
  npm) and **prints** the right install command — it never installs
  anything itself; you run the command it shows.
- **Scaffolds** `src/PeopleTable.tsx` for React or `src/app/peopleTable.ts`
  for Angular, a sortable starter table wired to
  the matching adapter (every optional behavior is one feature import away — see
  the docs). Pass `--force` to overwrite an existing file.
- **One step it can't do for you:** wrap your app in the kit's provider
  (`MantineProvider`, MUI's `ThemeProvider`, `ChakraProvider`, antd's
  `ConfigProvider`, Radix's `Theme`) if it isn't already — that's the
  most common React first-run failure. Angular setup is below.

## Angular setup

With both Angular markers present, `init` writes a standalone `PeopleTable`
component. `ng-zorro-antd` selects `@adapttable/ng-zorro`; without it, the
component uses `@adapttable/angular-unstyled`. React kit dependencies,
Tailwind and `components.json` do not override that Angular selection.

**Both Angular kits are prepared for their first public `0.1.0` release.**
Publication is a separate owner-controlled step. Check that your registry
provides the binding and chosen kit before running the printed install command;
until publication, use built workspace or local packages. The CLI does not
check registry availability, install packages or edit `package.json`.

In an app component beside the generated file, import and render it:

```ts
import { Component } from "@angular/core";
import { PeopleTable } from "./peopleTable";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [PeopleTable],
  template: "<people-table />",
})
export class App {}
```

The component uses `ColumnDef` from `@adapttable/angular` and `AdaptDataTable`
from the chosen kit, with Ada Lovelace, Alan Turing and Grace Hopper as starter
rows. Name and Role are sortable. The CLI leaves your app component,
`angular.json` and styles unchanged, and preserves an existing generated
component unless you pass `--force`.

The NG-ZORRO kit targets Angular 22 and NG-ZORRO 22.1.1. Its host peers are
`@angular/cdk`, `@angular/common`, `@angular/core`, `@angular/forms`,
`@angular/platform-browser`, `@angular/router` and `ng-zorro-antd`.
The printed command includes missing CDK/forms/router peers with Angular 22
ranges and leaves already declared peers out; match any missing Angular
peers to your installed Angular version. Load the NG-ZORRO stylesheet once
from your app's global CSS:

```css
@import "ng-zorro-antd/ng-zorro-antd.min.css";
```

The native kit requires no theme stylesheet.

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
import { detectFramework, detectKit, runInit } from "@adapttable/cli";

detectKit({ "@mui/material": "^6" }).kit; // "mui"

const dependencies = { "@angular/core": "^22.2.0", "ng-zorro-antd": "^22.1.1" };
const framework = detectFramework(dependencies, { hasAngularJson: true });
detectKit(dependencies, { framework }).kit; // "ng-zorro"
```

`runInit` reports the detected `framework` alongside its kit, generated paths
and install command. `detectKit` defaults to React when its framework option
is omitted, and existing `KitInfo` values need no new required property.

## Features

- **Detects your UI kit** from `package.json` — Mantine, MUI, Chakra, Ant Design, Radix,
  Base UI, shadcn/ui (via `components.json`) or Tailwind for React; NG-ZORRO or
  native controls for Angular.
- **Prints the exact install command** for the matching adapter plus the peer
  packages it needs (run it yourself with your package manager after checking
  availability; use built local Angular packages until their first publication).
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
