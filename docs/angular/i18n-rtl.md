# Angular table localization and RTL

Table labels, row values and text direction are separate inputs. Pass translated
`labels`, set `dir`, and resolve locale-dependent column paths with the Angular
binding. Set the HTML language on the surrounding page or host for assistive
technology.

## Switch between English and Arabic

```ts
import { Component, computed, signal } from "@angular/core";
import { resolveColumns, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import { getDirection, getLabels } from "@adapttable/i18n";

interface Person {
  id: string;
  names: { en: string; ar: string };
}

@Component({
  selector: "localized-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <button type="button" (click)="locale.set('en')">English</button>
    <button type="button" (click)="locale.set('ar')">العربية</button>
    <adapt-data-table
      [data]="people"
      [columns]="columns()"
      [rowKey]="rowKey"
      [labels]="labels()"
      [dir]="direction()"
      [attr.lang]="locale()"
      [tableLabel]="locale() === 'ar' ? 'الأشخاص' : 'People'"
    />
  `,
})
export class LocalizedPeopleTable {
  readonly locale = signal<"en" | "ar">("en");
  readonly people: Person[] = [
    { id: "ada", names: { en: "Ada Lovelace", ar: "آدا لوفليس" } },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly labels = computed(() => getLabels(this.locale()));
  readonly direction = computed(() => getDirection(this.locale()));
  readonly columns = computed(() => {
    const locale = this.locale();
    const definitions: ColumnDef<Person>[] = [
      {
        key: "name",
        header: locale === "ar" ? "الاسم" : "Name",
        i18n: { en: "names.en", ar: "names.ar" },
        sortable: true,
        sortValue: (row) => row.names[locale],
        exportValue: (row) => row.names[locale],
      },
    ];
    return resolveColumns(definitions, locale);
  });
}
```

The kit shell has `labels` and `dir` inputs, **not a `locale` input**.
`resolveColumns` fills the accessor for each locale-dependent data path.
An explicit accessor remains your responsibility; the binding does not
replace it. Keep the column key stable when translating the caption.

With a custom source or headless table, `injectFrontendData` and
`injectDataTable` also accept a locale value or signal. Pass the same locale
to the source and renderer when their value resolution depends on it.

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
multiple translations. On a server source, pass the locale through your
application's request contract and let the server implement localized search.

## Direction across the complete table

`dir="rtl"` reaches table/card structure and kit overlays. Logical pin sides
`"start"` and `"end"` follow direction. Grid Left/Right keys follow the
screen's visual direction; Home remains the start of the row. Use logical
CSS properties such as `margin-inline-start` and `padding-inline-end` in
custom renderers.

The NG-ZORRO kit keeps direction local to its table and portalled controls.
For other NG-ZORRO widgets in your host application, configure their own
localization as needed; AdaptTable labels do not translate unrelated widgets.

Sparkline chronology intentionally remains left-to-right. Numeric data should
not reverse merely because the surrounding language reads right-to-left.

Test translated labels, long captions, nested selects, drawers, pinned columns,
card actions and keyboard movement together. Direction alone does not translate
the words, and translated words alone do not mirror the layout.

See [Columns](./columns.md), [Mobile cards](./mobile.md),
[Customization](./customization.md), [Accessibility](./accessibility.md) and
the shared [localization reference](../i18n-rtl.md).
