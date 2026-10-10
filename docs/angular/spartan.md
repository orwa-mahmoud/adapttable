# Spartan Angular table

`@adapttable/spartan` renders AdaptTable through Spartan Brain and an owned
Helm layer. The kit is available on npm.
Keep the kit and binding releases compatible with their declared dependencies.

## Architecture and supported versions

The Angular binding provides signals, controllers and structural Chrome. The
Spartan adapter fills interactive slots with Brain-backed controls and supplies
Tailwind styling. It does not import the React or Angular unstyled adapters.

Verified on 2026-10-02: `@spartan-ng/brain@1.5.0` declares Angular, Forms, Common
and CDK compatibility with `>=21.0.0 <23.0.0`. This kit targets Angular 22. See
[Spartan's support policy](https://www.spartan.ng/documentation/version-support).

## Application setup

Install in an existing Angular 22 application:

```sh
npm install @adapttable/spartan @adapttable/angular @spartan-ng/brain@1.5.0 @angular/cdk@^22 @angular/forms@^22 rxjs@^7.8.0 tailwindcss@^4 clsx@^2.1.1 tw-animate-css@^1
```

Keep the host's Angular Common and Core packages on compatible Angular 22
versions. Brain's Luxon peer is optional and is not needed for this kit's native
date input. No kit-specific application provider is required.

Use the application's Tailwind 4 CSS processing:

```css
@import "tailwindcss";
@import "@angular/cdk/overlay-prebuilt.css";
@import "@adapttable/spartan/styles.css";
```

The kit uses a Tailwind reference and scoped utility application. It does not
add a global reset or change another adapter's tokens. Apps already processing
Tailwind do not need a second Tailwind entry. CDK's overlay stylesheet supplies
positioning for Brain popovers and dialogs.

```ts
import { Component } from "@angular/core";
import { AdaptDataTable } from "@adapttable/spartan";
import { filters } from "@adapttable/spartan/filters";
import { editing } from "@adapttable/spartan/editing";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features"
    [urlSync]="false"
  />`,
})
export class PeopleTable {
  rows: Person[] = [{ id: "1", name: "Ada" }];
  readonly columns = [
    {
      key: "name",
      header: "Name",
      editable: true,
      accessor: (row: Person) => row.name,
    },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    filters<Person>([{ key: "name", type: "text" }]),
    editing<Person>((row, key, value) => {
      this.rows = this.rows.map((person) =>
        person.id === row.id ? { ...person, [key]: value } : person
      );
    }),
  ];
}
```

## Helm ownership and customization

The adapter maintains its own adapted Helm source. Applications neither copy
Helm files into the adapter nor supply app-local Helm import aliases. Updating
an application's separate Spartan components leaves this table unchanged.

Supported customization boundaries are the Angular slot contracts, documented
`classNames`, `data-adapttable-part` attributes and the kit's CSS variables:
`--at-spartan-background`, `--at-spartan-foreground`, `--at-spartan-muted`,
`--at-spartan-muted-foreground`, `--at-spartan-border`, `--at-spartan-primary`,
`--at-spartan-primary-foreground`, `--at-spartan-ring`, `--at-spartan-radius`,
and `--at-spartan-cell-padding`.

Set overrides on `[data-adapttable-kit="spartan"]` so portalled surfaces share
them. Set `.dark` or `data-theme="dark"` on the document element to cover both
the table and CDK portals. No unprefixed global theme tokens are changed.
The `ɵ`-prefixed exports only link the kit's secondary entries and are internal.
In particular, `ɵHlmPopoverLabel` keeps the actual Brain popover pane's accessible
name synchronized with its owning control's localized label.

An upstream Brain upgrade must review compatibility and the copied Helm layer,
then verify conformance, overlays, keyboard handling, focus, themes and SSR.
Upstream MIT attribution is preserved in the package's `NOTICE` file.

## Features and interaction

Feature factories have the same entry names as the Angular binding's existing
kits, including filtering, header filters, editing, row and column operations,
grouping, trees, pivot, virtualization, saved views, find, export, print,
command palette, context menu, status and optional assistant/approval controls.
The host owns writes; callbacks remain the only way rows change.

- Text, numeric, date and textarea controls use Brain Input plus Helm styling.
- Selects use the owned Helm native-select variant and platform option semantics.
- Selection uses Brain Checkbox, including mixed states and accessible labels.
- Filter popovers and menus use Brain Popover without a backdrop.
- Drawers and modal surfaces use Brain Dialog with a real backdrop and focus trap.
- The Advanced filter section uses Brain Collapsible.
- Small screens use the Angular binding's labelled cards. RTL uses logical
  properties and direction-aware overlay alignment.

State serialization, localized labels, live announcements and keyboard models
remain in the shared engine/binding. Styling does not change those contracts.
