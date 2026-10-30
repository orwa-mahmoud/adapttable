# Vue table localization and RTL

Table labels, row values and text direction are separate props. Pass translated
`labels`, set `dir`, and set `locale` so columns that read by `i18n` path use
that locale's field. Set the HTML language on the surrounding page or host for
assistive technology.

## Switch between English and Arabic

```vue
<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type { ColumnDef } from "@adapttable/vue";
import { DataTable } from "@adapttable/vue-unstyled";
import { getDirection, getLabels } from "@adapttable/i18n";

interface Person {
  id: string;
  names: { en: string; ar: string };
}

const locale = shallowRef<"en" | "ar">("en");
const people: readonly Person[] = [
  { id: "ada", names: { en: "Ada Lovelace", ar: "آدا لوفليس" } },
];
const labels = computed(() => getLabels(locale.value));
const direction = computed(() => getDirection(locale.value));
const columns = computed((): ColumnDef<Person>[] => [
  {
    key: "name",
    header: locale.value === "ar" ? "الاسم" : "Name",
    i18n: { en: "names.en", ar: "names.ar" },
    sortable: true,
  },
]);
</script>

<template>
  <div :lang="locale">
    <button type="button" @click="locale = 'en'">English</button>
    <button type="button" @click="locale = 'ar'">العربية</button>
    <DataTable
      :data="people"
      :columns="columns"
      :row-key="(row: Person) => row.id"
      :locale="locale"
      :labels="labels"
      :dir="direction"
      :table-label="locale === 'ar' ? 'الأشخاص' : 'People'"
    />
  </div>
</template>
```

The table's `locale` picks each column's `i18n` path: the cells, the choices of
an `"auto"` select filter, search and sort all read the active locale's field.
An explicit accessor, `sortValue` or filter `getValue` still wins where a column
sets one. Keep the column key stable when translating the caption.

With a custom source or headless table, `useFrontendData` and `useDataTable`
also accept a locale value, ref or getter. Pass the same locale to the source
and renderer when their value resolution depends on it;
`resolveColumns(columns, locale)` resolves the paths for a renderer of your own.

## Labels and formatting

`@adapttable/i18n` is optional and framework-neutral. It exports ready locale
bundles such as `ar` and `en`, `getLabels`, `getDirection` and RTL helpers.
You may instead pass your application's own `TableLabels`. Missing labels
fall back to English, so provide all relevant labels for a fully localized
experience, including labels contributed by editing, filters and assistants.

Column headers, custom actions, validation messages, arbitrary card text and
domain-specific sparkline summaries are host content. Translate them in your
application. Format dates and numbers with your locale-aware formatter and
keep explicit raw `sortValue` / `exportValue` functions when formatted strings
would be ambiguous for operations.

Search text is also a host choice. A frontend source's `getSearchText` can
select the active-language fields; default row-value search may include
multiple translations. On the server tier, pass the locale through your
application's request contract and let the server implement localized search.

## Direction across the complete table

`dir="rtl"` reaches table and card structure and the kit's overlays, such as
the filters popover. Logical pin sides `"start"` and `"end"` follow direction.
Grid Left/Right keys follow the screen's visual direction. Use logical CSS
properties such as `margin-inline-start` and `padding-inline-end` in custom
renderers.

Each kit keeps direction local to its table and the controls it opens. Element
Plus, Naive UI and Quasar widgets elsewhere in your application take their own
locale and RTL configuration; AdaptTable labels do not translate unrelated
widgets. See [Vue installation and providers](./getting-started.md).

Test translated labels, long captions, nested selects, drawers, pinned columns,
card actions and keyboard movement together. Direction alone does not translate
the words, and translated words alone do not mirror the layout.

See [Mobile cards](./mobile-cards.md), [Filtering](./filtering.md),
[Navigation](./navigation.md) and the shared
[localization reference](../i18n-rtl.md).
