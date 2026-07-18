# @adapttable/i18n

[![AdaptTable i18n — switch to Arabic and the whole table mirrors RTL](https://orwa-mahmoud.github.io/adapttable/media/demo-rtl.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-rtl.mp4)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)**

Locale presets and **RTL** helpers for [AdaptTable](https://github.com/orwa-mahmoud/adapttable).
The core stays i18n-agnostic; this optional package gives you ready label
sets for **10 languages** — English, Arabic, German, Spanish, French,
Hebrew, Italian, Japanese, Portuguese, and Chinese — plus direction
utilities, so you get multilingual, right-to-left support for free.

```bash
pnpm add @adapttable/i18n
```

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

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © Orwa Mahmoud
