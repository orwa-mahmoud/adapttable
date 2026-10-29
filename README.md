<div align="center">

# AdaptTable

### Build your table. Connect your agent. Keep your UI kit.

**React · Angular · Vue · 25 native adapters · MIT licensed**

Filtering, grouping, pivot tables, editing and saved views — rendered with your
UI kit's own components. Add an agent that operates through the same table
capabilities, or go fully headless and render everything yourself.

[![npm version](https://img.shields.io/npm/v/@adapttable/core.svg)](https://www.npmjs.com/package/@adapttable/core)
[![downloads](https://img.shields.io/npm/dm/@adapttable/core.svg)](https://www.npmjs.com/package/@adapttable/core)
[![coverage](https://codecov.io/gh/orwa-mahmoud/adapttable/graph/badge.svg)](https://codecov.io/gh/orwa-mahmoud/adapttable)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](./tsconfig.base.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

**[React demo](https://adapttable.orwamahmoud.com/react/demo/)** · **[Angular demo](https://adapttable.orwamahmoud.com/angular/demo/)** · **[Vue demo](https://adapttable.orwamahmoud.com/vue/demo/)** · **[Documentation](https://adapttable.orwamahmoud.com/)**

</div>

- **Mobile cards, automatically.** Below the breakpoint, rows become readable
  cards with the same filters, search and selection — no second layout to
  build. Prefer the table on phones? Set `forceMobile` to `false` and it keeps
  horizontal scrolling.
  [See it flip live →](https://adapttable.orwamahmoud.com/react/demo/mantine/mobile-cards/)
- **The whole view in the URL.** Search, filters, sorting, paging and grouping —
  and column layout when you opt in — live in the query string, so any view is
  a shareable link that survives reload and the back button. Several tables can
  share one URL. [URL state →](https://adapttable.orwamahmoud.com/react/url-state/)
- **Spreadsheet power, no paid tier.** Pivot tables, formulas, cell-range
  selection with clipboard and fill handle, undo/redo, and Excel and PDF
  export — all MIT. [Pivot tables →](https://adapttable.orwamahmoud.com/react/pivot/)

## Your table already knows what it can do

The columns, enabled features and callbacks you configure for your table also
supply its agent capabilities. No second implementation of filtering, grouping
or editing just to let an agent use them.

**48-second AI demo:** ask the table to filter, group, calculate aggregates,
hide columns and pin Salary.

https://github.com/user-attachments/assets/a6433115-2185-478c-8ee6-ddd64bc1e0f9

- **Discover and act:** `catalog()` lists capabilities, `describe()` supplies
  schemas and instructions on demand, and `execute()` runs the requested action.
- **Give it context:** column meaning, the current view, and full or compact
  context. Discovering capabilities does not send the entire dataset.
- **Keep control:** bound row access, choose permissions and approvals, and route
  data changes through your application's callbacks and save flow.
- **Connect your agent:** HTTP, AI SDK, AG-UI, OpenAI tools, MCP or your own
  integration. Use the included assistant and voice input, or build your own UI.

AI is optional and MIT licensed. Bring your own model or agent backend.
[Explore the AI integration →](https://adapttable.orwamahmoud.com/ai-integrations/)

## A complete table, in your design system

> **Headless freedom, batteries included for the UI kit you already use** — with
> URL state, RTL, mobile cards and a real filter UX out of the box.

A UI kit's table gets you started. A headless engine gives you control.
AdaptTable fills the space between them: assembled interactions with your kit's
own controls, plus a headless path when you need custom markup.

**70-second feature tour:** eight kits across React, Angular and Vue.
Each segment shows a different interaction; features aren't exclusive to the kit shown.

https://github.com/user-attachments/assets/2896fd69-9463-4000-8871-f78d08055a84

## Features

|                     | Included                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Search & filter** | Global search, find in table, popover/drawer filtering, header filters, custom filter types and AND/OR filter trees.                                                                             |
| **Analyze**         | Sorting and multi-sort, drag-to-group row grouping, aggregation, group footers, pinned summary rows, pivot tables, a spreadsheet formula engine and sparkline columns.                           |
| **Edit**            | Cell editing with validation, row forms, batch edits, undo/redo, cell-range selection, clipboard operations, fill handle and conflict handling for live updates.                                 |
| **Act**             | Selection, bulk actions, selection statistics, row actions, add/duplicate/delete callbacks, context menus and a command palette.                                                                 |
| **Arrange**         | Column management: resize, reorder, pin, hide, auto-fit and collapsible column groups. Row reordering, row pinning, row and column spanning, full-width/separator rows, row styling and heights. |
| **Explore**         | Row expansion, nested tables, tree data, client/server data, pagination, infinite scroll, virtualization and realtime updates.                                                                   |
| **Save & share**    | Saved views, URL state, CSV/XLSX/PDF export and print layouts. Toolbar view controls for density, fullscreen, status bar and side panel.                                                         |
| **Reach everyone**  | Automatic mobile card layouts, dark mode, RTL, 20 locales, keyboard navigation and screen-reader announcements. SSR and server components through the framework integration.                     |

**Built to scale:** compose `virtualize()` and a 10,000-row table mounts 10 DOM
rows — 1,000× fewer than a plain table, on about 95% less memory.
[See the measured benchmark →](https://adapttable.orwamahmoud.com/react/virtualization/#benchmark)

Use **feature composition** to import extended interactions from kit subpaths,
or start with a preset. Your application owns the data; writes are callbacks.

[React features](https://adapttable.orwamahmoud.com/react/features/) ·
[Angular features](https://adapttable.orwamahmoud.com/angular/features/) ·
[Vue features](https://adapttable.orwamahmoud.com/vue/features/) ·
[Comparison](https://adapttable.orwamahmoud.com/react/comparison/) ·
[Limitations](https://adapttable.orwamahmoud.com/limitations/)

## One core, three frameworks, 25 adapters

| Framework       | Native adapters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React · 8**   | [Mantine](https://www.npmjs.com/package/@adapttable/mantine), [MUI](https://www.npmjs.com/package/@adapttable/mui), [Chakra UI](https://www.npmjs.com/package/@adapttable/chakra), [Ant Design](https://www.npmjs.com/package/@adapttable/antd), [Radix](https://www.npmjs.com/package/@adapttable/radix), [Base UI](https://www.npmjs.com/package/@adapttable/base-ui), [shadcn](https://www.npmjs.com/package/@adapttable/shadcn), [Tailwind/Unstyled](https://www.npmjs.com/package/@adapttable/unstyled)                                                                                                                                         |
| **Angular · 9** | [NG-ZORRO](https://www.npmjs.com/package/@adapttable/ng-zorro), [Angular Material](https://www.npmjs.com/package/@adapttable/angular-material), [Spartan](https://www.npmjs.com/package/@adapttable/spartan), [Taiga UI](https://www.npmjs.com/package/@adapttable/taiga-ui), [ng-bootstrap](https://www.npmjs.com/package/@adapttable/ng-bootstrap), [ngx-bootstrap](https://www.npmjs.com/package/@adapttable/ngx-bootstrap), [Angular Aria](https://www.npmjs.com/package/@adapttable/angular-aria), [Angular CDK](https://www.npmjs.com/package/@adapttable/angular-cdk), [Unstyled](https://www.npmjs.com/package/@adapttable/angular-unstyled) |
| **Vue · 8**     | [Element Plus](https://www.npmjs.com/package/@adapttable/element-plus), [Naive UI](https://www.npmjs.com/package/@adapttable/naive-ui), [Vuetify](https://www.npmjs.com/package/@adapttable/vuetify), [Quasar](https://www.npmjs.com/package/@adapttable/quasar), [Nuxt UI](https://www.npmjs.com/package/@adapttable/nuxt-ui), [Reka UI](https://www.npmjs.com/package/@adapttable/reka-ui), [shadcn-vue](https://www.npmjs.com/package/@adapttable/shadcn-vue), [Unstyled](https://www.npmjs.com/package/@adapttable/vue-unstyled)                                                                                                                 |

A framework-independent TypeScript core owns the shared behavior. React hooks,
Angular signals and Vue reactivity connect it to each framework; adapters supply
the UI kit's components. Every feature works in all eight React adapters;
Angular and Vue kits compose the same engine through their own factories.
Switching kits keeps the table model. Switching frameworks changes the
integration while preserving familiar concepts and workflows.

**Three ways to build:** use an adapter, render your own headless table, or
[build an adapter](https://adapttable.orwamahmoud.com/react/building-an-adapter/)
for your design system. Headless means no markup at all — prop-getters for
every part, rendered however you like:

```tsx
import { useDataTable } from "@adapttable/react";

const table = useDataTable({ source, columns, rowKey: (row) => row.id });
```

## Client or server data — same table

Pass an array and the table filters, sorts and pages it for you. Point it at
your API and the same table sends those operations to your server. Columns,
features and UI stay the same; both produce one
[`TableSource`](https://adapttable.orwamahmoud.com/data-tiers/) contract.

```ts
const source = useFrontendData({ data, columns }); // client-side filter, sort, slice
const source = useQuerySource({ usePaginatedQuery }); // server-side, paged or infinite
```

## Get started

```sh
npx @adapttable/cli init
```

Or follow the setup guide for your framework and kit:

| React                                                                              | Angular                                                                              | Vue                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [Install & first table](https://adapttable.orwamahmoud.com/react/getting-started/) | [Install & first table](https://adapttable.orwamahmoud.com/angular/getting-started/) | [Install & first table](https://adapttable.orwamahmoud.com/vue/getting-started/) |

**React + Mantine example** (after installing the kit and configuring its provider):

```tsx
import { DataTable, type ColumnDef } from "@adapttable/mantine";
import { filters } from "@adapttable/mantine/filters";

type Person = { id: string; name: string; email: string };

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name, sortable: true },
  {
    key: "email",
    header: "Email",
    accessor: (row) => row.email,
    filter: "text",
  },
];

export function People({ rows }: { rows: Person[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[filters([])]}
    />
  );
}
```

[Try a live starter](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine) ·
[Browse examples](./examples) · [All npm packages](https://www.npmjs.com/org/adapttable)

**Requirements:** Node.js 22.12+; React 18/19, Angular 20/21/22, or Vue 3.5+.
Kit requirements vary (NG-ZORRO requires Angular 22); check your setup guide.
Packages are versioned independently and install their matching binding and core.

## Go deeper

- [Core concepts](https://adapttable.orwamahmoud.com/concepts/) · [Client/server data](https://adapttable.orwamahmoud.com/data-tiers/) · [Customization](https://adapttable.orwamahmoud.com/react/customization/)
- [AI integration](https://adapttable.orwamahmoud.com/ai-integrations/) · [Accessibility](https://adapttable.orwamahmoud.com/react/accessibility/) · [Versioning](https://adapttable.orwamahmoud.com/versioning/)
- [Migrate from v2](https://adapttable.orwamahmoud.com/react/migrate-from-v2/) · [FAQ](https://adapttable.orwamahmoud.com/faq/)
- For agents: [llms.txt](https://adapttable.orwamahmoud.com/llms.txt) · [llms-full.txt](https://adapttable.orwamahmoud.com/llms-full.txt)

## Contributing

[Contributing guide](./CONTRIBUTING.md) · [Issues & roadmap](https://github.com/orwa-mahmoud/adapttable/issues) · [Discussions](https://github.com/orwa-mahmoud/adapttable/discussions)

## License

[MIT](./LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)

---

<div align="center">
<sub>Keywords: react data table, angular data table, vue data table, AI table agent, headless table, server-side pagination, url state, infinite scroll table, mantine table, mui datagrid alternative, chakra table, ant design table, antd table, tailwind table, shadcn table, rtl table, arabic table, typescript, dark mode.</sub>
</div>
