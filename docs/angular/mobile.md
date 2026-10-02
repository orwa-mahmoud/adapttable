# Angular responsive tables and mobile cards

Both Angular kits switch from a desktop table to a labeled card list on narrow
screens. `forceMobile` can choose the layout explicitly. The same source,
column definitions, host callbacks and optional features drive both layouts.

## Customize a card's fields

`renderCard` replaces the field body while the kit keeps the card's interactive
shell. Each field supplies its rendered `value` template and the `context`
needed to stamp it. Render that pair with `NgTemplateOutlet` to preserve custom
cells and composed editors.

```ts
import { NgTemplateOutlet } from "@angular/common";
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Person {
  id: string;
  name: string;
  email: string;
}

@Component({
  selector: "people-cards",
  standalone: true,
  imports: [AdaptDataTable, NgTemplateOutlet],
  template: `
    <ng-template #cardBody let-fields="fields">
      @for (field of fields; track field.column.key) {
        <div class="person-field">
          @if (field.label) {
            <span class="person-field-label">{{ field.label }}</span>
          }
          <ng-container
            [ngTemplateOutlet]="field.value"
            [ngTemplateOutletContext]="field.context"
          />
        </div>
      }
    </ng-template>
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [forceMobile]="true"
      [renderCard]="cardBody"
      tableLabel="People"
    />
  `,
})
export class PeopleCards {
  readonly people: Person[] = [
    { id: "ada", name: "Ada", email: "ada@example.com" },
  ];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", mobileLabel: "", sortable: true },
    { key: "email", header: "Email", mobileLabel: "Contact" },
  ];
  readonly rowKey = (row: Person) => row.id;
}
```

For NG-ZORRO, change the kit import to `@adapttable/ng-zorro`. The body
contract is shared through `MobileCardRenderer`, `MobileCardContext` and
`MobileCardField` from `@adapttable/angular`.

`MobileCardContext` includes `$implicit` / `row`, `index`, `selected`,
`expanded` and `fields`. A component renderer receives the fields it declares
as inputs. Its `fields` already reflect the current column order and visibility.
Reading a raw row property instead of stamping `field.value` discards the
column's renderer and editor.

## Column and layout choices

`mobileLabel` overrides the field caption. When omitted, the caption falls
back to the column header; an empty string deliberately omits the caption.
`hideOnMobile` removes a column from cards and `hideOnDesktop` removes it from
the desktop table. Use captions that make sense without a spanning header.

Automatic pagination becomes infinite on mobile. Readers can load another
slice using the load-more area and explicit control. Set `paginationMode`
explicitly if your product requires pages on both layouts. With a prebuilt
source, configure its mode and mobile state consistently with the shell.

The desktop column menu and stacked grouped-header rows are not card controls.
The current column layout still affects the fields. Mobile sorting has its own
sort select. Use [Column management](./column-management.md) for host-controlled
arrangements.

## Interactions stay with the shell

Cards support selection, row actions, editing, tree/detail disclosure,
reordering, row pinning and virtualization when those features are composed.
Custom bodies do not replace these surrounding controls. Summary cards remain
read-only and outside data-card renderers, editors and actions.

`onRowClick` is a callback input. It activates a row/card from a body click or
Enter/Space while that row/card has focus; interactive descendants keep their
own behavior. ArrowUp/ArrowDown move between activatable rows with a roving
Tab stop. A button inside your custom card should remain a button instead of
manually triggering the row callback.

The default value wrapper carries changed-cell feedback. A custom body owns
its wrappers and must apply an `isCellFlashing` reader itself if it wants that
feedback. Preserve reduced-motion preferences and do not use color alone to
communicate a changed or invalid field.

## Accessible and styled cards

Cards live in a named list with direction and position information, rather
than pretending to be desktop table rows. Keep the list name, field captions,
control names, focus indication and logical reading order. Test long text at
phone widths as well as keyboard access.

Use `classNames.cards`, `card`, `cardRow`, `cardLabel`, `cardValue`,
`cardActions`, `cardDetail` and `summaryCard` for the built-in surfaces.
Custom body wrappers use your own CSS.

See [Customization](./customization.md), [Pagination](./pagination.md),
[Cell editing](./cell-editing.md), [Virtualization](./virtualization.md),
[Accessibility](./accessibility.md) and [Localization](./i18n-rtl.md).
