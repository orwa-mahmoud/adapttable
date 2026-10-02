# Angular header filters

`headerFilters()` puts a filter funnel beside each filterable column title.
Each funnel edits the same state as the Filters panel; it does not create a
second predicate or a second URL representation.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { filters } from "@adapttable/angular-unstyled/filters";
import { headerFilters } from "@adapttable/angular-unstyled/header-filters";

interface Person {
  id: string;
  name: string;
  active: boolean;
}

@Component({
  selector: "app-header-filters",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [closeHeaderFilterOnSelect]="true"
      urlKey="people"
    />
  `,
})
export class HeaderFilters {
  readonly rows: Person[] = [
    { id: "ada", name: "Ada", active: true },
    { id: "grace", name: "Grace", active: false },
  ];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", filter: "text" },
    { key: "active", header: "Active", filter: "boolean" },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [filters<Person>(), headerFilters()];
}
```

Use matching `@adapttable/ng-zorro` imports for its controls. Both kits are
unpublished workspace packages; [getting started](./getting-started.md)
explains setup.

## Placement and dismissal

Only columns with resolved definitions receive a funnel. A standalone
definition can use `column` to target a different column key. Header
controls read the same choice lists and custom-type registry as the main
form, so server-backed lists still need explicit options or a loader.

By default a header filter stays open while it is edited. Set
`[closeHeaderFilterOnSelect]="true"` before initialization to dismiss after a
completed single-control write. Multi-value and range editing retain the
space needed to finish the selection. Escape and outside presses dismiss
the overlay. NG-ZORRO's nested choice overlays are treated as part of the
filter interaction.

Composing both features keeps the toolbar Filters button and the Advanced
tree. The toolbar form hides the duplicate simple field list in this mode.
Mobile cards have no column-header funnels; retain the toolbar feature and
use the builder for mobile filtering. If phones need the full simple form,
use `filters()` without `headerFilters()` for that table configuration.

## A compact row in a custom table

The same secondary entry exports `AdaptFilterHeaderRow` and
`AdaptFilterHeaderControl`. These are for a host-built header, rather than
another shell input. The row requires `columns`, `defs`, `source` and fully
resolved `labels`; optional `registry`, leading-column flags, column-window
spacers and sticky/pinning callbacks keep its cells aligned with the header.
The single control requires one definition, a source and resolved labels.

These controls are Angular standalone components with property-bound inputs.
The headless binding's `AdaptFilterHeaderChrome` takes required kit slots;
it does not supply native controls for a themed adapter. See
[building an adapter](./building-an-adapter.md).

Filter values and operators persist through [URL state](./url-state.md) and
[saved views](./saved-views.md). Pass `[labels]` for translated names and
`dir="rtl"` for the table's reading direction. Configure features before
mounting; changing the feature list is not a live mode switch.
