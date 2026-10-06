# @adapttable/shadcn-vue

shadcn-vue presentation for AdaptTable's headless Vue binding. Table state,
feature lifetimes, query ownership, and structural Chrome belong to
`@adapttable/vue`; this package supplies copied, licensed shadcn-vue controls.

## Usage

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef } from "@adapttable/shadcn-vue";
import { densityChooser } from "@adapttable/shadcn-vue/density";
import "@adapttable/shadcn-vue/styles.css";

interface Person {
  id: string;
  name: string;
  score: number;
}
const data: readonly Person[] = [{ id: "ada", name: "Ada", score: 42 }];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const features = [densityChooser()];
</script>

<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    selectable
  />
</template>
```

The table uses the shared generic Vue props and slots. Search, sorting,
pagination, selection, density, row identity, and source ownership stay in the
binding. Desktop output is a semantic table. Mobile output uses shadcn Card
components with article, definition-list, and selection semantics. Set `dir="rtl"`
for right-to-left layout, or `forceMobile` to select the card presentation.

Controlled selection and density emit requests and retain the supplied value
until the host updates it. Compact density tightens card padding, field gaps,
and control spacing; narrow viewports retain 44px minimum button/input/select
heights. Classes in `classNames` are merged with the kit's
presentation classes; attributes and typed cell/header/footer slots are forwarded.

## Styles

Import `@adapttable/shadcn-vue/styles.css` once. The package ships compiled
utilities without Tailwind Preflight, so consumers do not need a Tailwind build.
The stylesheet reads the standard shadcn CSS tokens (`--background`,
`--foreground`, `--primary`, `--border`, `--input`, and `--ring`) and provides
neutral fallback colors. Portaled controls read tokens from their actual host.

## Component source

shadcn-vue distributes editable component source rather than an aggregate
runtime component package. This adapter vendors the New York v4 registry at
[b251d9fd](https://github.com/unovue/shadcn-vue/tree/b251d9fd92aa496495e127137a7734704fb34a29/apps/v4/registry/new-york-v4/ui).
Its components compose Reka UI. The copied Card and Skeleton components also provide mobile and loading paint.
The upstream MIT license is preserved in
`THIRD_PARTY_NOTICES.md`, which is included in the published package.

Local adaptations use relative utility imports, logical select icon spacing,
setup-owned semantic focus targets, controlled-value rejection reconciliation,
and the binding's required slot contracts. No kit imports another kit's controls.

## Semantic targets

- Button: caller attributes, part name, class, keyboard events, and focus ref
  reach the `button` rendered by the shadcn `Primitive`.
- Input: those attributes reach the actual input.
- Native Select: part name, class, label, disabled state, keyboard events, and
  focus ref reach the select. `hostClass` styles the decorative wrapper.
- Checkbox: part name, class, label, keyboard events, and focus ref reach the
  Reka checkbox button. Selection uses one model-update event per request.
  An indeterminate value is represented by `aria-checked="mixed"`.
- Popover: content is portaled without a backdrop; Reka owns Escape,
  outside-click dismissal, and focus behavior.
- Sheet: content and its real dimming overlay use the Reka Dialog primitives.

## Opt-in controls

Import `densityChooser` from `@adapttable/shadcn-vue/density` and `fullscreen`
from `@adapttable/shadcn-vue/fullscreen`. Both contribute only presentation to
the binding feature. Optional controls are absent until requested.
