# @adapttable/taiga-ui

Taiga UI controls for the headless Angular AdaptTable binding. This is a **private,
unpublished 0.0.0 package under development**; it is not available from npm.

The adapter uses Taiga UI 5.26.0 (Apache-2.0), with Angular 22 and RxJS 7.
The adapter's own source remains MIT. No Taiga implementation code is vendored.
Use a Node version supported by Angular 22: 22.22.3+, 24.15.0+, or 26+.

## Workspace setup

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

## Feature entries

All applicable Angular kit entries are included: assistant and approvals,
batch editing, bulk actions, cell navigation and spans, column groups/menu/
selection, command palette, context menu, density, editing/history, export,
extra rows, filters, find-in-table, fit columns, fullscreen, grouping and its
panel, header filters, multi-sort, nested tables, pinned summary rows, pivot,
print, resize, row actions/appearance/detail/pinning/reorder, saved views,
selection stats, side panel, status bar, tree, and virtualization. `features`
and `preset` aggregate the same factories as the existing Angular kits.

Host callbacks continue to own writes. Omitting a feature does not create its
controls. Locale labels, accessibility announcements, serialization, saved
state, and headless interactions remain owned by the Angular binding.

## Theme isolation and responsive layouts

`AdaptTaigaRoot` uses Taiga's official `.taiga-ui-theme()` scoped Less mixin under
`[data-adapttable-taiga-root]`. It does not import a document-wide reset or apply
Taiga tokens to `:root`. Styles outside that wrapper are unaffected when switching
kits. Portal content is rendered beneath the owning Taiga root. Table styling
uses token colors, logical directions, density spacing, bounded overflow, and
the Angular desktop/mobile-card structure. Consumers may override public classes.

## Verification

`node --test contracts.test.mjs` checks source boundaries, native control
coverage, entry parity, and theme isolation. The package also carries Angular
behavior/conformance and SSR fixtures. Full Angular compilation, interaction,
coverage, browser, theme, mobile, and RTL acceptance must pass before the package
is advertised as supported or made publishable.
