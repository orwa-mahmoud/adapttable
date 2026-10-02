# Angular AND/OR filter trees

The Advanced builder expresses conditions such as “Core or Platform, and
budget at least 20,000.” It is part of the `filters()` feature and shares the
Filters popover or drawer with the simple fields.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { filters } from "@adapttable/angular-unstyled/filters";

interface Person {
  id: string;
  team: string;
  budget: number;
}

@Component({
  selector: "app-team-budget",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      urlKey="budget"
    />
  `,
})
export class TeamBudget {
  readonly rows: Person[] = [
    { id: "1", team: "Core", budget: 25000 },
    { id: "2", team: "Platform", budget: 10000 },
  ];
  readonly columns: ColumnDef<Person>[] = [
    { key: "team", filter: { type: "select", options: "auto" } },
    { key: "budget", filter: "numberRange" },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [filters<Person>()];
}
```

Both Angular kits are workspace packages. Change both kit imports to
`@adapttable/ng-zorro` and `/filters` for NG-ZORRO controls.

## Model and source integration

The neutral model uses `combinator: "and" | "or"` and `conditions`. A
condition names a filter `key`, an `op` supported by its registered type and,
when needed, a `value`. Groups can contain other groups:

```ts
import type { QueryFilterGroup } from "@adapttable/core";

const rule: QueryFilterGroup = {
  combinator: "and",
  conditions: [
    {
      combinator: "or",
      conditions: [
        { key: "team", op: "eq", value: "Core" },
        { key: "team", op: "eq", value: "Platform" },
      ],
    },
    { key: "budget", op: "gte", value: 20000 },
  ],
};
```

A host holding a `TableSource` writes this through `source.setFilterTree`,
when that optional setter is available. With `injectTableData`, read the
source signal first: `data.source().setFilterTree?.(rule)`. A shell using
`[data]` and `filters()` creates this wiring for you. A custom frontend source
must evaluate the tree through its `filterTreeFn`; supplying controls alone
does not add evaluation to an arbitrary source.

The builder appears when definitions exist and the source exposes
`setFilterTree`. The frontend tier combines the simple filter predicates
with the tree. Server sources receive `query.filterTree` when they advertise
`supports.filterTree`; implement the complete tree on the server. Dropping an
unsupported branch would change the meaning of the request.

## UI and saved state

The builder contains kit-owned choice controls, value inputs and buttons for
adding and removing conditions or nested groups. Its operators come from the
filter registry. Empty-value operators do not need a value input; between
uses two bounds. The same builder works in the toolbar overlay on phones.
Labels and reading direction come from the table's `[labels]` and `dir`.

Composing `filters()` with `headerFilters()` moves simple column controls to
the headers and starts Advanced expanded in the toolbar panel. Keep
`filters()` composed when you want the toolbar builder on mobile too.

The tree is stored in the versioned `ft` URL parameter, namespaced by
`urlKey`. Tree chips remove their own node without flattening neighboring
groups. Clear all clears the tree and simple filters. Row data and custom
predicate functions are never serialized.

See [filtering](./filtering.md), [custom types](./custom-filter-types.md),
[URL state](./url-state.md) and [server queries](../server-queries.md).
