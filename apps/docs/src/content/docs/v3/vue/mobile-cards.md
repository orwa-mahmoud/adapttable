---
title: "Responsive Vue tables and mobile cards (v3)"
description: Responsive Vue tables with automatic mobile cards or horizontal
  scrolling. Keep native kit cells, editing, selection and RTL across eight
  adapters.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Responsive
      Vue tables and mobile
      cards","item":"https://adapttable.orwamahmoud.com/v3/vue/mobile-cards/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/mobile-cards.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/mobile-cards.png
slug: v3/vue/mobile-cards
---

Render responsive Vue table cards with native controls, shared columns, editing, selection and RTL across eight adapters.

Cards are automatic below `mobileBreakpoint` (768px by default). Omit
`forceMobile` to follow the viewport, set it to `true` to always show cards, or
set it to `false` to keep a horizontally scrolling table on phones. Columns,
selection and query state remain shared across both layouts.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import type { ColumnDef } from "@adapttable/vue";
import { DataTable } from "@adapttable/vue-unstyled";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
  { id: "grace", name: "Grace", score: 20 },
]);
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const rowKey = (row: Person) => row.id;
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    table-label="People"
    url-key="people"
    :mobile-breakpoint="768"
    locale="ar"
    dir="rtl"
  />
</template>
```

Each adapter owns its card presentation and native controls. The built-in field
body adapts to the card's width, with labels above values and unlabeled fields
spanning the full width. Set `mobileLabel: ""` on a self-explanatory identity
column. A column renderer can supply the kit's avatar, status badge or progress
indicator; cards preserve that renderer instead of converting it to plain text.
Long values wrap, and narrow containers reduce the number of field columns.

Sorting, filtering, selection, row actions and composed editing continue to use
the same models. With `paginationMode="auto"`, cards use infinite loading and
the desktop table uses pages. Set the pagination mode explicitly to keep it
independent of presentation.

## Keep horizontal scrolling on phones

```vue
<DataTable
  :data="rows"
  :columns="columns"
  :row-key="rowKey"
  :force-mobile="false"
  pagination-mode="paged"
  table-label="People"
/>
```

Wide columns scroll inside the table. This presentation suits comparisons
across rows; cards suit reading and acting on individual records. The mobile
demo offers Automatic, Phone cards and Scrollable table choices without
remounting the table. Its initial forced-card preview does not change the
library's automatic default.

Use `locale` for translated labels and `dir` for reading direction; changing direction alone does not translate text. `classNames` exposes semantic card parts in the Unstyled adapter, where the host supplies appearance. Follow the chosen kit’s provider and stylesheet setup for styled adapters. See [getting started](/v3/vue/getting-started/#choose-a-ui-kit) and [editing](/v3/vue/cell-editing/).

## Custom card bodies

All eight kits accept the `card` slot. It replaces only the fields inside the
native card; selection, expansion, row actions and Save/Cancel remain owned by
the table. The context contains `row`, `index`, `selected`, `expanded`, and
`fields`. Each field provides its `column`, resolved `label`, and prepared
Vue `value`. Render that value to preserve the column's native cell and editor.

```vue
<script setup lang="ts">
import type { VNodeChild } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/vue-unstyled";

interface Person {
  id: string;
  name: string;
}
const rows: Person[] = [{ id: "ada", name: "Ada" }];
const columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
const rowKey = (row: Person) => row.id;
const FieldValue = (props: { value: VNodeChild }) => props.value;
</script>

<template>
  <DataTable :data="rows" :columns="columns" :row-key="rowKey">
    <template #card="{ fields }">
      <div class="profile-fields">
        <div v-for="field in fields" :key="field.column.key">
          <strong v-if="field.label">{{ field.label }}</strong>
          <FieldValue :value="field.value" />
        </div>
      </div>
    </template>
  </DataTable>
</template>
```

Keep field keys stable and allow values to wrap. A custom body should render
each prepared value once; recreating raw values would bypass its editor.

## Editing and difficult states

Row drafts, selection, filters and expanded rows share the same state across
cards and tables. Viewport changes restore the active native editor and its
text selection when the editor inventory stays the same. Choosing a layout
button explicitly leaves focus on that button. A custom editor must attach its
provided focus ref to its native input to participate in focus management.

Use `:max-height="360"` (pixels) or `max-height="60vh"` to bound the scroll
body while keeping toolbar and pagination visible.

The mobile examples offer editing, custom bodies, bounded scrolling, paged or
infinite presentation, and empty/loading/error scenarios. Use `isLoading` with
empty `data` for initial loading, `isFetching` while retaining rows for refresh,
and `error` for a failed request. The host owns recovery and every saved edit.

## Try the native adapters

Use the [live demo](/v3/vue/demo/) or [Feature Lab](/v3/vue/demo/all-options/) to switch all eight Vue kits. Dedicated kit examples show the same feature with each UI kit’s controls.
