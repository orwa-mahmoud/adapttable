# Angular row and column spanning

`cellSpan(getCellSpan, appearance?)` lets an origin cell cover adjacent
rows or columns. Covered cells are omitted from the rendered grid. The
callback sees visual body order, which matters when rows are pinned.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { cellSpan } from "@adapttable/angular-unstyled/cell-span";

interface Person {
  id: string;
  name: string;
  team: string;
}

@Component({
  selector: "app-team-spans",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [urlSync]="false"
    />
  `,
})
export class TeamSpans {
  readonly rows: Person[] = [
    { id: "ada", name: "Ada", team: "Core" },
    { id: "grace", name: "Grace", team: "Core" },
    { id: "alan", name: "Alan", team: "Platform" },
  ];
  readonly columns: ColumnDef<Person>[] = [
    { key: "team", header: "Team" },
    { key: "name", header: "Name" },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    cellSpan<Person>(({ column, sectionRows, sectionRowIndex }) => {
      if (column.key !== "team") return undefined;
      const team = sectionRows[sectionRowIndex]?.team;
      if (team === undefined) return undefined;
      let rowSpan = 1;
      while (sectionRows[sectionRowIndex + rowSpan]?.team === team)
        rowSpan += 1;
      return { rowSpan };
    }),
  ];
}
```

Use the NG-ZORRO root and `/cell-span` entry together for its rendering.
See [getting started](./getting-started.md) for installation
and first-release status.

## Callback contract

The callback receives `row`, `column`, `rowIndex`, `columnIndex`,
`sectionRows` and `sectionRowIndex`. `rowIndex` includes the dataset page
offset; `sectionRowIndex` addresses the supplied visual list. For a run of
equal values, scan that list rather than the host's original array.

Return `{ rowSpan, colSpan }` or `undefined`. Omitted dimensions default to
one. Nonfinite or less-than-one values become one; lengths are floored and
clamped to the remaining grid. The engine skips covered origins, so the
example computes a run only when its first uncovered cell is reached.
Column definitions also support `rowSpan` and `colSpan` numbers or row
callbacks; the feature callback takes precedence for the dimensions it sets.

A column span is clipped at a pinned-column boundary. A column window can
render the visible continuation when the original column is outside it.
Inserted full-width and separator rows receive their own slots; the row
span accounts for those intervening physical rows.

## Appearance, navigation and mobile

`"merged"` is the default appearance, with centered content and one merged
fill. `"plain"` retains geometry with ordinary cell paint. The merged cell
has a `data-cell-span` value such as `1x2` plus the actual `rowspan` or
`colspan` attributes. The unstyled kit exposes
`--adapttable-cell-span-fill` for the fill.

Mobile cards deliberately ignore span geometry and show each record's
fields. A card is not a cell grid, so merging fields between cards would
remove information from individual records. Keep important labels in the
underlying data and do not rely on a spanning cell as the only accessible
description of another row.

Spans derive from current data and column layout; they do not change data
or add URL/saved-view state. Direction-aware pin boundaries and the table's
`dir` govern layout. Test custom renderers with
[cell navigation](./cell-navigation.md), especially if a span covers an
editable field.

See [full-width rows](./full-width-rows.md), [row pinning](./row-pinning.md)
and [column management](./column-management.md).
