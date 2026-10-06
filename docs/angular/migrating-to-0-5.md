# Migrate the Angular binding to 0.5

The 0.5 release gives each Angular API one public home. It preserves the
existing Angular names and feature behavior while separating application
contracts, opt-in feature factories and adapter construction. This is a
pre-1.0 breaking import-path change. The new paths require the 0.5 binding;
they are not available in the published 0.4 binding.

## Choose the entry by its role

- `@adapttable/angular` owns application hooks, column and renderer contracts,
  `AdaptTableFeature`, feature state, mount contracts and composition helpers.
  `AdaptCellTemplate` remains here for application templates.
- `@adapttable/angular/features` owns headless feature factories and their
  feature-specific options. For example, import `grouping`, `virtualize`,
  `rowEditing` and `GroupingExtras` here when building your own adapter.
- `@adapttable/angular/adapter` owns structural Chrome, rendering directives,
  kit slots, table models, `AdaptDataTableShell` and kit controllers such as
  `injectBulkBarRunner`. It supplies no native control library or kit theme.
- `/formula`, `/pivot`, `/router`, `/sparkline` and `/stream` keep their
  existing specialized entry points.

Import application types from their canonical owner rather than relying on a
feature entry to re-export them. For example, `ColumnDef`, `AdaptTableFeature`,
`FeatureMountContext`, `SlotTable` and `RowSelectionOptions` belong at the root.

## Update a headless renderer

Application hooks stay at the root. Structural rendering directives move to
`/adapter`:

```diff
- import { AdaptAttrs, AdaptCell, AdaptHeader } from "@adapttable/angular";
+ import { AdaptAttrs, AdaptCell, AdaptHeader } from "@adapttable/angular/adapter";
```

Application imports stay unchanged:

```diff
import {
  AdaptCellTemplate,
  injectDataTable,
  injectFrontendData,
  type ColumnDef,
} from "@adapttable/angular";
import {
  AdaptAttrs,
  AdaptCell,
  AdaptHeader,
} from "@adapttable/angular/adapter";
```

Keep the same Angular component imports and templates. A custom renderer can
also use the root's headless state and attribute getters with its own markup,
without using structural Chrome or a complete kit.

## Update an adapter

A previously combined root import becomes explicit imports from the three
owners. Composition helpers stay at the root:

```diff
import { extendFeature, slotRender } from "@adapttable/angular";
import { collapsibleColumnGroups } from "@adapttable/angular/features";
import {
  AdaptColumnGroupToggleChrome,
  COLUMN_GROUP_TOGGLE,
  type ColumnGroupToggleSlots,
} from "@adapttable/angular/adapter";
```

The existing [adapter guide](building-an-adapter.md) contains a complete
component example. All nine native kits use these same binding entries; they
retain their own controls, table and mobile templates, overlays and styling.
Do not import a binding's private source files or copy its DI tokens or
directive classes. The public entries share the original declarations.

## Keep kit feature imports

Consumers of a native kit still import its table and feature entry points:

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { grouping } from "@adapttable/angular-unstyled/grouping";

interface Person {
  id: string;
  team: string;
}

@Component({
  selector: "migrated-people-table",
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="people"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features"
    [urlSync]="false"
    tableLabel="People"
  />`,
})
export class MigratedPeopleTable {
  readonly people: Person[] = [{ id: "one", team: "Support" }];
  readonly columns: ColumnDef<Person>[] = [{ key: "team" }];
  readonly rowKey = (person: Person) => person.id;
  readonly features = [grouping()];
}
```

Use the kit's factory when you want its native controls. The binding's
`/features` factories remain headless building blocks and do not substitute
for the kit's feature composition.

Upgrade the binding and the affected kit releases together, following their
published dependency ranges. Package versions remain independent: this
binding change targets 0.5, while the native kits' new header-action support
targets their next 0.2 minor. The release changesets also update Angular AI's
binding dependency without adding an unrelated AI capability. No package is
moved to 1.0 by this migration.
