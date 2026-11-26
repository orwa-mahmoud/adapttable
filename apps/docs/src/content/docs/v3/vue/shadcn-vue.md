---
title: "shadcn-vue tables (v3)"
description: Build Vue tables with shadcn-vue presentation over Reka UI,
  standard shadcn tokens and composable features.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"shadcn-vue
      tables","item":"https://adapttable.orwamahmoud.com/v3/vue/shadcn-vue/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/shadcn-vue.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/shadcn-vue.png
slug: v3/vue/shadcn-vue
---

`@adapttable/shadcn-vue` is shadcn-vue presentation for AdaptTable's headless
Vue binding. Table state, feature lifetimes, query ownership and structural
Chrome belong to `@adapttable/vue`; this package supplies copied, licensed
shadcn-vue controls built on Reka UI.

## Availability and versions

This is a public `0.1.0` package. Install `@adapttable/shadcn-vue`
and its UI-kit peers using [Get started with Vue](/v3/vue/getting-started/#choose-a-ui-kit),
then complete the application setup below.

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

* Desktop output is a semantic table; mobile output uses shadcn Card components
  with article, definition-list and selection semantics.
* The adapter vendors shadcn-vue's New York v4 registry; its components compose
  Reka UI, and the upstream MIT license ships in `THIRD_PARTY_NOTICES.md`.
* `classNames` are merged with the kit's presentation classes. Set `dir="rtl"`
  for right-to-left layout or `forceMobile` for the card presentation.

The [Vue feature guide](/v3/vue/features/) covers feature composition. The package
README lists every feature entry point and its shadcn-vue control.
