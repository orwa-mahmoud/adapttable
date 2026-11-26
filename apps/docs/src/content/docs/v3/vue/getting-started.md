---
title: "Get started with Vue tables (v3)"
description: Build an Vue table with native controls, reactive sources, optional
  features, controlled state and SSR lifecycle rules.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Get
      started with Vue
      tables","item":"https://adapttable.orwamahmoud.com/v3/vue/getting-started/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/getting-started.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/getting-started.png
slug: v3/vue/getting-started
---

The Vue integration provides reactive data sources, a headless
table controller and adapters for Vue Unstyled, Element Plus, Vuetify, Naive UI,
Reka UI, shadcn-vue, Nuxt UI and Quasar. They share AdaptTable's framework-neutral
engine, with Vue-native refs, renderers, effect scopes and component lifecycles.
Each adapter supplies its own controls; the binding owns the table model.

## Availability and scope

The Vue binding, Unstyled adapter and all seven styled adapters are public
packages. Install the native kit in your Vue application:

```sh
pnpm add @adapttable/vue-unstyled vue@^3.5.0
```

The adapter installs the matching binding and core automatically. Add
`@adapttable/vue` directly if your application imports its composables or types.
No repository checkout or workspace build is needed.

Use Node.js `>=22.12.0`. The binding requires Vue `^3.5.0`; adapters can require
a newer Vue patch through their UI-kit peers. Choose a styled kit below for its
installation command, required styles and application providers.

The native table includes search, sorting and multi-sort, paged or infinite
loading, row selection, responsive mobile cards, grouped column headings,
controlled column layout and loading/error states. Optional native features add
filters and header filters, cell/row/batch editing, grouping, tree data, row
details and nested tables, resizing, row presentation and actions, density,
fullscreen and Saved Views. The [Vue feature guide](/v3/vue/features/) lists their
imports, signatures and composition boundaries.

The binding also exposes typed renderer, model and structural Chrome contracts
for adapter authors. Every interactive control belongs to its kit. Use native
factories from `@adapttable/vue-unstyled` feature subpaths with the native table;
binding-only factories require the corresponding adapter slots.

