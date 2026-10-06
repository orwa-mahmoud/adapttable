# @adapttable/nuxt-ui

Nuxt UI controls for AdaptTable's headless Vue binding. The binding owns table
state, callbacks and structural Chrome; this adapter supplies Nuxt UI components.
It does not use Nuxt UI's separate `UTable` engine.

## Nuxt UI setup

Nuxt UI 4 is MIT-licensed, including the components previously offered as Pro.
This adapter uses the public `@nuxt/ui` package and requires no Pro license or
Nuxt server runtime. The initial supported Nuxt UI version is 4.11.3.

For a plain Vue application, follow the
[official Vue installation guide](https://ui.nuxt.com/docs/getting-started/installation/vue):

```ts
// vite.config.ts
import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), ui({ router: false, prose: true })],
});
```

```ts
// main.ts
import ui from "@nuxt/ui/vue-plugin";
import { createApp } from "vue";
import App from "./App.vue";
import "./main.css";

createApp(App).use(ui).mount("#app");
```

```css
/* main.css */
@import "tailwindcss";
@import "@nuxt/ui";
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import UApp from "@nuxt/ui/components/App.vue";
</script>

<template>
  <UApp>
    <!-- Application content -->
  </UApp>
</template>
```

Give the mounting element `class="isolate"`. If your application uses Vue Router,
keep Nuxt UI's default router integration instead of `router: false`. Nuxt
applications use the official `@nuxt/ui` module; they do not install the Vue-only
plugin a second time. Both integrations need the theme CSS and application-level
`UApp` provider. Set `UApp`'s `dir` and locale alongside the table's direction for
RTL controls and overlays.

The Vite plugin generates theme declarations. For Vue type checking, map
`#build/ui/*` to `./node_modules/.nuxt-ui/ui/*` in the application tsconfig and run
Vite before the first type check. Keep the generated directory out of source
control. `prose: true` generates the public Prose table-part themes used by the
adapter. Import controls from documented `@nuxt/ui/components/*.vue` paths;
`@nuxt/ui` itself is the Nuxt module entry, not a component barrel.

## Table rendering

```vue
<script setup lang="ts">
import { DataTable } from "@adapttable/nuxt-ui";
import { densityChooser } from "@adapttable/nuxt-ui/density";
import "@adapttable/nuxt-ui/styles.css";

const people = [{ id: "ada", name: "Ada", team: "Core" }];
</script>

<template>
  <DataTable
    :data="people"
    :columns="[{ key: 'name', sortable: true }, { key: 'team' }]"
    :row-key="(person) => person.id"
    :features="[densityChooser()]"
    table-label="People"
  />
</template>
```

The optional outer surface is AdaptTable's shared layout. Nuxt UI owns the
desktop and mobile body renderers: public `ProseThead`, `ProseTbody`, `ProseTr`,
`ProseTh` and `ProseTd` components render the prepared headless model, and `UCard`
renders mobile records. A semantic `table` root and `tfoot` retain native table
attributes and summary structure. There is one scroll container.

`UTable` always creates its own TanStack table instance, including in manual
sorting/filtering modes. It does not expose the arbitrary native table, header,
row and cell attribute/ref hooks needed by AdaptTable's model. `ProseTable` also
places fallthrough attributes on an outer wrapper rather than the table.
Therefore this adapter uses a native table root with Nuxt's stateless Prose
parts, instead of adapting either high-level component with a second engine or
moving semantic attributes to a different target.

Each table installs a scoped `UApp` with the table's direction, while preserving
the application's top-level Nuxt UI setup. This matters because `USelect`
derives its direction from the provider rather than an arbitrary trigger
attribute. Public element refs are released and reassigned when their callback
owner changes, without remounting the control.

Compact density changes Nuxt UI's actual control size to `sm`, reduces the
desktop Prose cell padding and type size, and reduces mobile card-body and field
spacing. Comfortable density restores the toolkit defaults. Touch buttons retain
their 44px minimum height in either density.
The adapter stylesheet declares its compact utility classes with Tailwind's
`@source inline`, so packaged consumers receive that paint without depending on
their application to scan the adapter's JavaScript.

Input and Select merge `focusRef` and `attrs.ref` into one memoized set of native
owners. Identical callbacks are invoked once; moving the same callback between
channels or rerendering with the same owners does not release it. When membership
changes, all previous owners are released before the next owners acquire the
target.

Applications that own all layout and body rendering can use the headless
`@adapttable/vue` binding directly; the shared outer surface is not required.

## Control and styling targets

- Buttons use `UButton`. Semantic attributes, actions and classes reach its
  interactive button.
- Text, numeric, date and search fields use `UInput`. Part markers and labels
  reach the input. AdaptTable's input class hook is passed through `ui.base`.
  Focus integration uses the documented `inputRef` exposure.
- Single-choice controls use `USelect`. Classes, part markers and accessible
  names reach the combobox trigger. Focus integration uses its public
  `triggerRef`. Its options remain inside the current overlay/fullscreen root.
  Empty-string choices use a local numeric presentation key; callback values
  remain the original model strings.
- Boolean fields use `UCheckbox`. Semantic attributes and `ui.base` classes
  reach the checkbox button; Nuxt UI owns its surrounding label and root.
  `class`/`ui.root` style that surrounding root instead. Nuxt UI 4.11.3 does not
  expose the checkbox's inner button ref. An eager checkbox focus-ref contract
  cannot be implemented with that component's current public API. Both selection
  and filter checkbox adapters reject a non-null `attrs.ref` before rendering,
  rather than invoking it with a component instance. Empty refs are stripped.
- The overlay mapping is Nuxt UI's non-modal `UPopover`, and `USlideover` with its
  real overlay and modal focus handling. `USlideover` exposes an `ui.overlay`
  class hook, but no public overlay attribute/ref hook. A decorative backdrop
  part marker is therefore unsupported; no substitute marker is fabricated.

Controlled input requests are repainted through Nuxt UI's public `modelValue`
prop after the host callback. Rejected requests preserve the same input node and
focus. The adapter does not mutate vendor DOM, take over focus traps or own table
state.

## Upstream references

- [Nuxt UI 4.11.3 source](https://github.com/nuxt/ui/tree/v4.11.3)
- [MIT license](https://github.com/nuxt/ui/blob/v4.11.3/LICENSE.md)
- [Nuxt UI 4 unification](https://ui.nuxt.com/docs/releases/v4.0.0)
- [Input](https://ui.nuxt.com/docs/components/input),
  [Select](https://ui.nuxt.com/docs/components/select),
  [Checkbox](https://ui.nuxt.com/docs/components/checkbox)
