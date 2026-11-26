---
title: "Nuxt UI Vue tables (v3)"
description: Build Vue tables with Nuxt UI components, Tailwind theming,
  host-owned data and composable features.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Nuxt
      UI Vue
      tables","item":"https://adapttable.orwamahmoud.com/v3/vue/nuxt-ui/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/nuxt-ui.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/nuxt-ui.png
slug: v3/vue/nuxt-ui
---

`@adapttable/nuxt-ui` renders AdaptTable's Vue binding with Nuxt UI components.
The binding owns table state, callbacks and structural Chrome; this kit supplies
the buttons, inputs, selects, checkboxes, popovers, drawers and menus.

## Availability and versions

This is a public package. Install `@adapttable/nuxt-ui`
and its UI-kit peers using [Get started with Vue](/v3/vue/getting-started/#choose-a-ui-kit),
then complete the application setup below.

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

Nuxt UI generates theme types when Vite runs. Add its theme aliases to the
application's TypeScript configuration, preserving any existing paths:

```json
{
  "compilerOptions": {
    "paths": {
      "#build/ui/*": ["./node_modules/.nuxt-ui/ui/*"]
    }
  }
}
```

If `vite.config.ts` has a separate TypeScript configuration, add
`"#build/ui": ["./node_modules/.nuxt-ui/ui"]` to that configuration's
`compilerOptions.paths`. Include `auto-imports.d.ts` and `components.d.ts` in
the application configuration when using Nuxt UI's default auto-imports.
Keep these generated files out of source control.

On a clean checkout, run Vite before type checking so the generated files
exist: for example, `vite build && vue-tsc --noEmit -p tsconfig.app.json`.
Running those commands in parallel can make the first type check fail.
For full dependency declaration checking, see the
[strict dependency compatibility notes](/v3/vue/getting-started/#strict-dependency-type-checking).

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

## Nuxt SSR setup

In a Nuxt application, register the Nuxt UI module and transpile the AdaptTable
adapter so its imported Nuxt UI components pass through Nuxt's Vue compiler:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  build: { transpile: ["@adapttable/nuxt-ui"] },
  ui: { prose: true },
  css: ["~/assets/css/main.css", "@adapttable/nuxt-ui/styles.css"],
});
```

The application's `main.css` imports Tailwind and Nuxt UI as shown above. Wrap
the application in `UApp`. Do not install the plain-Vue plugin in Nuxt.
Without adapter transpilation, a production build can succeed but its server
can fail on the first request with `ERR_UNKNOWN_FILE_EXTENSION` for a Nuxt UI
`.vue` component. Verify the built server's rendered HTML and hydration, as
well as the build command's exit status.

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

* Visible controls are Nuxt UI components, styled by the host's Nuxt UI theme
  and Tailwind build.
* Command palette, context menu, side panel, saved views and row reordering
  each come from their own feature entry with Nuxt UI surfaces.
* `classNames` and `data-adapttable-part` attributes are the styling targets;
  the package README lists each control and its target.

The [Vue feature guide](/v3/vue/features/) covers feature composition. The package
README lists every feature entry point and its Nuxt UI control.
