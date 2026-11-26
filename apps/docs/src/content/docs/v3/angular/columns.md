---
title: "Angular columns and cell templates (v3)"
description: Define Angular ColumnDef columns with plain headers, value
  accessors and TemplateRef or component renderers. Bind cell contexts with
  AdaptCellTemplate.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Angular
      columns and cell
      templates","item":"https://adapttable.orwamahmoud.com/v3/angular/columns/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/angular/columns.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/angular/columns.png
slug: v3/angular/columns
---

Import `ColumnDef` from `@adapttable/angular`. A column combines stable data
metadata with Angular templates or component renderers. Its `key` identifies
sorting, filtering, layout, editing and export; keep keys unique and independent
of translated display names.

## Plain data and component cells

```ts
import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Person {
  id: string;
  name: string;
  active: boolean;
}

@Component({
  selector: "person-status",
  standalone: true,
  template: `<span>{{ value() ? "Active" : "Inactive" }}</span>`,
})
export class PersonStatus {
  readonly value = input.required<boolean>();
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
      tableLabel="People"
    />
  `,
})
export class PeopleTable {
  readonly people: Person[] = [{ id: "ada", name: "Ada", active: true }];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", sortable: true, minWidth: 160 },
    {
      key: "active",
      header: "Status",
      cell: PersonStatus,
      sortValue: (row) => row.active,
      exportValue: (row) => (row.active ? "Active" : "Inactive"),
    },
  ];
  readonly rowKey = (row: Person) => row.id;
}
```

Without an `accessor`, the resolved column reads its `key` as a data path.
Without a `header`, it uses a humanized key. A custom component receives only
the context fields it declares as inputs; it does not receive an arbitrary
single `context` object unless you arrange that yourself.

## Renderer fields and context

| Column field    | Renderer context                                   |
| --------------- | -------------------------------------------------- |
| `cell`          | `$implicit` / `row`, `rowIndex`, `column`, `value` |
| `headerCell`    | `$implicit` / `column`                             |
| `headerActions` | `$implicit` / `column`                             |
| `footer`        | `$implicit` / `column`, and the summary `value`    |

Each renderer is a `TemplateRef<TContext>` or Angular component type. The
names are lowercase `cell`, `headerCell`, `headerActions` and `footer`.
`header` is plain text; `headerActions` also accepts plain text. Use
`headerCell` for the caption and `headerActions` for your own controls. The
kit renders `headerActions` after the caption, outside the sort button, so
clicking an action does not also sort the column. Templates receive the column
as both `$implicit` and `column`; components receive only the inputs they
declare. Action controls and their callbacks belong to the host. Header
actions are a desktop-header surface; mobile cards do not render them.

A footer renderer needs a summary value supplied by the table's `summaryRow`;
declaring a renderer alone does not create an aggregate.

For an inline template, import `AdaptCellTemplate` into the host's standalone
`imports` and project the template inside `adapt-data-table`:

```html
<ng-template adaptCellTemplate="name" let-value="value" let-index="rowIndex">
  <strong>{{ value }}</strong>
</ng-template>
```

The template matches the column key. A column's explicit `cell` wins over a
matching projected template. In a headless shell, pass
`viewChildren(AdaptCellTemplate)` to `injectDataTable` as `cellTemplates`.
`rowIndex` is the position in the rendered window, not a durable row id.

## Separate display from operations

* `accessor` supplies the displayed value
* `sortValue` supplies a comparable primitive
* `exportValue` supplies export data
* `formatValue` supplies plain text for contexts that cannot render a component
* `editValue`, `parseValue` and `validate` control editing when it is composed

For a currency cell, keep a number for sorting/export and render the currency
format in the cell. A complex object without a renderer is not automatically
stringified into meaningful text. Components must give icon-only controls
accessible names and provide text alternatives when color conveys meaning.

## Sizing, visibility and grouping

`width`, `minWidth`, `maxWidth`, `flex` and logical `align` describe sizing.
`hideOnMobile`, `hideOnDesktop` and `mobileLabel` describe responsive
presentation. `lockPosition`, `lockVisibility`, `lockWidth` and `lockPin`
constrain the corresponding column-menu operations.

Use `ColumnInput<TRow>[]` for nested header groups. User layout changes are
stored separately from your definitions, so renaming a header does not change
its stable key. Dynamic columns can be a signal; avoid changing keys just
because the locale or visible caption changed.

See [Column groups](/v3/angular/column-groups/),
[Column management](/v3/angular/column-management/), [Sorting](/v3/angular/sorting/),
[Cell editing](/v3/angular/cell-editing/), [Mobile cards](/v3/angular/mobile/) and
[Localization](/v3/angular/i18n-rtl/).
