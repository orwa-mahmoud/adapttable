# Quasar Vue table

`@adapttable/quasar` renders AdaptTable's Vue binding with Quasar controls. The
binding owns state and feature behavior; Quasar supplies the interactive
components.

## Availability and versions

The package is prepared for its first experimental `0.1.0` release and is not
yet published to npm. Until it is, link the built workspace packages as
described in [Get started with Vue](./getting-started.md).

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

| Component              | Entry points                 | Renders                                              |
| ---------------------- | ---------------------------- | ---------------------------------------------------- |
| `QuasarEditableCell`   | `/editing`                   | An editable cell with Quasar inputs and selects.     |
| `QuasarRowEditActions` | `/editing`                   | Edit, save and cancel buttons for one row.           |
| `QuasarBatchEditBar`   | `/editing`, `/batch-editing` | The unsaved-row count with Save all and Cancel all.  |
| `QuasarFilterField`    | `/filters`                   | A filter definition's field with the kit's controls. |
| `QuasarHeaderFilter`   | `/header-filters`            | A column header filter button and its popover.       |

## Controls and styling

- Visible controls are Quasar components; the package README's control table
  names the Quasar component behind each part.
- The `styles.css` export is a separate stylesheet, marked as a side effect so
  bundlers retain its import.
- `classNames` and `data-adapttable-part` attributes are the styling targets.

The [Vue feature guide](./features.md) covers feature composition. The package
README lists every feature entry point and its Quasar control.
