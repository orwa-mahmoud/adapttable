# React table i18n & RTL — Arabic, Hebrew, 18 locales

▶ **See it working:** [flip the whole table to Arabic RTL in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/rtl/) — a real table you can interact with, not a recording.

AdaptTable is **i18n-agnostic at its core** — it never imports an i18n
library. Strings come in through a `labels` prop, so you can use your own
stack (i18next, react-intl, …) or the ready presets in `@adapttable/i18n`.

## Complete example

`labels` translates the chrome, `dir` flips the layout, and `locale` makes
per-column `i18n` data paths resolve — three independent props, one line each:

```tsx
import { DataTable } from "@adapttable/mantine";
import { filters } from "@adapttable/mantine/filters";
import { getDirection, getLabels } from "@adapttable/i18n";

type Person = {
  id: string;
  name: string;
  nameAr: string;
  department: { name: string };
  hiredAt: string;
};

const locale = "ar";

export function People({ data }: { data: Person[] }) {
  return (
    <DataTable
      data={data}
      columns={[
        {
          key: "name",
          header: "الاسم",
          i18n: { ar: "nameAr" },
          sortable: true,
        },
        { key: "department.name", header: "القسم" },
        { key: "hiredAt", header: "تاريخ التعيين", filter: "dateRange" },
      ]}
      rowKey={(r) => r.id}
      features={[filters([])]} // runs the column `filter` declarations
      locale={locale}
      labels={getLabels(locale)} // Arabic chrome strings
      dir={getDirection(locale)} // "ar" → "rtl"
    />
  );
}
```

## Bundled presets

The label sets below ship in `@adapttable/i18n`. `getLabels` prefers an
exact tag (`"zh-TW"` → Traditional Chinese), then the primary subtag
(`"ar-EG"` → Arabic, `"de-AT"` → German), and falls back to English for
unknown locales; `hasLocale(locale)` tells you whether a preset exists.

| Preset  | Language              | Direction |
| ------- | --------------------- | --------- |
| `en`    | English               | ltr       |
| `ar`    | Arabic                | rtl       |
| `de`    | German                | ltr       |
| `es`    | Spanish               | ltr       |
| `fa`    | Persian               | rtl       |
| `fr`    | French                | ltr       |
| `he`    | Hebrew                | rtl       |
| `hi`    | Hindi                 | ltr       |
| `it`    | Italian               | ltr       |
| `ja`    | Japanese              | ltr       |
| `ko`    | Korean                | ltr       |
| `pl`    | Polish                | ltr       |
| `pt`    | Portuguese            | ltr       |
| `ru`    | Russian               | ltr       |
| `tr`    | Turkish               | ltr       |
| `ur`    | Urdu                  | rtl       |
| `zh`    | Chinese (Simplified)  | ltr       |
| `zh-TW` | Chinese (Traditional) | ltr       |

## Per-column `i18n` data paths

`ColumnDef.i18n` maps locales to alternate data paths for the column's
**value**. The table `locale` picks the path — exact tag first, then its
primary subtag, then `key`:

```tsx
// Flat fields:
{ key: "nameEn", i18n: { ar: "nameAr" } }
// Nested objects:
{ key: "name.en", i18n: { ar: "name.ar" } }
```

The cell, the client-side sort, row grouping, and the column's declarative
filter all follow the resolved path, so searching, filtering and group
headers match what the user sees. Header **text** stays whatever you pass in `header` — translate it
through your label pipeline, not `i18n`.

## RTL

RTL is first-class. Pass `dir="rtl"` (or `dir={getDirection(locale)}`) and
the adapter applies it through its direction provider and logical CSS:

- Layout, alignment, and the filter drawer side flip automatically.
- Column pinning is logical: pins use `insetInlineStart`/`insetInlineEnd`,
  so a "left" pin sticks to the correct edge in RTL too.
- With `resizableColumns()` composed, column resizing is direction-aware:
  the handle sits on the column's inline-end edge, and dragging outward (or
  pressing the leading arrow key) widens the column in both LTR and RTL.

Helpers from `@adapttable/i18n`:

- `getDirection(locale)` → `"ltr" | "rtl"`
- `isRtlLocale(locale)` — covers ar, he, fa, ur, ps, and more
- `RTL_LANGUAGES` — the raw list of RTL primary subtags
- `primarySubtag(locale)` — `"ar-EG"` → `"ar"`
- `locales` — every preset keyed by tag (`LocaleKey`); each preset is also a
  named export (`ar`, `de`, …, `zhTW` for `zh-TW`)

## Custom labels

`labels` accepts a partial `TableLabels`; missing keys fall back to the
English defaults. Count-and-range strings are functions, so any word order
works:

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  labels={{
    searchPlaceholder: "Search people…",
    noResults: "Nothing matches your filters",
    showing: ({ from, to, total }) => `${from}–${to} of ${total}`,
    pageOf: ({ page, total }) => `Page ${page} of ${total}`,
    selectedCount: (count) => `${count} selected`,
  }}
/>
```

Need a language without a preset? Spread one and override:

```ts
import { en } from "@adapttable/i18n";

const sw = { ...en, search: "Tafuta", noData: "Hakuna data" };
```
