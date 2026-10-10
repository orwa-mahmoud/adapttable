# Nuxt UI Vue table

`@adapttable/nuxt-ui` renders AdaptTable's Vue binding with Nuxt UI components.
The binding owns table state, callbacks and structural Chrome; this kit supplies
the buttons, inputs, selects, checkboxes, popovers, drawers and menus.

## Availability and versions

The package is prepared for its first experimental `0.1.0` release and is not
yet published to npm. Until it is, link the built workspace packages as
described in [Get started with Vue](./getting-started.md).

Peers: Vue `^3.5.18` and Nuxt UI `^4.11.3`. Nuxt UI 4 is MIT-licensed; the kit
uses the public `@nuxt/ui` package and needs no Pro license or Nuxt server
runtime. Node.js 22.12.0 or newer; on Node 22.12–22.18, npm applications add
`unifont@0.7.4` as an exact dependency, as the package README explains.

## Application setup

A plain Vue application follows Nuxt UI's
[Vue installation guide](https://ui.nuxt.com/docs/getting-started/installation/vue):

```ts
// vite.config.ts
import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), ui({ router: false, prose: true })],
  resolve: { dedupe: ["vue", "@nuxt/ui"] },
});
```

```ts
// main.ts
import ui from "@nuxt/ui/vue-plugin";
import { createApp } from "vue";
import App from "./App.vue";
import "./main.css";
import "@adapttable/nuxt-ui/styles.css";

createApp(App).use(ui).mount("#app");
```

```css
/* main.css */
@import "tailwindcss";
@import "@nuxt/ui";
```

Wrap the application in `UApp`, give the mounting element `class="isolate"`, and
install `@iconify-json/lucide` for Nuxt UI's default icons. Keep Nuxt UI's router
integration when the application uses Vue Router. Nuxt applications use the
official `@nuxt/ui` module instead of the Vue plugin.

```vue
<script setup lang="ts">
import { DataTable } from "@adapttable/nuxt-ui";
import { densityChooser } from "@adapttable/nuxt-ui/density";

const people = [{ id: "ada", name: "Ada", team: "Core" }];
</script>

<template>
  <DataTable
    :data="people"
    :columns="[{ key: 'name', sortable: true }, { key: 'team' }]"
    :row-key="(person) => person.id"
    :features="[densityChooser()]"
    :url-sync="false"
  />
</template>
```

## Kit components

| Component            | Entry points      | Renders                                               |
| -------------------- | ----------------- | ----------------------------------------------------- |
| `NuxtEditableCell`   | `/editing`        | An editable cell with Nuxt UI inputs and selects.     |
| `NuxtRowEditActions` | `/editing`        | Edit, save and cancel buttons for one row.            |
| `NuxtBatchEditBar`   | `/editing`        | The unsaved-row count with Save all and Cancel all.   |
| `NuxtFilterField`    | `/filters`        | A filter definition's field with the kit's controls.  |
| `NuxtHeaderFilter`   | `/header-filters` | A column header filter button and its popover.        |
| `PivotPanel`         | `/pivot`          | The pivot axes and measures with Nuxt UI selects.     |
| `TableAssistant`     | `/assistant`      | The optional assistant in a panel, window or drawer.  |
| `AgentApproval`      | `/assistant`      | Proposed row changes with approve and reject buttons. |

## Controls and styling

- Visible controls are Nuxt UI components, styled by the host's Nuxt UI theme
  and Tailwind build.
- Command palette, context menu, side panel, saved views and row reordering
  each come from their own feature entry with Nuxt UI surfaces.
- `classNames` and `data-adapttable-part` attributes are the styling targets;
  the package README lists each control and its target.

The [Vue feature guide](./features.md) covers feature composition. The package
README lists every feature entry point and its Nuxt UI control.
