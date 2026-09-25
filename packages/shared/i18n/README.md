# @adapttable/i18n

[![AdaptTable i18n — switch to Arabic and the whole table mirrors RTL](https://adapttable.orwamahmoud.com/media/features/rtl.gif)](https://adapttable.orwamahmoud.com/react/demo/mantine/rtl/)

**[📖 Documentation](https://adapttable.orwamahmoud.com/)** · **[🚀 Live demo](https://adapttable.orwamahmoud.com/react/demo/)** · **[Get started](https://adapttable.orwamahmoud.com/react/getting-started/)**

Locale presets and **RTL** helpers for [AdaptTable](https://github.com/orwa-mahmoud/adapttable).
The core stays i18n-agnostic; this optional package gives you ready label
sets for **18 languages** — English, Arabic, German, Spanish, Persian,
French, Hebrew, Hindi, Italian, Japanese, Korean, Polish, Portuguese, Russian,
Turkish, Urdu, Simplified Chinese, and Traditional Chinese — plus direction
utilities, so you get multilingual, right-to-left support for free.

```bash
pnpm add @adapttable/i18n
```

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

## Usage

```tsx
import { DataTable, useFrontendData } from "@adapttable/mantine";
import { getLabels, getDirection } from "@adapttable/i18n";

function LocalizedTable({ locale }: { locale: string }) {
  const source = useFrontendData({ data, columns });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      labels={getLabels(locale)} // primary subtag → preset; unknown → English
      dir={getDirection(locale)} // "ar" / "he" → "rtl"
    />
  );
}
```

## API

- `getLabels(locale)` — the label preset for a locale (matches the primary
  subtag, e.g. `"de-AT"` → German); falls back to English.
- `getDirection(locale)` → `"ltr" | "rtl"`.
- `isRtlLocale(locale)` / `primarySubtag(locale)` / `RTL_LANGUAGES`.
- Raw preset objects: `en`, `ar`, `de`, `es`, `fr`, `he`, `it`, `ja`, `pt`,
  `zh`. `locales` — the keyed map; `hasLocale(locale)` — membership check.

Bring your own languages by spreading a preset and overriding strings:

```ts
import { en } from "@adapttable/i18n";
const fr = { ...en, search: "Rechercher", noData: "Aucune donnée" };
```

## Features

- **Ready label sets** for English and Arabic — every string the table renders.
- **RTL** — pair `ar` with `dir="rtl"` and the whole table mirrors: column order, filter
  panel, column menu, pagination and chips, not just the text.
- **Column-level i18n** — map a column to a localized field with `i18n: { ar: "…" }` so
  sorting and filtering follow the translated value.
- **Bring your own stack** — the core is i18n-agnostic; use these sets, or pass a `t`
  function from i18next, FormatJS or anything else.
- Covers every feature's strings: filtering, selection, row expansion, cell editing,
  row grouping, column management, saved views, CSV export and pagination.

## See it work

Every clip is the same table under an Arabic locale — the whole UI mirrors, not just the labels.

**Selection + bulk actions** — select-all and act on the selection, in Arabic

![selection](https://adapttable.orwamahmoud.com/media/features/parts/selection.gif)

**Inline cell editing** — editors open and commit under RTL

![cell-editing](https://adapttable.orwamahmoud.com/media/features/parts/cell-editing.gif)

**Row grouping** — group headers carry Arabic labels and subtotals

![row-grouping](https://adapttable.orwamahmoud.com/media/features/parts/row-grouping.gif)

**Filtering** — the filter panel mirrors; chips read right-to-left

![filtering](https://adapttable.orwamahmoud.com/media/features/parts/filtering.gif)

**Column management** — the column menu mirrors with the table

![column-management](https://adapttable.orwamahmoud.com/media/features/parts/column-management.gif)

## Documentation

[Getting started](https://adapttable.orwamahmoud.com/react/getting-started/) · [Live demo](https://adapttable.orwamahmoud.com/react/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://adapttable.orwamahmoud.com/react/comparison/)

- **Data** — [client vs server tiers](https://adapttable.orwamahmoud.com/data-tiers/) · [pagination & infinite scroll](https://adapttable.orwamahmoud.com/react/pagination/) · [URL-synced state](https://adapttable.orwamahmoud.com/react/url-state/)
- **Interaction** — [filtering](https://adapttable.orwamahmoud.com/react/filtering/) · [sorting](https://adapttable.orwamahmoud.com/react/sorting/) · [selection & bulk actions](https://adapttable.orwamahmoud.com/react/selection/) · [row expansion](https://adapttable.orwamahmoud.com/react/row-expansion/) · [inline cell editing](https://adapttable.orwamahmoud.com/react/cell-editing/)
- **Columns** — [show/hide · reorder · pin · resize](https://adapttable.orwamahmoud.com/react/column-management/) · [row grouping & aggregates](https://adapttable.orwamahmoud.com/react/row-grouping/) · [CSV export](https://adapttable.orwamahmoud.com/react/customization/#csv-export)
- **More** — [i18n & RTL](https://adapttable.orwamahmoud.com/react/i18n-rtl/) · [virtualization](https://adapttable.orwamahmoud.com/react/virtualization/) · [customization](https://adapttable.orwamahmoud.com/react/customization/) · [API](https://adapttable.orwamahmoud.com/react/api/) · [FAQ](https://adapttable.orwamahmoud.com/faq/)

## License

[MIT](../../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
