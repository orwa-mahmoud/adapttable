---
title: "Vuetify Vue tables (v3)"
description: Build Vue tables with Vuetify controls, the host Vuetify theme,
  host-owned data and composable features.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Vuetify
      Vue tables","item":"https://adapttable.orwamahmoud.com/v3/vue/vuetify/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/vuetify.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/vuetify.png
slug: v3/vue/vuetify
---

`@adapttable/vuetify` renders AdaptTable's Vue binding with Vuetify controls.
AdaptTable owns query state, feature lifetimes and structural Chrome; Vuetify
supplies the buttons, fields, selects, checkboxes, menus and dialogs.

## Availability and versions

This is a public package. Install `@adapttable/vuetify`
and its UI-kit peers using [Get started with Vue](/v3/vue/getting-started/#choose-a-ui-kit),
then complete the application setup below.

Peers: Vue `^3.5.0` and Vuetify `^4.2.4`. Node.js 22.12.0 or newer.

Applications checking dependency declarations should read the
[strict dependency compatibility notes](/v3/vue/getting-started/#strict-dependency-type-checking).

## Application setup

Install and register the Vuetify plugin in the host application, and import
Vuetify's base styles and the kit's stylesheet once:

```ts
import { createApp } from "vue";
import { createVuetify } from "vuetify/framework";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";
import "vuetify/styles";
import "@adapttable/vuetify/styles.css";
import App from "./App.vue";

const vuetify = createVuetify({
  icons: { defaultSet: "mdi", aliases, sets: { mdi } },
});

createApp(App).use(vuetify).mount("#app");
```

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef } from "@adapttable/vuetify";

interface Person {
  id: string;
  name: string;
  team: string;
}

const people: readonly Person[] = [
  { id: "ada", name: "Ada", team: "Platform" },
  { id: "bea", name: "Bea", team: "Design" },
];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team", sortable: true },
];
</script>

<template>
  <DataTable
    :data="people"
    :columns="columns"
    :row-key="(person) => person.id"
    :url-sync="false"
  />
</template>
```

## Kit components

| Component               | Entry points                 | Renders                                               |
| ----------------------- | ---------------------------- | ----------------------------------------------------- |
| `VuetifyEditableCell`   | `/editing`                   | An editable cell with Vuetify fields and selects.     |
| `VuetifyRowEditActions` | `/editing`                   | Edit, save and cancel buttons for one row.            |
| `VuetifyBatchEditBar`   | `/editing`, `/batch-editing` | The unsaved-row count with Save all and Cancel all.   |
| `VuetifyFilterField`    | `/filters`                   | A filter definition's field with the kit's controls.  |
| `VuetifyHeaderFilter`   | `/header-filters`            | A column header filter button and its popover.        |
| `PivotPanel`            | `/pivot`                     | The pivot axes and measures with Vuetify selects.     |
| `TableAssistant`        | `/assistant`                 | The optional assistant in a panel, window or drawer.  |
| `AgentApproval`         | `/assistant`                 | Proposed row changes with approve and reject buttons. |

## Controls and styling

* Visible controls are Vuetify components; the package README's control
  ownership section names the Vuetify component behind each part.
* The host owns its Vuetify theme, icon set and locale configuration.
* `classNames` and `data-adapttable-part` attributes are the styling targets.

The [Vue feature guide](/v3/vue/features/) covers feature composition. The package
README lists every feature entry point and its Vuetify control.
