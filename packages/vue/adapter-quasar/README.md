# @adapttable/quasar

Quasar controls for AdaptTable's headless Vue binding. The Vue binding owns
state and feature behavior; Quasar supplies the interactive components.

## Application setup

The supported Vue range starts at 3.5.0. This package targets Quasar 2.34.0.
Register the Quasar plugin once and load both stylesheets in your application
entry:

```ts
import { createApp } from "vue";
import { Quasar } from "quasar";
import "quasar/dist/quasar.css";
import "@adapttable/quasar/styles.css";
import App from "./App.vue";

createApp(App).use(Quasar, { config: {} }).mount("#app");
```

For a plain Vue/Vite application, use Quasar's official Vite plugin and asset
transform configuration. The v2 plugin requires Vite 8, `@vitejs/plugin-vue` 6,
and Quasar 2.24 or newer:

```ts
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls } }), quasar()],
});
```

The same plugin configuration is needed for browser-like Vitest tests so
Quasar resolves its client build. Install Quasar into the test application;
components are not stubbed.

For production SSR/SSG, use **Quasar CLI with Vite**. Quasar explicitly does
not support SSR/SSG through its standalone Vite plugin. Component-level Node
SSR and hydration tests do not establish support for that unsupported build
mode. In a Quasar CLI application, let the CLI install Quasar and manage its
server context; do not install a second application instance.

## Optional assembled table

`DataTable` composes the binding's optional layout with Quasar-owned desktop
and mobile renderers. It keeps a single scroll container and consumes the
binding's prepared row order, column spans, selection state and callbacks.

```vue
<script setup lang="ts">
import { DataTable } from "@adapttable/quasar";
const rows = [{ id: "ada", name: "Ada" }];
const columns = [{ key: "name", header: "Name", sortable: true }];
</script>

<template>
  <DataTable :data="rows" :columns="columns" :row-key="(row) => row.id" />
</template>
```

The desktop renderer uses genuine `QCard`, `QTr`, `QTh` and `QTd` primitives
around an adapter-owned native table. Model attributes and refs reach that
actual table, row, header or cell. It does not use `QTable` or `QMarkupTable`:
those components do not publicly forward arbitrary attributes and refs to
their internal table. `QTable` also owns a separate data engine that is not
needed here. Mobile rows use `QCard` and `QCardSection` with list-item and
label/value semantics.

The adapter includes its own table presentation stylesheet, uses Quasar's
public theme colors, and draws select arrows through Quasar's documented SVG
icon API, without requiring an icon font for the adapter's controls. The app
still owns its Quasar stylesheet, language pack and RTL configuration.

For complete layout control, import the models and controllers directly from
`@adapttable/vue` and `@adapttable/vue/adapter` and provide your own renderer.
Neither `DataTable` nor its optional surface is required for headless usage.

## Control targets

The attribute contract follows the actual supported targets of each kit
component. Compound fields may have a separate presentation host.

- `QInput`: semantic attributes and both class hooks reach the native input
  or textarea. Styles use Quasar's public `inputStyle`; refs use `nativeEl`.
- `QSelect`: semantic attributes reach its actual native `input[role=combobox]`.
  Classes and presentation styles reach the Quasar field's label host. The
  focus ref resolves the native input through `HTMLLabelElement.control`,
  using Quasar's public `for` association. It never queries vendor classes.
- `QCheckbox`: attributes, styles, classes and refs reach Quasar's genuine
  keyboard-focusable `div[role=checkbox]`, including mixed-state ARIA. Its
  nested native form input is not the interactive contract target.
- `QBtn`: attributes, styles, classes and refs reach the native button.

Ref callbacks receive the actual target and `null` when their owner changes,
the native target changes, or the wrapper is disposed. Controlled model
requests use Quasar's public props/events; a rejected request is repainted
without replacing the focused element or mutating private DOM.

Quasar owns select keyboard interactions and its responsive menu/dialog
behavior. Direction and keyboard attributes are preserved. The application
should configure its Quasar language pack and RTL stylesheet as documented
by Quasar, alongside AdaptTable's localized labels.

## Upstream references

