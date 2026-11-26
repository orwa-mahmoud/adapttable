---
title: "Quasar Vue tables (v3)"
description: Build Vue tables with Quasar controls, host-owned data and composable features.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Quasar
      Vue tables","item":"https://adapttable.orwamahmoud.com/v3/vue/quasar/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/quasar.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/quasar.png
slug: v3/vue/quasar
---

`@adapttable/quasar` renders AdaptTable's Vue binding with Quasar controls. The
binding owns state and feature behavior; Quasar supplies the interactive
components.

## Availability and versions

This is a public `0.1.0` package. Install `@adapttable/quasar`
and its UI-kit peers using [Get started with Vue](/v3/vue/getting-started/#choose-a-ui-kit),
then complete the application setup below.

Peers: Vue `^3.5.0` and Quasar `2.34.0`. Node.js 22.12.0 or newer.

## Application setup

Register the Quasar plugin once and load both stylesheets in the application
entry:

```ts
import { createApp } from "vue";
import { Quasar } from "quasar";
import "quasar/dist/quasar.css";
import "@adapttable/quasar/styles.css";
import App from "./App.vue";

createApp(App).use(Quasar, { config: {} }).mount("#app");
```

A plain Vue/Vite application uses Quasar's official Vite plugin and asset
transform configuration:

```ts
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls } }), quasar()],
});
```

```vue
<script setup lang="ts">
import { DataTable } from "@adapttable/quasar";
import { filters } from "@adapttable/quasar/filters";

interface Person {
  id: string;
  name: string;
}

const rows: Person[] = [{ id: "ada", name: "Ada" }];
const features = [filters<Person>([{ key: "name", type: "text" }])];
</script>

<template>
  <DataTable
    :data="rows"
    :columns="[{ key: 'name', header: 'Name', sortable: true }]"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
```

## Kit components

| Component              | Entry points                 | Renders                                               |
| ---------------------- | ---------------------------- | ----------------------------------------------------- |
| `QuasarEditableCell`   | `/editing`                   | An editable cell with Quasar inputs and selects.      |
| `QuasarRowEditActions` | `/editing`                   | Edit, save and cancel buttons for one row.            |
| `QuasarBatchEditBar`   | `/editing`, `/batch-editing` | The unsaved-row count with Save all and Cancel all.   |
| `QuasarFilterField`    | `/filters`                   | A filter definition's field with the kit's controls.  |
| `QuasarHeaderFilter`   | `/header-filters`            | A column header filter button and its popover.        |
| `PivotPanel`           | `/pivot`                     | The pivot axes and measures with Quasar selects.      |
| `TableAssistant`       | `/assistant`                 | The optional assistant in a panel, window or drawer.  |
| `AgentApproval`        | `/assistant`                 | Proposed row changes with approve and reject buttons. |

## Controls and styling

* Visible controls are Quasar components; the package README's control table
  names the Quasar component behind each part.
* The `styles.css` export is a separate stylesheet, marked as a side effect so
  bundlers retain its import.
* `classNames` and `data-adapttable-part` attributes are the styling targets.

The [Vue feature guide](/v3/vue/features/) covers feature composition. The package
README lists every feature entry point and its Quasar control.
