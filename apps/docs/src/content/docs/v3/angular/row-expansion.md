---
title: "Angular expandable detail rows (v3)"
description: Expand Angular table rows into detail templates with accessible
  toggles. Configure expansion state and render row-specific content through kit
  slots.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Angular
      expandable detail
      rows","item":"https://adapttable.orwamahmoud.com/v3/angular/row-expansion/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/angular/row-expansion.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/angular/row-expansion.png
slug: v3/angular/row-expansion
---

`rowDetail(renderer, defaultExpandedRowIds?)` adds a disclosure before each
row and renders content beneath an expanded row. The renderer is an Angular
standalone component or `TemplateRef<RowDetailContext<TRow>>`.

```ts
import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { rowDetail } from "@adapttable/angular-unstyled/row-detail";

interface Person {
  id: string;
  name: string;
  bio: string;
}

@Component({
  selector: "app-person-detail",
  template: `<p>{{ row().bio }}</p>`,
})
export class PersonDetail {
  readonly row = input.required<Person>();
}

@Component({
  selector: "app-expand-people",
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
export class ExpandPeople {
  readonly rows: Person[] = [
    { id: "ada", name: "Ada", bio: "Works on the analytical engine." },
  ];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [rowDetail<Person>(PersonDetail, ["ada"])];
}
```

Use the NG-ZORRO root and `/row-detail` imports together for its disclosure
control.
See [getting started](/v3/angular/getting-started/) for installation
and first-release status.

## Renderer and lifecycle

The context contains `$implicit` and `row`. An `ng-template` can use
`let-row`, while a component declares `row = input.required<TRow>()` as
above. Only declared component inputs receive context values.

The shell reads its features when it initializes. When using a template
queried with `viewChild`, make sure the template exists before constructing
the mounted table's feature list. Do not read a required view query in a
field initializer before Angular has created that view. A component renderer
avoids that ordering issue.

Several rows may be open at once. Expansion is keyed by stable row ID, so a
row can leave the page and return with its panel still open during that
table's lifetime. It is separate from tree expansion and group collapse and
is not written into URL state or saved views. The optional ID array seeds
the initial open set; it is not a controlled input.

On collapse, the detail content is removed. A detail component should own
and clean up its subscriptions or requests with its Angular lifecycle. The
table does not provide a detail-fetch callback or an automatic error panel;
render loading, error and retry states in the detail component if needed.

## Layout and accessibility

Desktop details span the body columns in the row immediately after their
owner. Mobile cards place the same content in `card-detail`. The disclosure
is a kit button with localized expand/collapse labels and `aria-expanded`,
so normal keyboard activation works. Direction follows the table's `dir`.
Virtualized row/detail pairs are measured together so opening a panel can
change the visible row height.

For another complete table inside a detail, use
[nested tables](/v3/angular/nested-tables/) to obtain the child defaults and a named
region. For hierarchical data in one table, use [tree data](/v3/angular/tree-data/).
