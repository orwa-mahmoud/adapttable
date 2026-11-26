---
title: "Reka UI Vue tables (v3)"
description: Build accessible Vue tables with Reka UI primitives, a neutral
  theme, host-owned data and composable features.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Reka
      UI Vue
      tables","item":"https://adapttable.orwamahmoud.com/v3/vue/reka-ui/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/reka-ui.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/reka-ui.png
slug: v3/vue/reka-ui
---

`@adapttable/reka-ui` is a Vue data table with accessible Reka UI controls and a
compact, neutral theme. AdaptTable owns the data models and interactions; the
host owns the data. Reka provides real selection, choices, popovers, dialogs and
menu primitives.

## Availability and versions

This is a public `0.1.0` package. Install `@adapttable/reka-ui`
and its UI-kit peers using [Get started with Vue](/v3/vue/getting-started/#choose-a-ui-kit),
then complete the application setup below.

Peers: Vue `^3.5.0` and Reka UI `^2.11.0`. Node.js 22.12.0 or newer.

## Application setup

Load the kit's stylesheet once:

```vue
<script setup lang="ts">
import { DataTable, type ColumnInput } from "@adapttable/reka-ui";
import { filters } from "@adapttable/reka-ui/filters";
import "@adapttable/reka-ui/styles.css";

interface Person {
  id: string;
  name: string;
  team: string;
}

const rows: Person[] = [{ id: "ada", name: "Ada", team: "Engineering" }];
const columns: readonly ColumnInput<Person>[] = [
  { key: "name", sortable: true },
  { key: "team" },
];
const features = [filters<Person>([{ key: "name", type: "text" }])];
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :features="features"
    :row-key="(row) => row.id"
  />
</template>
```

## Kit components

| Component      | Entry points                   | Renders                                             |
| -------------- | ------------------------------ | --------------------------------------------------- |
| `FilterField`  | `/filters`, `/features`        | A filter definition's field with Reka controls.     |
| `HeaderFilter` | `/header-filters`, `/features` | A column header filter button and its Reka popover. |

## Controls and styling

Reka does not supply a table or card widget, so the kit uses the binding's
semantic table and card Chrome and fills its controls with Reka primitives:

* Selection and Boolean fields: `CheckboxRoot` and `CheckboxIndicator`.
* Choices: `SelectRoot`, `SelectTrigger`, `SelectContent` and related primitives.
* Row action menus: `DropdownMenuRoot` with its trigger, portal, content and items.
* Filter popovers: a non-modal `PopoverRoot`; filter drawers: a modal `DialogRoot`.
* Plain buttons and text inputs: Reka `Primitive` with their native tags.

The stylesheet provides custom properties including `--at-reka-background`,
`--at-reka-border`, `--at-reka-text`, `--at-reka-muted` and `--at-reka-accent`.
Portal surfaces carry `at-reka-surface`, `at-reka-select-content` and
`at-reka-menu` classes so overrides reach content outside the table root. RTL
uses logical spacing and Reka's direction provider.

The [Vue feature guide](/v3/vue/features/#reka-ui-feature-entries) lists the Reka
feature entries and preset composition.
