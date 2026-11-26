---
title: "Element Plus Vue tables (v3)"
description: Build Vue tables with Element Plus controls and card surfaces,
  host-owned data and composable features.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Element
      Plus Vue
      tables","item":"https://adapttable.orwamahmoud.com/v3/vue/element-plus/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/element-plus.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/element-plus.png
slug: v3/vue/element-plus
---

`@adapttable/element-plus` renders AdaptTable's Vue binding with Element Plus
controls and card surfaces. The binding owns table state, feature lifetimes,
query ownership and host-write callbacks; this kit supplies buttons, fields,
checkboxes, selects, popovers, drawers and message boxes.

## Availability and versions

This is a public package. Install `@adapttable/element-plus`
and its UI-kit peers using [Get started with Vue](/v3/vue/getting-started/#choose-a-ui-kit),
then complete the application setup below.

Peers: Vue `^3.5.0` and Element Plus `^2.14.7`. Node.js 22.12.0 or newer.

Applications checking dependency declarations should read the
[strict dependency compatibility notes](/v3/vue/getting-started/#strict-dependency-type-checking).

## Application setup

Register Element Plus the way your application already does, then load its
stylesheet and the kit's stylesheet once:

```ts
import "element-plus/dist/index.css";
import "@adapttable/element-plus/styles.css";
```

Load Element Plus's dark-theme CSS variables when using its dark theme. Popup
stacking follows `ElConfigProvider`'s `zIndex` setting.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/element-plus";
import { filters } from "@adapttable/element-plus/filters";

interface Person {
  id: string;
  name: string;
  score: number;
}

const rows: Person[] = [
  { id: "ada", name: "Ada", score: 92 },
  { id: "bea", name: "Bea", score: 87 },
];
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const features = [filters<Person>([{ key: "name", type: "text" }])];
const selectedIds = ref<string[]>([]);
</script>

<template>
  <DataTable
    v-model:selected-ids="selectedIds"
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
    selectable
  />
</template>
```

## Kit components

Each feature entry exports the kit component it renders, for custom layouts over
the same binding models:

| Component               | Entry points                 | Renders                                                |
| ----------------------- | ---------------------------- | ------------------------------------------------------ |
| `ElementEditableCell`   | `/editing`                   | An editable cell with Element Plus inputs and selects. |
| `ElementRowEditActions` | `/editing`                   | Edit, save and cancel buttons for one row.             |
| `ElementBatchEditBar`   | `/editing`, `/batch-editing` | The unsaved-row count with Save all and Cancel all.    |
| `FilterField`           | `/filters`                   | A filter definition's field with the kit's controls.   |
| `ElementHeaderFilter`   | `/header-filters`            | A column header filter button and its popover.         |
| `PivotPanel`            | `/pivot`                     | The pivot axes and measures with Element Plus selects. |
| `TableAssistant`        | `/assistant`                 | The optional assistant in a panel, window or drawer.   |
| `AgentApproval`         | `/assistant`                 | Proposed row changes with approve and reject buttons.  |

## Controls and styling

* The desktop renderer places a semantic HTML table inside `ElCard`; mobile
  cards use one `ElCard` per row.
* Sorting, selection, search and paging use Element Plus components. Filter
  popovers use `ElPopover`; `{ mode: "drawer" }` uses a modal `ElDrawer`.
* Row-action confirmation uses `ElMessageBox`, inside the fullscreen table.
* `classNames` styles the named part; compound controls follow Element Plus's
  public attribute API for checkboxes, inputs and selects.

Server rendering needs Element Plus's per-request `ID_INJECTION_KEY` and
`ZINDEX_INJECTION_KEY` setup and the injected teleport payload, as described in
the [Element Plus SSR guide](https://element-plus.org/en-US/guide/ssr.html).

The [Vue feature guide](/v3/vue/features/) covers feature composition. The
package README lists every feature entry point and its Element Plus control.
