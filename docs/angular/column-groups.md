# Angular grouped and collapsible column headers

Header groups span related columns. They do not group data rows; use
[Row grouping](./row-grouping.md) for that. Both Angular kits consume the
same `ColumnInput<TRow>` tree.

## Declare a tree of headers

```ts
import { Component } from "@angular/core";
import type { ColumnInput } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { collapsibleColumnGroups } from "@adapttable/angular-unstyled/column-groups";

interface Person {
  id: string;
  name: string;
  team: string;
  role: string;
}

@Component({
  selector: "grouped-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      tableLabel="People and assignments"
    />
  `,
})
export class GroupedPeopleTable {
  readonly people: Person[] = [
    { id: "ada", name: "Ada", team: "Research", role: "Engineer" },
  ];
  readonly columns: ColumnInput<Person>[] = [
    { key: "name", sortable: true },
    {
      header: "Assignment",
      collapsedKey: "team",
      children: [
        { key: "team", header: "Team", sortable: true },
        { key: "role", header: "Role", sortable: true },
      ],
    },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [collapsibleColumnGroups()];
}
```

For NG-ZORRO, import the component from `@adapttable/ng-zorro` and the
factory from `@adapttable/ng-zorro/column-groups`.

Groups may contain further groups. `header`, `headerTooltip` and logical
`align` describe a group header. Tree groups keep their children adjacent by
default (`marryChildren: true`). Set it to false if the layout should permit
splitting that group during reordering.

For a simpler flat definition, each leaf can declare `group: "Assignment"`
or a path such as `group: ["Work", "Assignment"]`. The flat shortcut does
not carry a tree group's keep-children-together policy.

## Collapse policies

Grouped header structure needs no feature. `collapsibleColumnGroups()` adds
the kit's disclosure buttons and arms layout changes. A group chooses what
remains when collapsed:

- `collapsedKey` keeps a named child column
- `collapsedRender(row)` produces a primitive summary value and takes
  precedence over `collapsedKey`
- Omitting both leaves a narrow disclosure stub

`collapsedRender` is a neutral value callback, not an Angular template or
component renderer. Leaf `groupShow` can be `"open"`, `"closed"` or
`"always"` when defining visibility within a collapsible group.

Collapsed group ids live in `ColumnLayoutState.collapsedGroups`. Group ids
derive from their header path, so changing those path captions changes the
identity used by persisted layouts. Prefer stable group paths when restoring
saved layouts and localize deliberately.

## Layout and accessibility

The disclosure is a real button with a localized name including the group
caption and `aria-expanded`. Group headers span the visible leaf columns;
the binding recomputes the header plan after visibility/order changes.
Headless adapters should render `table.headerPlan()` instead of guessing
colspans from the original tree.

Mobile cards present fields rather than stacked table-header rows. Column
visibility and collapsed layout still shape those fields, but a desktop
group-header disclosure is not a separate card toolbar. Give every retained
field a useful `header` or `mobileLabel`.

Use [Column management](./column-management.md) and its URL layout controller
to persist collapsed state together with widths, pins and order. See also
[Columns](./columns.md), [Mobile cards](./mobile.md) and
[Accessibility](./accessibility.md).
