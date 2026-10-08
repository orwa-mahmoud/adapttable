# shadcn-vue table

`@adapttable/shadcn-vue` is shadcn-vue presentation for AdaptTable's headless
Vue binding. Table state, feature lifetimes, query ownership and structural
Chrome belong to `@adapttable/vue`; this package supplies copied, licensed
shadcn-vue controls built on Reka UI.

## Availability and versions

The package is prepared for its first experimental `0.1.0` release and is not
yet published to npm. Until it is, link the built workspace packages as
described in [Get started with Vue](./getting-started.md).

Peers: Vue `^3.5.0` and Reka UI `^2.11.0`. Node.js 22.12.0 or newer.

## Application setup

Import `@adapttable/shadcn-vue/styles.css` once. It ships compiled utilities
without Tailwind Preflight, so consumers do not need a Tailwind build. The
stylesheet reads the standard shadcn CSS tokens (`--background`, `--foreground`,
`--primary`, `--border`, `--input` and `--ring`) with neutral fallbacks.

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef } from "@adapttable/shadcn-vue";
import { densityChooser } from "@adapttable/shadcn-vue/density";
import "@adapttable/shadcn-vue/styles.css";

interface Person {
  id: string;
  name: string;
  score: number;
}

const data: readonly Person[] = [{ id: "ada", name: "Ada", score: 42 }];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const features = [densityChooser()];
</script>

<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    selectable
  />
</template>
```

## Kit components

| Component                                   | Entry points                   | Renders                                                                       |
| ------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| `FilterField`                               | `/filters`, `/features`        | A filter field whose widget the registry chooses: custom, checklist or basic. |
| `BasicFilterField`, `BasicFilterFieldProps` | `/filters`, `/features`        | A definition's built-in field, without the registry lookup.                   |
| `FilterTree`                                | `/filters`, `/features`        | The AND/OR filter tree builder with shadcn controls.                          |
| `FilterChips`, `FilterChipsProps`           | `/filters`, `/features`        | The active filter chips with remove and clear buttons.                        |
| `HeaderFilter`, `HeaderFilterProps`         | `/header-filters`, `/features` | A column header filter button and its popover.                                |

## Controls and styling

- Desktop output is a semantic table; mobile output uses shadcn Card components
  with article, definition-list and selection semantics.
- The adapter vendors shadcn-vue's New York v4 registry; its components compose
  Reka UI, and the upstream MIT license ships in `THIRD_PARTY_NOTICES.md`.
- `classNames` are merged with the kit's presentation classes. Set `dir="rtl"`
  for right-to-left layout or `forceMobile` for the card presentation.

The [Vue feature guide](./features.md) covers feature composition. The package
README lists every feature entry point and its shadcn-vue control.
