---
title: "Angular full-width and separator rows (v3)"
description: Insert full-width content and separator rows into Angular tables.
  Position host-provided slots by row ID and account for mobile card rendering.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Angular
      full-width and separator
      rows","item":"https://adapttable.orwamahmoud.com/v3/angular/full-width-rows/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/angular/full-width-rows.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/angular/full-width-rows.png
slug: v3/angular/full-width-rows
---

`extraRows()` inserts host content between data records. A `separator` adds
a dividing rule; a `fullWidth` row renders one cell across the table's body.
Mobile cards receive the same content between cards.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { extraRows } from "@adapttable/angular-unstyled/extra-rows";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "app-review-note",
  template: `<strong>Review these records before approving.</strong>`,
})
export class ReviewNote {}

@Component({
  selector: "app-noted-people",
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
export class NotedPeople {
  readonly rows: Person[] = [
    { id: "ada", name: "Ada" },
    { id: "grace", name: "Grace" },
  ];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    extraRows([
      {
        key: "review-note",
        kind: "fullWidth",
        beforeRowId: "ada",
        render: () => ReviewNote,
      },
      { key: "next-section", kind: "separator", beforeRowId: "grace" },
      {
        key: "end-note",
        kind: "fullWidth",
        render: () => "End of available records",
      },
    ]),
  ];
}
```

NG-ZORRO has the matching `/extra-rows` factory and root table. Both example
kits are published on npm; see [installation](/v3/angular/getting-started/).

## Position and identity

Give every extra a stable, unique `key`. `beforeRowId` targets a data-row
identity, not a displayed row index or group-header key. Several extras
targeting the same record retain their declaration order. An extra whose
target is absent from the current body is not inserted. Omit the target to
append at the end of the scrolling body.

Targeted extras travel with their record through reordering and pinning.
They are not data rows: they do not increment the dataset total, participate
in filtering or receive selection and mutation controls. A note should not
be modeled as a fake data record just to get it into the body.

## Angular content and lifecycle

The `render()` function may return plain text, a `TemplateRef` or a
standalone component type. It takes no row argument. Close over the host's
data, or let a rendered component obtain the state it needs. The binding
stamps templates through `NgTemplateOutlet` and components through
`NgComponentOutlet`; a React element is not a renderer for this path.

If using a queried template, return it lazily from `render()` after it
exists. Keep the feature list stable at initialization. A component or
template rendered inside an extra owns its own loading, error and teardown
behavior; the extra-row feature does not fetch content.

Separators have an accessible separator role and localized `rowSeparator`
label. Full-width content retains its normal semantics; use headings or
descriptive text when they help, and provide accessible names for any custom
controls. Layout uses logical alignment/padding for RTL.

## Styling and spans

The part pairs are `separator-row` / `separator-cell` and `full-width-row` /
`full-width-cell`. The corresponding shell `classNames` keys are
`separatorRow`, `separatorCell`, `fullWidthRow` and `fullWidthCell`.
An extra placed before a styled record can inherit that record's fill, and
extras are layered above a continuing merged span so the note stays visible.

Extras are host content, so they are not serialized to URL state or saved
views. See [row spanning](/v3/angular/row-spanning/),
[row appearance](/v3/angular/row-styling/) and [row detail](/v3/angular/row-expansion/) for
other ways to present related information.
