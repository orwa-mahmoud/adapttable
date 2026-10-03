# Taiga UI for Angular

`@adapttable/taiga-ui` is a private adapter under development. It is not published
on npm. It renders the Angular binding's table and feature slots with Taiga UI
5.26.0. Taiga UI is Apache-2.0; the adapter source is MIT.

## Setup

Use Angular 22, Taiga UI's matching 5.26.0 core/kit/cdk/i18n/styles packages,
and their published peers. Configure Taiga icon assets at
`assets/taiga-ui/icons`, or supply your application's Taiga icon resolver.
Your build must support Less.

Register `provideAdaptTaiga()` from `@adapttable/taiga-ui` in your application's
bootstrap providers. It enables Taiga's event plugins and stable options without
writing theme attributes to `document.body`, disabling scrollbars globally, or
adding document metadata. Use `AdaptTaigaRoot` for the scoped theme instead.

In a workspace checkout, link the private `@adapttable/taiga-ui` and
`@adapttable/angular` packages. Use Taiga 5.26.0 core/kit/cdk/i18n/styles and
icons, the styles package's design-tokens dependency, Angular 22
common/core/forms/router/platform-browser and CDK peers, and RxJS 7.
Copy `@taiga-ui/icons/src` to the application's `assets/taiga-ui/icons` folder.
The adapter compiles its scoped Less theme; do not add a document-wide Taiga reset.

Merge these providers into the config passed to `bootstrapApplication`:

```ts
import type { ApplicationConfig } from "@angular/core";
import { provideAdaptTaiga } from "@adapttable/taiga-ui";
import { TUI_ASSETS_PATH } from "@taiga-ui/core";

export const appConfig: ApplicationConfig = {
  providers: [
    ...provideAdaptTaiga(),
    { provide: TUI_ASSETS_PATH, useValue: "assets/taiga-ui/icons" },
  ],
};
```

The table includes a nested-safe Taiga root. This complete host wraps its table
in `AdaptTaigaRoot` so standalone panels can share the same theme and portal host:

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable, AdaptTaigaRoot } from "@adapttable/taiga-ui";
import { filters } from "@adapttable/taiga-ui/filters";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "people-table",
  standalone: true,
  imports: [AdaptDataTable, AdaptTaigaRoot],
  template: `
    <adapt-taiga-root theme="dark" dir="rtl">
      <adapt-data-table
        [data]="people"
        [columns]="columns"
        [rowKey]="rowKey"
        [features]="features"
        [urlSync]="false"
        tableLabel="People"
      />
    </adapt-taiga-root>
  `,
})
export class PeopleTable {
  readonly people: Person[] = [{ id: "1", name: "Ada" }];
  readonly columns: ColumnDef<Person>[] = [
    {
      key: "name",
      header: "Name",
      accessor: (row) => row.name,
      sortable: true,
    },
  ];
  readonly rowKey = (person: Person) => person.id;
  readonly features = [filters<Person>([{ key: "name", type: "text" }])];
}
```

The component's `theme` and `dir` inputs also accept `light` and `ltr`.
It accepts projected children or a `content` template for dynamically mounted
applications. Only the Taiga root receives Taiga's scoped theme mixin; no
application-wide reset or global theme variables are installed.

## Controls and feature parity

The adapter supplies Taiga buttons, checkbox inputs, text fields, textarea,
select/list controls, skeletons, dropdowns, modal dialogs, and drawers. Native
hosts retain Angular refs, accessibility attributes, and shared public part
names. The headless binding continues to own state, labels, URL serialization,
announcements, feature models, and host write callbacks.

The feature-entry inventory matches Angular unstyled, including filtering,
header filters, columns, editing and history, bulk actions, grouping, pivot,
row operations, saved views, virtualized rows, mobile cards, keyboard navigation,
context menus, command palette, assistant controls, and approval prompts.

Filter popovers are nonmodal Taiga dropdowns. Drawers have Taiga's real backdrop
and trapped keyboard focus. An Escape dismissal restores the opener. Themed
controls use logical spacing and the same desktop/mobile structure as the
Angular binding. Public `classNames` hooks remain available.

## Development status

The source includes behavior, conformance, SSR, and native-control contract
fixtures. Full integration compilation, coverage, and browser acceptance are
required before release. npm publication is a separate release step.

See the [package README](https://github.com/orwa-mahmoud/adapttable/tree/main/packages/angular/adapter-taiga-ui)
for the full entry inventory and workspace setup.
