# Taiga UI for Angular

`@adapttable/taiga-ui` renders the Angular binding's table and feature slots
with Taiga UI 5.26.0. The kit is available on npm.
Keep the kit and binding releases compatible with their declared dependencies. Taiga UI is Apache-2.0;
the adapter source is MIT.

## Setup

Use Angular 22, Taiga UI's matching 5.26.0 core/kit/cdk/i18n/styles packages,
and their published peers. Configure Taiga icon assets at
`assets/taiga-ui/icons`, or supply your application's Taiga icon resolver.
Your build must support Less.

Register `provideAdaptTaiga()` from `@adapttable/taiga-ui` in your application's
bootstrap providers. It enables Taiga's event plugins and stable options without
writing theme attributes to `document.body`, disabling scrollbars globally, or
adding document metadata. Use `AdaptTaigaRoot` for the scoped theme instead.

Install in an existing Angular 22 application:

```sh
npm install @adapttable/taiga-ui @adapttable/angular @taiga-ui/core@5.26.0 @taiga-ui/kit@5.26.0 @taiga-ui/cdk@5.26.0 @taiga-ui/i18n@5.26.0 @taiga-ui/styles@5.26.0 @taiga-ui/icons@5.26.0 @taiga-ui/event-plugins@^5 @taiga-ui/design-tokens@~0.320.0 @angular/cdk@^22 @angular/forms@^22 @angular/router@^22 rxjs@^7.8.2
npm install --save-dev less@^4
```

Keep Angular Common, Core and Platform Browser on compatible Angular 22
versions. Configure the host build to process Less and copy
`node_modules/@taiga-ui/icons/src` to `assets/taiga-ui/icons` in its output.
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

The internal `ɵAdaptTaigaDropdownLabel` export links secondary entries to the
directive that names Taiga's actual freeform popup host. Applications should use
the documented feature factories rather than this internal compatibility helper.

## Release verification

The source includes behavior, conformance, SSR, and native-control contract
fixtures. Full integration compilation, coverage, and browser acceptance are
required before release. npm publication is a separate release step.

See the [package README](https://github.com/orwa-mahmoud/adapttable/tree/main/packages/angular/adapter-taiga-ui)
for the full entry inventory and application setup.
