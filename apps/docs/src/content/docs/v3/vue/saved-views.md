---
title: "Vue saved views and table preferences (v3)"
description: Save Vue table views, share URL state and configure density and
  fullscreen controls with native AdaptTable adapters.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Vue
      saved views and table
      preferences","item":"https://adapttable.orwamahmoud.com/v3/vue/saved-views/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/saved-views.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/saved-views.png
slug: v3/vue/saved-views
---

Capture named Vue table views, persist column layout explicitly, and compose density and fullscreen controls.

These examples use `@adapttable/vue-unstyled`. Import matching feature paths
from your selected adapter so its own kit renders the controls. See
[Vue installation and providers](/v3/vue/getting-started/).

```ts
import { densityChooser } from "@adapttable/vue-unstyled/density";
import { fullscreen } from "@adapttable/vue-unstyled/fullscreen";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";

const features = [
  densityChooser(),
  fullscreen(),
  savedViews({ storageKey: "people-views" }),
];
```

`densityChooser()` and `fullscreen()` return static features.
`density: TableDensity` is `"comfortable" | "compact"`.
`v-model:density` accepts `update:density`; a host that ignores a controlled
request keeps its value, and the native select restores that value.
`onDensityChange` is an optional observer called once for the request;
`defaultDensity` seeds local state. The root exposes effective `data-density`.

`useFullscreen(target, activity?)` from the binding root returns a computed
`FullscreenState`. The target accepts an element, ref or getter returning
`HTMLElement | null | undefined`. Browser listeners activate after mount.
Unsupported environments have no fullscreen control. The active container is
passed to kit overlays so filters can remain inside the fullscreen surface.
Fullscreen itself is browser state and is not saved in a view.

`savedViews(options: MaybeRefOrGetter<UseSavedViewsOptions>)` installs one
scope-owned model and native menu. Options require `storageKey`; optional
`storage` (null for memory only), `store: SavedViewsStore`, `visibility`,
`migrate`, `urlAdapter`, `urlSync` and `urlKey` configure persistence and the
captured table namespace. An explicit store replaces browser storage.
`flushViewState?: () => void` lets the host flush pending URL slices immediately
before saving or applying a view; the installed feature also flushes its own
table-owned writers.

`useSavedViews(options, activity?): UseSavedViewsResult` returns computed
`views` and `defaultView`, plus `save(name)`, `apply(name)`, `remove(name)`,
`rename(from, to)`, `move(name, -1 | 1)`, `setDefault(name)` and `reload()`.
`SavedView`, `SavedViewVisibility`, `SavedViewMigration`, `SavedViewsStore`
and `SAVED_VIEW_VERSION` describe the shared persisted format and migration
contract. Saving/applying through the installed feature flushes pending
feature state writes first.

`SavedViewsPanel` from the native entry takes `SavedViewsPanelProps`: `views`,
`onApply`, `onRename`, `onMove`, `onSetDefault`, `onRemove`, optional labels,
footer and class name. Connect these to `useSavedViews` for a separate
management surface. Adapter authors can render `SavedViewsPanelChrome` from
`@adapttable/vue/adapter` with `SavedViewsPanelChromeProps`, providing the
required `SavedViewsPanelSlots` controls. It coordinates row actions and rename
state while the supplied controls determine the appearance.

### What a view restores

Saved Views capture recognized URL parameters from their configured namespace.
For this Vue slice, the connected source can serialize pagination, search,
sort levels, filter extras/tree, grouping keys and group aggregate overrides.
Density participates when `densityChooser()` is installed. Uncontrolled data
pins participate with `rowPinning()`. Group collapse participates only when
explicitly wired to `useGroupCollapseUrlState`:

```ts
import {
  grouping,
  useGroupCollapseUrlState,
} from "@adapttable/vue-unstyled/grouping";

const collapse = useGroupCollapseUrlState({ urlKey: "people" });
const features = [
  grouping("team", {
    collapsedGroupIds: collapse.collapsedGroupIds,
    onCollapsedGroupIdsChange: collapse.onCollapsedGroupIdsChange,
  }),
];
// Use urlKey="people" on the table and its Saved Views configuration too.
```

`UseGroupCollapseUrlStateOptions` extends `UrlSliceOptions` with optional
reactive default IDs; `UseGroupCollapseUrlStateResult` is the ref/change pair
above. `useDensityUrlState(options?, activity?)` accepts
`UseDensityUrlStateOptions`, returning `UseDensityUrlStateResult` with a
`density` ref, `onDensityChange` and `flush`. `Density` aliases `TableDensity`;
`DENSITY_URL_WRITE_DEBOUNCE_MS` exposes the shared write delay.
`useRowPinningUrlState(options?)` accepts `UseRowPinningUrlStateOptions`
(`enabled`, adapter, sync and key) and returns
`UseRowPinningUrlStateResult` with pin state and its writer.