The seven styled adapters expose the same 41 canonical feature factories, with
kit-specific controls, and every one exports `standardFeatures()` from its
`/preset` entry, an assistant surface from `/assistant` and a controlled
`PivotPanel` from `/pivot`. Every Vue kit exports an optional `/features` barrel
with its own native factories. See the [adapter entry map](/v3/vue/features/#styled-adapter-feature-entries)
for writer and presentation boundaries. Compose standard Unstyled controls with `standardFeatures()`
from `@adapttable/vue-unstyled/preset`, or choose individual feature entries.

For strict template checking, use Vue tooling with `strictTemplates: true`.
If your template checker restricts custom data attributes, its
`vueCompilerOptions.dataAttributes` can include `"data-*"` for the documented
semantic hooks. Row types, renderer props and selection model events remain
checked in both directions.

### Strict dependency type checking

`strict: true` checks application types. Separately, `skipLibCheck: false`
also checks dependency declaration files. A successful Vite build does not
prove that either type check passed.

The 2026-10-15 packed-package audit found unresolved declaration errors in
these vendor versions with Vue 3.5.44, TypeScript 6.0.3 and vue-tsc 3.3.12:

| Vendor              | Remaining errors with dependency checking enabled                                               |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Element Plus 2.14.7 | Vue `GlobalComponents` constraints and a recursive `h` declaration.                             |
| Nuxt UI 4.12.0      | Nuxt schema/tooling dependencies, h3 declarations and theme variant constraints.                |
| Vuetify 4.2.6       | Vue `GlobalComponents` constraints and a conflicting DOM `ViewTransition.finished` declaration. |

Each case reproduces with vendor-only imports, without importing AdaptTable.
Every public AdaptTable entry in these three kits passes a separate strict
declaration check. TypeScript 5.9.3 did not resolve the vendor failures either.
These results do not establish a fully passing dependency-type gate for the
three host applications; projects requiring that gate should wait for a
verified compatible vendor release.

Before diagnosing an upstream error, complete the host configuration:

* Nuxt UI needs generated theme aliases and Vite generation before type
  checking; follow the [Nuxt UI setup](/v3/vue/nuxt-ui/#application-setup).
* If an explicit `compilerOptions.types` list excludes Bluetooth globals
  needed by VueUse declarations, install `@types/web-bluetooth` and add
  `"web-bluetooth"` to that list.
* Element Plus 2.14.7's VueUse 15 declarations reference Temporal. With
  TypeScript 6, include `"ESNext.Temporal"` alongside the application's other
  `lib` entries. Its root declarations also reference Vue Router types;
  install `vue-router@^4` when importing that entry. Adding a type library
  does not add a runtime polyfill or require enabling router integration.

Those setup corrections remove missing-type errors but do not repair the
vendor declaration conflicts listed above. Keep dependency checking enabled
when validating a fix; do not treat `skipLibCheck: true`, broad ambient module
shims or an index signature added to Vue's global component registry as
evidence that these errors are resolved.

## Choose a UI kit

Use the table and its feature factories from the same adapter. For example,
`DataTable` from `@adapttable/nuxt-ui` pairs with
`@adapttable/nuxt-ui/command-palette`; a binding-only factory does not supply
Nuxt controls. Switching adapters does not transfer ownership of row data or
create a second query, selection or editing engine.

| Adapter package            | Application setup                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@adapttable/vue-unstyled` | Native HTML controls; no stylesheet or UI-kit provider.                                                                                            |
| `@adapttable/element-plus` | Element Plus theme CSS and the adapter's `/styles.css`; use Element Plus configuration for locale and SSR providers.                               |
| `@adapttable/vuetify`      | Register Vuetify, provide its application context, and load `vuetify/styles` plus the adapter's `/styles.css`.                                     |
| `@adapttable/naive-ui`     | Load the adapter's `/styles.css`; configure Naive UI's theme and locale providers as needed. Collect Naive UI styles when rendering on the server. |
| `@adapttable/reka-ui`      | Load the adapter's `/styles.css`; the adapter uses Reka primitives.                                                                                |
| `@adapttable/shadcn-vue`   | Load the adapter's `/styles.css` and provide shadcn theme tokens. The package includes its licensed, copied controls and compiled CSS.             |
| `@adapttable/nuxt-ui`      | Use Nuxt UI's module in Nuxt, or its official Vite and Vue plugins in a plain Vue app; load theme CSS and provide `UApp`.                          |
| `@adapttable/quasar`       | Register Quasar and load Quasar CSS plus the adapter's `/styles.css`; configure Quasar's locale and RTL support.                                   |

Install your chosen adapter and its UI-kit peers, then follow its setup guide:

| Kit          | Install in your Vue application                                     | Setup                             |
| ------------ | ------------------------------------------------------------------- | --------------------------------- |
| Element Plus | `pnpm add @adapttable/element-plus element-plus@^2.14.7 vue@^3.5.0` | [Element Plus](/v3/vue/element-plus/) |
| Vuetify      | `pnpm add @adapttable/vuetify vuetify@^4.2.4 vue@^3.5.0`            | [Vuetify](/v3/vue/vuetify/)           |
| Naive UI     | `pnpm add @adapttable/naive-ui naive-ui@^2.45.3 vue@^3.5.0`         | [Naive UI](/v3/vue/naive-ui/)         |
| Reka UI      | `pnpm add @adapttable/reka-ui reka-ui@^2.11.0 vue@^3.5.0`           | [Reka UI](/v3/vue/reka-ui/)           |
| shadcn-vue   | `pnpm add @adapttable/shadcn-vue reka-ui@^2.11.0 vue@^3.5.0`        | [shadcn-vue](/v3/vue/shadcn-vue/)     |
| Nuxt UI      | `pnpm add @adapttable/nuxt-ui @nuxt/ui@^4.11.3 vue@^3.5.18`         | [Nuxt UI](/v3/vue/nuxt-ui/)           |
| Quasar       | `pnpm add @adapttable/quasar quasar@2.34.0 vue@^3.5.0`              | [Quasar](/v3/vue/quasar/)             |

Each package README also contains its peer versions and complete host setup.
Use a Vue version compatible with every UI kit in your application.

A component's SSR support does not replace the UI kit's application pipeline.
Element Plus needs request-local ID/z-index providers and its teleport handling;
Naive UI needs CSS-render collection. Vuetify and Nuxt UI require host compilation
for their CSS or Vue SFC imports. For production Quasar SSR/SSG, use Quasar CLI
with Vite; its standalone Vite plugin does not support that mode. Keep identical
initial rows, IDs, locale, direction and responsive settings on server and client.

## First table

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/vue-unstyled";

interface Person {
  id: string;
  name: string;
  score: number;
}

const rows = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
  { id: "grace", name: "Grace", score: 20 },
]);
const selectedIds = shallowRef<string[]>([]);
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const rowKey = (person: Person) => person.id;
</script>

<template>
  <DataTable
    v-model:selected-ids="selectedIds"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :url-sync="false"
    table-label="People"
    :class-names="{ table: 'people-table', th: 'people-heading' }"
  />
</template>
```

A leaf column's `key` supplies the default accessor and caption. Add `accessor`
when the value does not come from that property path. Supply stable, unique row
IDs through `rowKey`. Replace the host's row array to publish changes; the table
never owns or mutates the data.

`v-model:selected-ids` accepts selection requests through `update:selectedIds`.
To inspect or reject a request, pass `:selected-ids` and handle
`@update:selected-ids` yourself. The same pattern applies to `columnLayout`/`update:columnLayout` and
`density`/`update:density`. Use `selectable` and `defaultSelectedIds` for local
selection. Initial defaults do not reset later user changes.

The kit supplies native controls and no stylesheet. Its `classNames` target
semantic table, card and control elements; ordinary class/style/listener
attributes fall through to the root. See the [Vue API](/v3/vue/api/#native-table)
for the complete prop, slot and class-name contracts.

## Add filters, editing and view controls

The setup below uses the same `Person` rows as the first table. Use its editable
columns and native feature array in that table, passing `:features="features"`.
The imports and row declarations are included so the setup is self-contained:

```ts
import { shallowRef } from "vue";
import type { ColumnDef } from "@adapttable/vue-unstyled";
import { filters } from "@adapttable/vue-unstyled/filters";
import { headerFilters } from "@adapttable/vue-unstyled/header-filters";
import { editing } from "@adapttable/vue-unstyled/editing";
import { densityChooser } from "@adapttable/vue-unstyled/density";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";

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
  { key: "name", header: "Name", sortable: true, editable: true },
  { key: "score", header: "Score", sortable: true },
];
const features = [
  filters<Person>([{ key: "name", type: "text", label: "Name" }]),
  headerFilters(),
  editing<Person>((row, key, value) => {
    rows.value = rows.value.map((item) =>
      item.id === row.id ? { ...item, [key]: value } : item
    );
  }),
  densityChooser(),
  savedViews({ storageKey: "people-views" }),
];
```

The host applies each edit; for a server write, return its promise and publish
the new rows when it succeeds. `rowEditing` requests one row patch on Save;
`batchEditing` stages multiple row patches until the shared Save action.
See [editing and persistence](/v3/vue/features/#editing-and-host-persistence) for
validation, conflict handling and undo/redo requirements.

Saved Views capture the state connected to the table's URL backend, including
filters and density. With `urlSync: false`, the fallback table source and
installed view features share an in-memory backend. Column layout participates when explicitly wired through
`useColumnLayoutUrlState` and its flush callback; selection, tree/detail
expansion and edit drafts are not captured. See
[what a view restores](/v3/vue/saved-views/#what-a-view-restores).

## Reactive sources and headless use

Use a source when you want to own fetching or share a table's query state with
other UI. The source is a readonly shallow ref. In script, read `source.value`;
a top-level ref is unwrapped automatically in a Vue template.

```ts
import { shallowRef } from "vue";
import { useDataTable, useFrontendData } from "@adapttable/vue";
import type { ColumnDef } from "@adapttable/vue";

interface Person {
  id: string;
  name: string;
}

// Run inside setup() or an explicitly owned effectScope().
const rows = shallowRef<readonly Person[]>([{ id: "ada", name: "Ada" }]);
const columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
const source = useFrontendData({ data: rows, columns, urlSync: false });
const table = useDataTable({
  source,
  columns,
  rowKey: (row: Person) => row.id,
});
const { rows: visibleRows, searchValue, setSearchValue } = table;

setSearchValue("Ada"); // Debounced input; table.setSearch commits immediately.
// visibleRows and searchValue remain reactive after destructuring.
```

Pass this source to the native table as `:source="source"`, or render your own
surface with `useDataTable`. A supplied source wins over `data` and owns query
state; the native table's fallback data source does not claim its URL namespace.

Reactive value inputs accept a plain value, a ref or a getter. Optional inputs
also accept refs/getters whose current value is `undefined`. Callbacks such as
`rowKey`, `getSearchText`, `refetch` and `onQueryChange` remain callbacks. To
replace callback identities reactively, pass a getter for the whole options
object. Never wrap a renderer in a getter just to make it reactive.

For remote rows, choose `useServerData` when the host performs requests and
publishes `rows`/`total`, or `useQuerySource` when an existing query composable
owns fetching and cancellation. See [source contracts](/v3/vue/api/#data-sources)
for request cancellation and query-library lifecycle rules.

## Cell and header content

The `cell` slot receives `{ row, rowIndex, column, value }`; `header` receives
`{ column, label, sortDir, sortIndex, toggleSort }`. A column's own `cell` or
`headerCell` renderer takes precedence over the corresponding table slot.
A custom header owns its sort control: invoke `toggleSort` if it should sort.
Keep the setup from the first table and replace its template with this one.

```vue
<template>
  <DataTable
    v-model:selected-ids="selectedIds"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
  >
    <template #cell="{ row, column, value }">
      <strong v-if="column.key === 'name'">{{ row.name }}</strong>
      <span v-else>{{ value }}</span>
    </template>
  </DataTable>
</template>
```

For typed value rendering, use `ColumnDef<Person, number>` with a numeric
accessor and renderer. For an SFC renderer, use `componentRenderer(Component,
propsMapper)` so required component props are checked. Heterogeneous table
slots retain the row type but use `unknown` for the column value.

## Responsive layout, URL state and SSR

The default mobile breakpoint is 768px. Source `paginationMode: "auto"` resolves
to paged on desktop and infinite on mobile. Set `forceMobile` explicitly when
you need a fixed surface. Supply the same responsive options to a separately
created source and table to keep their layout and paging behavior aligned.

URL synchronization defaults to enabled where a browser adapter is available.
Use `urlSync: false` for local-only state or distinct `urlKey` values for separate
tables. URL actions and namespace changes retain request-local state; no
app-global mutable table registry is used.

Call resource-owning composables during component setup or in an active
`effectScope()`. Component subscriptions, browser listeners and source request
commits start after mount, suspend under `KeepAlive` deactivation, and are
released on unmount. A manually created effect scope activates immediately;
its owner must call `stop()`. Custom feature `mount` callbacks run during feature
composition, so guard their external work with the supplied `active` ref.

Server component setup does not activate browser resources. Use the same initial
rows, labels, direction, URL state and `forceMobile` value during SSR and
hydration. The initial responsive surface is desktop unless explicitly forced.
For request-specific URL state, pass a request-local memory adapter seeded from
the incoming URL and reuse the seed on the client. A query library's own SSR and
`KeepAlive` policies remain that library's responsibility.

Continue with the [Vue feature guide](/v3/vue/features/) for composition examples,
the [Vue API reference](/v3/vue/api/) for component and adapter contracts, and the
[shared concepts](/v3/concepts/) for engine ownership.

## Scaffold a Vue/Vite table

Inside an existing plain Vue application, run:

```sh
npx @adapttable/cli init
```

The CLI detects all eight shipped Vue kits and defaults to Vue Unstyled when
no styled kit is declared. To choose one explicitly, use
`npx @adapttable/cli init --kit element-plus` (or `vue-unstyled`, `vuetify`,
`naive-ui`, `reka-ui`, `shadcn-vue`, `nuxt-ui`, `quasar`). Run the printed
install command, import `PeopleTable.vue` into your host, and call the generated
`installAdaptTable(app)` before mounting. The starter includes native sorting
and filtering. Existing generated files are preserved unless `--force` is given.

Nuxt UI and Quasar also generate `adapttable.vite.ts`: merge its configuration
into your host's Vite configuration using `mergeConfig`, keeping one Vue compiler
plugin. The generated setup owns the appropriate SDK plugins, native CSS and
Nuxt UI Tailwind inputs. Your host's `main.ts`, root component and Vite config
are not overwritten. See the [CLI setup guide](https://github.com/orwa-mahmoud/adapttable/tree/efd18cf92b4e11175f673269395687617e39c2de/packages/shared/cli#vuevite-setup).

The generated templates support plain Vue/Vite browser applications. A Nuxt
framework project is recognized but receives module setup guidance without
writing plain Vite provider files. Follow the Nuxt UI module documentation for
that environment, and Quasar CLI for Quasar SSR/SSG.

## Optional AI binding

Add `@adapttable/ai-vue` when your application needs an agent, conversation
or speech input:

```sh
pnpm add @adapttable/ai-vue
```

It requires Vue `^3.5.0`.
The base table and assistant UI entries remain usable without AI. See
[assistant and approvals](/v3/vue/assistant/). Assistant integration remains opt-in
after scaffolding the table.

## Explore a connected workspace

The [Vue Unstyled order workspace](/vue/demo/unstyled/workspace/) combines the
native adapter's controls in three small workflows:

* **Order desk:** search and filter twelve fictional orders, edit an owner, open a
  real native line-item table, group by region, select rows or a cell range, and
  export the chosen scope. Save a named filter/sort/grouping/density view for a later
  visit, then rename, apply or delete it using the native management panel. The assistant uses a local script over the real agent
  and approval flow; it does not connect to a model or a provider account.
* **Dispatch plan:** expand delivery runs, select loaded descendants, reorder
  within a run, and inspect a pickup manifest whose consecutive desktop cells
  share a window. Mobile cards repeat each delivery's fields.
* **Revenue review:** inspect grouped totals, an amount-minus-cost formula,
  fictional sparklines and a configurable pivot derived from the same orders.

The workspace supports English and Arabic, responsive cards, a dark appearance,
keyboard controls and a pause/resume flow. All data is fictional and all writes
stay in the browser. Authored orders use this tab’s session storage; named views
use browser storage when available and survive a later visit. Restore sample data resets the order desk;
the dispatch plan is rebuilt from the restored Ready orders. Reloading and retry restore authored changes and selections from this tab’s session storage. Presentation, table queries and pivot choices remain shareable in the URL. See the [feature guide](/v3/vue/features/) for the supported APIs and composition
boundaries.
