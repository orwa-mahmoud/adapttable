# @adapttable/spartan

Requires Node.js **22.22.3+ on Node 22, 24.15.0+ on Node 24, or Node 26+**, matching Angular 22.

Angular DataTable with Spartan Brain controls and a package-owned Helm styling
layer.

Prepared for its first public `0.1.0` release. Publication to npm is a separate
owner-controlled step; package metadata does not imply registry availability.

## Integration boundary

- `@adapttable/angular` owns state, feature controllers and structural Chrome.
- `@spartan-ng/brain` owns accessible control behavior, overlay placement,
  dismissal, focus trapping and focus restoration.
- This package owns its adapted Helm source and Tailwind styles. Applications
  do not generate a second Helm copy or provide imports using app-local aliases.
- Supported customization uses `data-adapttable-part`, documented `classNames`,
  slot overrides and the `--at-spartan-*` CSS variables. The `data-spartan-part`
  attributes identify private Helm internals, not cross-kit part contracts. `ɵ`-prefixed exports
  are package-internal links between secondary entries, not application APIs.
- Brain upgrades are explicit dependency changes. Review upstream release notes,
  compare the owned Helm layer, then rerun control, overlay, conformance, SSR,
  accessibility and browser checks. Upgrading an application's generated Helm
  components does not modify this table.

## Compatibility

Verified 2026-10-02: Spartan Brain `1.5.0` declares Angular, Forms, Common and
CDK peers `>=21.0.0 <23.0.0`. AdaptTable targets Angular 22. The original Spartan
1.0 release also accepts Angular 22. See the official
[version support](https://www.spartan.ng/documentation/version-support) and
[installation](https://www.spartan.ng/documentation/installation) documentation.

The host needs Angular 22, `@spartan-ng/brain`, Angular CDK and Forms,
RxJS, Tailwind CSS 4, `clsx` and `tw-animate-css`. Brain's Luxon peer is optional
and only needed for its Luxon integration.

After publication, install the kit and its native peers in an Angular 22 app:

```sh
pnpm add @adapttable/spartan @adapttable/angular @spartan-ng/brain@^1.5.0 @angular/cdk@^22 @angular/forms@^22 rxjs@^7.8 clsx@^2.1.1 tw-animate-css@^1
pnpm add -D tailwindcss@^4
```

Before publication, link `@adapttable/spartan@workspace:*` and
`@adapttable/angular@workspace:*` from this monorepo instead. AdaptTable package
versions are independent; the adapter resolves its exact binding/core dependencies.

## Styles

Import the stylesheet through Tailwind 4 after the application's Tailwind entry:

```css
@import "tailwindcss";
@import "@angular/cdk/overlay-prebuilt.css";
@import "@adapttable/spartan/styles.css";
```

The kit's stylesheet uses `@reference "tailwindcss"` and scoped `@apply` rules;
it emits neither Tailwind Preflight nor global element resets. If the app does
not already use Tailwind, configure its official PostCSS or Vite integration.
Do not load a second global Spartan theme stylesheet just for the table.

Each table and portal surface owns `data-adapttable-kit="spartan"`. Theme rules
are scoped to that marker and class names are prefixed `at-spartan-`.
The `.dark` or `[data-theme="dark"]` ancestor convention applies to overlays as
well; put the theme on the document element when using CDK portals. Override
`--at-spartan-background`, `--at-spartan-foreground`, `--at-spartan-muted`,
`--at-spartan-muted-foreground`, `--at-spartan-border`, `--at-spartan-primary`,
`--at-spartan-primary-foreground`, `--at-spartan-ring`, `--at-spartan-radius`,
and `--at-spartan-cell-padding` on the kit marker to customize its theme.

## Basic table

```ts
import { Component } from "@angular/core";
import { AdaptDataTable } from "@adapttable/spartan";
import { filters } from "@adapttable/spartan/filters";

@Component({
  selector: "people-table",
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="people"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features"
    [urlSync]="false"
  />`,
})
export class PeopleTable {
  readonly people = [{ id: "1", name: "Ada" }];
  readonly columns = [
    { key: "name", accessor: (row: { name: string }) => row.name },
  ];
  readonly rowKey = (row: { id: string }) => row.id;
  readonly features = [filters([{ key: "name", type: "text" }])];
}
```

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

Desktop tables retain semantic table markup. `forceMobile` or the responsive
breakpoint switches to the binding's card presentation with labelled fields,
selection and row actions. `dir="rtl"` uses logical placement and styling.
Density, filtering, selection and other query state keep the Angular binding's
URL/Saved Views behavior. The host still owns data and receives every mutation.

## Control mapping

- Buttons: Brain Button with owned Helm styling.
- Text, date, number and textarea inputs: Brain Input with Helm styling.
- Selects: owned Helm native-select variant, Brain field accessibility and
  platform option semantics, including multi-select editing.
- Checkboxes: Brain Checkbox, including mixed selection state and label wiring.
- Filter popover, column/view menus, row actions and header filters: Brain
  Popover. Popovers have no backdrop and close on Escape or outside press.
- Filter drawer, command palette and modal assistant: Brain Dialog. Modal
  overlays use a real backdrop, focus containment and focus restoration.
- Advanced filter section: Brain Collapsible.
- Floating assistant: nonmodal Helm surface positioned by the binding's Chrome.

The table labels come from the binding's localization contract. Accessible
names, live announcements, keyboard editing/navigation and focus refs remain
connected to those models. Upstream MIT notices are included in `NOTICE`.
