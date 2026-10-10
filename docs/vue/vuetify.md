# Vuetify Vue table

`@adapttable/vuetify` renders AdaptTable's Vue binding with Vuetify controls.
AdaptTable owns query state, feature lifetimes and structural Chrome; Vuetify
supplies the buttons, fields, selects, checkboxes, menus and dialogs.

## Availability and versions

The package is prepared for its first experimental `0.1.0` release and is not
yet published to npm. Until it is, link the built workspace packages as
described in [Get started with Vue](./getting-started.md).

Peers: Vue `^3.5.0` and Vuetify `^4.2.4`. Node.js 22.12.0 or newer.

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

- Visible controls are Vuetify components; the package README's control
  ownership section names the Vuetify component behind each part.
- The host owns its Vuetify theme, icon set and locale configuration.
- `classNames` and `data-adapttable-part` attributes are the styling targets.

The [Vue feature guide](./features.md) covers feature composition. The package
README lists every feature entry point and its Vuetify control.
