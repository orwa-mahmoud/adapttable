# @adapttable/taiga-ui

Requires Node.js **22.22.3+ on Node 22, 24.15.0+ on Node 24, or Node 26+**, matching Angular 22.

Taiga UI controls for the headless Angular AdaptTable binding.

Available on npm. Install a compatible binding and kit release together; their
versions are independent and the kit declares its binding/core dependencies.

The adapter uses Taiga UI 5.26.0 (Apache-2.0), with Angular 22 and RxJS 7.
The adapter's own source remains MIT. No Taiga implementation code is vendored.

## Installation and host setup

Install the kit and its Taiga peers in an Angular 22 app:

```sh
pnpm add @adapttable/taiga-ui @adapttable/angular @taiga-ui/core@5.26.0 @taiga-ui/kit@5.26.0 @taiga-ui/cdk@5.26.0 @taiga-ui/i18n@5.26.0 @taiga-ui/styles@5.26.0 @taiga-ui/icons@5.26.0 @taiga-ui/design-tokens@~0.320.0 @taiga-ui/event-plugins@^5
```

For local source development, link `@adapttable/taiga-ui@workspace:*` and
`@adapttable/angular@workspace:*` from this monorepo. AdaptTable package
versions are independent; the adapter resolves its exact binding/core dependencies.

Use matching 5.26.0 versions of `@taiga-ui/core`, `@taiga-ui/kit`,
`@taiga-ui/cdk`, `@taiga-ui/i18n`, and `@taiga-ui/styles`, together with their
published peers. The styles package requires `@taiga-ui/design-tokens`.
Use `@taiga-ui/icons@5.26.0` and copy its `src` assets to your application's
`assets/taiga-ui/icons` destination, or configure Taiga's icon resolver.
Angular `common`, `core`, `forms`, `router`, `platform-browser`, and `cdk`
are required peers. Build tools must support Less.

Register `provideAdaptTaiga()` from `@adapttable/taiga-ui` in your application's
bootstrap providers. It enables Taiga's event plugins and stable options without
writing theme attributes to `document.body`, disabling scrollbars globally, or
adding document metadata. Use `AdaptTaigaRoot` for the scoped theme instead.

```ts
import { Component } from "@angular/core";
import { type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable, AdaptTaigaRoot } from "@adapttable/taiga-ui";
import { filters } from "@adapttable/taiga-ui/filters";
import { columnMenu } from "@adapttable/taiga-ui/column-menu";

type Person = { id: string; name: string };

@Component({
  selector: "people-table",
  imports: [AdaptDataTable, AdaptTaigaRoot],
  template: `
    <adapt-taiga-root theme="light" dir="ltr">
      <adapt-data-table
        [data]="people"
        [columns]="columns"
        [rowKey]="rowKey"
        [features]="features"
        tableLabel="People"
      />
    </adapt-taiga-root>
  `,
})
export class PeopleTable {
  readonly people: Person[] = [];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
  readonly rowKey = (person: Person) => person.id;
  readonly features = [filters(), columnMenu()];
}
```

`AdaptDataTable` includes its own nested-safe Taiga root. An outer `AdaptTaigaRoot`
lets optional assistant windows, pivot panels, and other standalone slots share
one portal host and theme. It accepts projected children or a `content` template
for dynamic framework hosts. Set `theme` to `light` or `dark` and `dir` to `ltr`
or `rtl`; without an explicit theme, the wrapper follows the showcase's dark
page selector.

## Native controls and overlays

- `TuiButton`, `TuiCheckbox`, `TuiInput`, `TuiTextarea`, and `TuiSelect` with
  `TuiDataList` fill the required Angular Chrome slots.
- `TuiDropdown` owns anchored menus and nonmodal filter popovers. It handles
  nested active zones, Escape, outside dismissal, focus, and stacking.
- `TuiPopup` and `TuiDrawer` provide the filter drawer and real backdrop; the
  adapter supplies localized headings and trapped keyboard focus.
- `TuiDialog` supplies the modal assistant sheet. `TuiSkeleton` supplies loading
  placeholders. Inputs and buttons retain their actual native-host references.
- The shared public `data-adapttable-part` and `classNames` contracts are
  preserved. Kit-owned internals use `data-taiga-part`; native-only fallback
  part names are intentionally not advertised as shared contracts.

## Features

- **Feature composition** through individual kit subpaths, `/features` and
  `standardPreset()`; import only the behavior you need
- **Global search, sorting and pagination** for in-memory or host-fetched rows,
  with URL-synced state and mobile infinite scrolling
- **Filtering** with an AND/OR filter tree, header filters, custom filter types,
  removable chips and saved views
- **Column management** with visibility, ordering, pinning, resizing,
  multi-sort, fit-to-content and collapsible column groups
- **Selection and row actions**, including bulk actions, row expansion and
  nested tables using Angular templates or component renderers
- **Inline cell editing**, row and batch editing, validation, save/conflict
  feedback, dirty indicators, undo/redo and keyboard navigation with paste
  and range fill; writes always go through host callbacks
- **Row reordering and row pinning**, pinned summary rows,
  row and column spanning, full-width and separator rows, conditional row styling
  and heights
- **Grouping, aggregation and pivot**, tree data and row/column virtualization
- **Spreadsheet formula engine and sparkline columns** through the Angular
  binding's formula and sparkline entries
- **CSV and XLSX export**, PDF export and print layout, with optional custom
  writers and host print callbacks
- **Command palette and view controls**: find-in-table, context menus, side
  panel, density, fullscreen and status bar
- **Responsive mobile cards**, shared localized labels and RTL support;
  custom card renderers retain the selection, editing and action shell
- **Angular SSR and hydration** with deterministic initial data.
  React Server Components are a React-only integration, not an Angular feature
- **Optional assistant and approval controls** on `/assistant`, backed by the
  separately imported AI bindings

Taiga controls fill the kit's feature slots while the Angular binding retains
localized labels, accessibility announcements, serialization and saved state.
Host callbacks own writes; omitting a feature does not create its controls.

## Theme isolation and responsive layouts

`AdaptTaigaRoot` uses Taiga's official `.taiga-ui-theme()` scoped Less mixin under
`[data-adapttable-taiga-root]`. It does not import a document-wide reset or apply
Taiga tokens to `:root`. Styles outside that wrapper are unaffected when switching
kits. Portal content is rendered beneath the owning Taiga root. Table styling
uses token colors, logical directions, density spacing, bounded overflow, and
the Angular desktop/mobile-card structure. Consumers may override public classes.

## Verification

`pnpm test:contracts` checks source boundaries, native control
coverage, entry parity, and theme isolation. The package also carries Angular
behavior/conformance and SSR fixtures. Full Angular compilation, interaction,
coverage, browser, theme, mobile, and RTL acceptance must pass on the final
integrated release commit; source-level checks alone do not establish release readiness.
