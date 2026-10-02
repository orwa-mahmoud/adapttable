# Customize an Angular table's appearance and rendering

Choose the kit that owns the controls you want. The native kit supplies HTML
and lets the host supply its theme; NG-ZORRO supplies its own widgets and uses
the host's NG-ZORRO theme. Both expose shared structural parts and explicit
renderer inputs.

## Add classes to supported surfaces

`DataTableClassNames` comes from your kit's root. Bind an object to
`[classNames]`; the classes supplement the existing part and state attributes.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import {
  AdaptDataTable,
  type DataTableClassNames,
} from "@adapttable/angular-unstyled";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "styled-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <section class="people-table-theme">
      <adapt-data-table
        [data]="people"
        [columns]="columns"
        [rowKey]="rowKey"
        [classNames]="classes"
        tableLabel="People"
      />
    </section>
  `,
})
export class StyledPeopleTable {
  readonly people: Person[] = [{ id: "ada", name: "Ada" }];
  readonly columns: ColumnDef<Person>[] = [{ key: "name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly classes: DataTableClassNames = {
    card: "person-card",
    cardLabel: "person-card-label",
    actionButton: "person-action",
  };
}
```

Put styles that target elements inside a child kit in the application's global
stylesheet, scoped to your wrapper. Angular's default component style
encapsulation does not automatically apply a parent's styles to a child's
internal nodes.

```css
.people-table-theme [data-adapttable-part="card"] {
  border: 1px solid #767676;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-block: 0.75rem;
}

.people-table-theme .person-card-label {
  font-weight: 600;
  margin-inline-end: 0.75rem;
}

.people-table-theme :focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
```

The Angular `classNames` contract includes card fields, card actions/detail,
selection/tree/reorder controls, row actions, structural extra rows and virtual
spacers. It is not the React kit's class map: do not invent `root`, `table`
or `header` keys. Style other shared surfaces through their documented
`data-adapttable-part` attributes or your own outer wrapper.

## Replace content at the right level

- A column's `cell`, `headerCell` or `footer` replaces that content with an
  Angular template or component
- `AdaptCellTemplate` associates a projected body-cell template with a column key
- `renderCard` replaces a card's field body, preserving its interactive shell
- `renderRowActions` replaces the resolved action controls on desktop and cards

See [Columns](./columns.md) for renderer contexts and
[Mobile cards](./mobile.md) for a complete custom card. Component renderers
receive only context fields they declare as inputs.

`renderRowActions` receives `$implicit` / `row`, resolved `actions`, `confirm`
and live `labels`. Preserve action visibility, disabled state and confirmation
semantics. Replacing the renderer does not authorize bypassing an action's
confirmation or making the table own row writes.

Use `rowAppearance()` for row/card classes, inline styles and heights derived
from a row; see [Row styling](./row-styling.md). Keep stable row ids when data
changes so selection, focus and changed-cell feedback remain attached to the
right record.

## Keep kit and behavior contracts intact

NG-ZORRO owns its widget internals. Use its theming API for those internals
instead of depending on native-kit-only markup. Load the NG-ZORRO stylesheet
once; the adapter does not inject it for you.

Avoid hiding a required control with CSS while leaving its active behavior
invisible. Preserve focus rings, readable contrast, control labels, live regions
and logical CSS edges. Custom headless surfaces should bind whole `AdaptAttrs`
records rather than copying selected attributes.

Feature factories and the kit shell own focus/overlay behavior. To replace
an entire kit control, use a required slot in an adapter; see
[Building an adapter](./building-an-adapter.md). For text and direction changes,
use [Localization and RTL](./i18n-rtl.md).
