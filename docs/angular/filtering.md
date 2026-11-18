# Angular table filtering

Compose `filters()` to turn column filter definitions into a Filters button,
an AND/OR builder, field controls and removable chips. The frontend data tier
evaluates the filters; the server tier sends their state to the host's query
callback.

These examples use the native kit `@adapttable/angular-unstyled`.
For NG-ZORRO, import the component and factories from `@adapttable/ng-zorro`
and its matching subpaths. See [getting started](./getting-started.md) for
installation and kit setup.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { filters } from "@adapttable/angular-unstyled/filters";

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
}

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      urlKey="people"
      filtersMode="popover"
    />
  `,
})
export class People {
  readonly rows: Person[] = [
    { id: "ada", name: "Ada", team: "Core", budget: 20000 },
    { id: "grace", name: "Grace", team: "Platform", budget: 35000 },
  ];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", filter: "text" },
    {
      key: "team",
      header: "Team",
      filter: { type: "select", options: "auto" },
    },
    { key: "budget", header: "Budget", filter: "numberRange" },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [filters<Person>()];
}
```

## Definitions and operators

Built-in types are `text`, `select`, `multiSelect`, `checklist`, `boolean`,
`numberRange` and `dateRange`. A column accepts a type string or a definition
without `key`; its key and string header supply the identity and label.
Pass standalone `FilterDef<TRow>` objects to `filters(defs)` when a filter
does not belong to a visible column. `getValue(row)` overrides the data-path
lookup. `column` places a standalone filter under a differently named column.

Column definitions come first, then standalone definitions. A standalone
definition with the same key replaces the column definition and produces a
development warning. Keep one declaration per key unless that override is
intentional.

Text fields offer operators such as contains, equals and starts with. Number
ranges support comparisons, between and lists; date ranges support before,
after, on, between and relative dates. Date-only bounds describe the user's
local calendar day. A `Date`, timestamp or datetime value represents an
instant. Use [custom filter types](./custom-filter-types.md) for another
predicate while retaining the kit's controls.

## Options and remote data

Choice filters accept `{ value, label }[]`, `"auto"`, or a function returning
`Promise<readonly FilterOption[]>`. Auto options derive sorted distinct values
from the full frontend dataset, capped at 50. A page from a server is not a
complete options list: provide choices or an async loader there.

Async fields show their loading state until the loader settles. A rejected
loader leaves an empty list and a development warning; provide your own
logging and recovery if option loading is essential. Results arriving after
the field's injection context is destroyed are ignored.

With server data, declare the endpoint's actual capabilities and implement
the received query in `[onQueryChange]`. Changing filters does not filter the
server page locally. See [data tiers](./data-tiers.md) and the shared
[server query contract](../server-queries.md).

## Draw only the widgets you use

`filters()` draws every built-in widget, because filter types are data the
table reads at runtime. When a table only ever shows some of them, compose
`filtersWith` from the same entry with those widgets, and the rest stay out of
the bundle:

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import {
  filtersWith,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/angular-unstyled/filters";

interface Person {
  id: string;
  name: string;
  budget: number;
}

const filters = filtersWith([textFilterWidget, rangeFilterWidget]);

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class People {
  readonly rows: Person[] = [{ id: "ada", name: "Ada", budget: 20000 }];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", filter: "text" },
    { key: "budget", header: "Budget", filter: "numberRange" },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [filters<Person>()];
}
```

Every kit's filters entry exports `filtersWith` (an `AdapterFiltersFeature`)
and the six widgets: `textFilterWidget`, `booleanFilterWidget`,
`selectFilterWidget`, `multiSelectFilterWidget`, `checklistFilterWidget` and
`rangeFilterWidget`. A filter whose widget was not composed throws when its
field draws, naming the filter and the widget to add. A type registered with
its own `render` draws that, whatever was composed. Measured 2026-11-18 on the
native kit, a table with text filters only is 4.8 KiB (min+gzip) lighter than
one with every widget.

A widget is a `FilterWidget`: the `kinds` it draws and a component with
`def`, `source` and `labels` inputs. Adapter authors publish the widgets with
`withFilterWidgets(feature, widgets)` and draw the form from
`AdaptFilterWidgetFormModel`, which reads them; a checklist widget builds on
`AdaptChecklistFilterFieldModel`.

## Interaction and persistence

`filtersMode="popover"` opens an anchored panel without a backdrop. Escape
closes it and restores trigger focus; an outside click closes it too.
`filtersMode="drawer"` uses a backdrop. `[filterFields]="false"` leaves only
the AND/OR tree in the panel, opened on first paint. The toolbar remains
available with mobile cards. Supply `[labels]` and `dir="rtl"` for translated controls and
direction-aware placement, and `[locale]` so the choices of an `"auto"`
select filter read the locale's field.

Filters, operators and the nested tree participate in [URL state](./url-state.md)
and [saved views](./saved-views.md). Removing a chip removes its own value;
Clear all clears both simple filters and the tree. Feature definitions and
overlay mode are configured before table initialization.

Continue with [header filters](./header-filters.md) or the
[AND/OR builder](./filter-tree.md).