- [Quasar Vite integration](https://quasar.dev/start/vite-plugin/)
- [Quasar CLI SSR configuration](https://quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr/)
- [QInput](https://quasar.dev/vue-components/input/)
- [QSelect](https://quasar.dev/vue-components/select/)
- [QCheckbox](https://quasar.dev/vue-components/checkbox/)
- [Quasar RTL support](https://quasar.dev/options/rtl-support/)
- [Quasar MIT license](https://github.com/quasarframework/quasar/blob/dev/LICENSE)

Quasar is MIT licensed. The controls are tested against Quasar 2.34.0.

## Package formats

The root entry and the implemented `density`, `fullscreen`, `grouping`,
`filters`, `header-filters`, `editing`, and `batch-editing` entries provide ESM and CommonJS, each with matching TypeScript declarations.
The `styles.css` export is a separate stylesheet and is marked as a side effect
so bundlers retain its import. Package consumers are checked with Vue 3.5.0
and Vue 3.5.43 using the real Quasar 2.34.0 SDK.

## Control verification

From this workspace package, use `pnpm build`, `pnpm test`, `pnpm test:ssr`,
`pnpm test:coverage`, `pnpm typecheck`, and `pnpm lint`. The coverage script
keeps the package's existing coverage thresholds; the separate SSR command
runs against Quasar's server entry.

Run the client suite with `vitest run --config vitest.config.ts`. Run the
server suite separately with `ADAPTTABLE_QUASAR_SSR=1 vitest run --config
vitest.config.ts`; this deliberately resolves Quasar's server build and
supplies the actual SSR request context without browser globals.

The server suite checks `test/server-controls.html` against a fresh server
render. The client suite hydrates that same output, checks native-element
identity and warnings, and exercises a rejected controlled edit afterward.
After an intentional vendor markup update, regenerate the fixture with
`ADAPTTABLE_UPDATE_SSR_FIXTURE=1` on the server command and rerun both suites.
These low-level tests do not replace Quasar CLI SSR application verification.

## Filters and editing

Import `filters` from `@adapttable/quasar/filters` and `headerFilters` from
`@adapttable/quasar/header-filters`. The toolbar offers a QMenu popover or
QDialog side drawer; both reuse binding-owned field, checklist, and advanced
AND/OR tree models. `FilterHeaderControl` and `FilterHeaderRow` are available
for compact header layouts. Localized labels and explicit table direction
are forwarded to portaled controls.

Import `editing`, `rowEditing`, `batchEditing`, `editHistory`, and
`undoRedoButtons` from `@adapttable/quasar/editing`. QInput, QSelect, and
QCheckbox provide the editors. Shared models own validation, draft parsing,
conflict decisions, asynchronous saves, rollback, and history. Host rows are
never mutated by the adapter. Row or batch editing with history also requires
an `editing` callback for replay, as required by the binding.

Enter commits and Escape cancels when a select popup is closed. While it is
open, Quasar owns the popup's keyboard interaction. Pointer focus movement
within a QCheckbox remains in the same edit session; leaving the entire
control invokes the binding's blur action. Editor refs point to the actual
input or QCheckbox role host, including QSelect's responsive dialog target.

### Fullscreen and portals

Register Quasar's public `AppFullscreen` plugin in the host application when
combining `fullscreen()` with filters, selects, or menus:

```ts
import { AppFullscreen, Quasar } from "quasar";
app.use(Quasar, { plugins: { AppFullscreen } });
```

The binding still requests fullscreen for the actual table root. The official
plugin observes the browser's `fullscreenchange` event and keeps Quasar's
portals within that root. No document-wide fullscreen request or private
portal relocation is used. QSelect popups inside a QDialog remain in its
modal accessibility tree. Quasar has no public per-instance portal-container
prop, so arbitrary custom portal containers are not supported by these
surfaces. Register the plugin before requesting fullscreen.

The tests cover the real plugin with a standards-based Fullscreen API fixture,
including rejected requests, nested popups, and cleanup. Browser fullscreen
and visual acceptance still require a browser with native fullscreen support.
See [Quasar AppFullscreen](https://quasar.dev/quasar-plugins/app-fullscreen/),
[QMenu](https://quasar.dev/vue-components/menu/), and
[QDialog](https://quasar.dev/vue-components/dialog/) for host setup.