`useUrlSlice<T, TConfig>(options, spec, config, activity?)` is the generic
bridge: a readonly shallow `value` ref, `set(next)` and `flush()`.
`UrlSliceOptions` holds reactive adapter/key/sync and optional `serverSearch`
for hydration. Use the same adapter and key for related slices. If a table
uses a separately supplied source, align that source's URL backend/namespace
with the table and view controls, especially when URL sync is disabled and
memory adapters would otherwise be separate.

Column layout participates when the host explicitly binds
`useColumnLayoutUrlState` as shown below. Tree/detail expansion, selected IDs,
edit drafts/history, host rows, spans, extra content and appearance callbacks
are not captured. Controlled state remains authoritative: a saved URL value
cannot override an unchanged controlled prop. The shared codec recognizing
additional features' parameters does not install those features or make their
state reactive in Vue.

### Persist column layout explicitly

The binding root exports both layout-persistence composables. Neither is
installed automatically by `DataTable`.

```vue
<script setup lang="ts">
import { useColumnLayoutUrlState } from "@adapttable/vue";
import { DataTable, type ColumnDef } from "@adapttable/vue-unstyled";
import { resizableColumns } from "@adapttable/vue-unstyled/resizable-columns";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows: Person[] = [{ id: "ada", name: "Ada", score: 10 }];
const columns: ColumnDef<Person>[] = [{ key: "name" }, { key: "score" }];
const rowKey = (person: Person) => person.id;
const { layout, onLayoutChange, flush } = useColumnLayoutUrlState({
  urlKey: "people",
});
const features = [
  resizableColumns(),
  savedViews({ storageKey: "people-views", flushViewState: flush }),
];
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="features"
    :column-layout="layout"
    url-key="people"
    @update:column-layout="onLayoutChange"
  />
</template>
```

`useColumnLayoutUrlState(options?, activity?): UseColumnLayoutUrlStateResult`
accepts `MaybeRefOrGetter<UseColumnLayoutUrlStateOptions>`. The options extend
`UrlSliceOptions` with reactive optional
`defaultColumnLayout: Partial<ColumnLayoutState>`. The result contains a
readonly shallow `layout` ref, `onLayoutChange(next: ColumnLayoutState)` and
`flush()`. Persisted fields include hidden/order/widths/pinned/names and
collapsed column groups. `LAYOUT_URL_WRITE_DEBOUNCE_MS` exposes the shared
write delay; passing `flush` to Saved Views captures the latest resize and
prevents an older pending write from overwriting an applied view.

Use the same `urlAdapter` and `urlKey` on the layout composable, source/table
and Saved Views. For `urlSync: false`, provide a shared explicit memory adapter
when independently created components need the same state. To reject a layout
request, inspect the event before calling `onLayoutChange`; the table keeps the
supplied layout until the host accepts it. During SSR, seed a request-local
adapter and use the same initial state on the client.

For a browser preference that does not join URL/Saved Views, use:

```ts
import { useColumnLayoutStorageState } from "@adapttable/vue";

const { layout, onLayoutChange } = useColumnLayoutStorageState({
  storageKey: "people-column-layout",
  defaultColumnLayout: { hidden: ["score"] },
});
// Bind the same column-layout prop and update:column-layout event as above.
```

`UseColumnLayoutStorageStateOptions` requires reactive `storageKey` and accepts
reactive optional `storage: LayoutStorage` and `defaultColumnLayout`.
`useColumnLayoutStorageState(options, activity?)` returns
`UseColumnLayoutStorageStateResult`: a readonly shallow `layout` ref and
`onLayoutChange`. Default browser storage is discovered and read only after
mount; unavailable storage leaves an in-memory preference. SSR and the first
hydration render use the fallback layout. Changing storage/key switches the
destination; returning to the default removes its saved entry. This controller
does not automatically merge a storage preference with a URL layout. Choose
one authoritative layout owner, or define that precedence in the host.

### View-control contracts for adapters

`ViewControlPresentation` contains resolved labels, direction, optional class
names and container. `DensityControlProps`, `FullscreenControlProps` and
`SavedViewsControlProps` add the corresponding state/actions.
`DENSITY_CONTROL`, `FULLSCREEN_CONTROL` and `SAVED_VIEWS_CONTROL` are required
feature slot keys. `FULLSCREEN_MODEL` and `SAVED_VIEWS_MODEL` publish their
models in the table's state registry.

`DensityChooserChrome(props)` requires `DensityChooserSlots.Control`, receiving
attrs, current value, localized options and `onChange`.
`FullscreenButtonChrome(props)` requires Button, receiving
`ViewControlButtonProps` with semantic attrs and label.
`SavedViewsMenuChrome(props: SavedViewsMenuChromeProps)` requires
`SavedViewsMenuSlots`: Trigger, Button, Input and Panel. It owns disclosure,
keyboard and focus state; the kit draws each control/surface.

## Explore the implementation

Use the [Vue live demo](https://adapttable.orwamahmoud.com/vue/demo/) to switch
adapters and the [Vue Feature Lab](https://adapttable.orwamahmoud.com/vue/demo/all-options/)
to compose features. The [feature index](/v3/vue/features/) lists native imports and
[API reference](/v3/vue/api/) documents the binding and controlled contracts.
