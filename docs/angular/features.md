# Angular table features, presets and composition

Features are ordinary `AdaptTableFeature` objects composed by the table.
A kit factory adds that kit's controls to the binding's behavior. Import the
factory from the same kit as `AdaptDataTable`.

## Compose individual entries

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import { columnMenu } from "@adapttable/ng-zorro/column-menu";
import { findInTable } from "@adapttable/ng-zorro/find-in-table";
import { multiSort } from "@adapttable/ng-zorro/multi-sort";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      tableLabel="People"
    />
  `,
})
export class PeopleTable {
  readonly people: Person[] = [{ id: "ada", name: "Ada Lovelace" }];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    columnMenu(),
    multiSort(),
    findInTable({ button: true }),
  ];
}
```

The native kit exposes the same paths below
`@adapttable/angular-unstyled`. NG-ZORRO requires its host theme and peer
dependencies; see [Getting started](./getting-started.md).

The shell reads its feature list when it starts. Build it once rather than
calling factories from a template or expecting a new array to hot-swap a
mounted feature. Host-owned row signals and supported controlled inputs can
still change throughout the table's lifetime.

## The standard preset

```ts
import { standardPreset } from "@adapttable/angular-unstyled/preset";

const features = standardPreset();
```

The zero-argument preset contains exactly:

- `columnMenu()`
- `densityChooser()`
- `exportCsv()`
- `fullscreen()`
- `headerFilters()`
- `statusBar()`

Its optional `grouping`, `bulkActions`, `filters` and `savedViews` options add
the corresponding configured factories. For example,
`standardPreset({ grouping: "department" })` adds grouping by that column.
Find, fit-to-width, multi-sort and resizing are separate opt-ins. The preset
returns an ordinary array, so append other features as needed.

`/features` gathers the kit's factory exports. Individual subpaths give you
a smaller dependency graph and make feature cost easier to inspect. A preset
imports its members; configuring behavior is not a promise that all unused
members disappear from a bundle.

## Configure a scope through dependency injection

`provideAdaptTableFeatures(...features)` from `@adapttable/angular` returns
environment providers for `bootstrapApplication` or route providers. Features
from the injector precede a table's own `[features]`. A duplicate feature id
resolves to the last declaration for configuration, registrations and slot
rendering, so a local entry can replace an inherited one.

Keep kit choice consistent in that scope: providing NG-ZORRO features to a
native table would mix two control libraries.

## Where each optional import lives

- Filters: `/filters`, `/header-filters`, `/saved-views`
- Columns: `/column-menu`, `/column-groups`, `/resizable-columns`,
  `/fit-columns`, `/multi-sort`, `/column-selection`
- Rows: `/row-actions`, `/bulk-actions`, `/row-detail`, `/nested-table`,
  `/row-reorder`, `/row-pinning`, `/pinned-summary-rows`, `/tree`
- Editing: `/editing`, with `batchEditing` on `/batch-editing`
- Keyboard and tools: `/cell-navigation`, `/selection-stats`,
  `/find-in-table`, `/command-palette`, `/context-menu`
- Analytics and layout: `/grouping`, `/grouping-panel`, `/pivot`,
  `/virtualize`, `/side-panel`, `/status-bar`, `/density`, `/fullscreen`
- Export: `/export` and `/print`

Formula columns, sparklines, stream helpers and the Router adapter are binding
entries: `@adapttable/angular/formula`, `/sparkline`, `/stream` and `/router`.
There is no kit `/formula` or `/sparkline` entry. Assistant state lives in
`@adapttable/ai-angular`; assistant controls are a kit `/assistant` feature.

## Authoring a feature

`AdaptTableFeature` supports `apply` for merged configuration, `setup` for
registrations, `renders` for named slots and `mount` for live runtime behavior.
`extendFeature` adds kit slot fills while retaining the base feature;
`slotRender` names each fill. Slot components receive one `props` input.

A mounted feature receives the table runtime, injector and per-table feature
state. Return a cleanup for subscriptions or resources. The shell disposes
mounted behavior with the table; a custom adapter must preserve that lifecycle
instead of mounting features during each render.

See [Building an adapter](./building-an-adapter.md),
[Headless rendering](./headless.md), and the
[shared architecture concepts](../concepts.md).
