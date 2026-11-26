---
title: "Angular row styles and heights (v3)"
description: Set conditional Angular row styles and heights from host callbacks.
  Apply appearance consistently to desktop rows and responsive mobile cards.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Angular
      row styles and
      heights","item":"https://adapttable.orwamahmoud.com/v3/angular/row-styling/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/angular/row-styling.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/angular/row-styling.png
slug: v3/angular/row-styling
---

`rowAppearance()` supplies a per-row class, inline style and height. The
same callbacks apply to desktop data rows and mobile cards.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { rowAppearance } from "@adapttable/angular-unstyled/row-appearance";

interface Task {
  id: string;
  title: string;
  overdue: boolean;
}

@Component({
  selector: "app-styled-tasks",
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
export class StyledTasks {
  readonly rows: Task[] = [
    { id: "draft", title: "Draft (overdue)", overdue: true },
    { id: "review", title: "Review", overdue: false },
  ];
  readonly columns: ColumnDef<Task>[] = [{ key: "title", header: "Task" }];
  readonly rowKey = (row: Task) => row.id;
  readonly features = [
    rowAppearance<Task>({
      rowClassName: (row) => (row.overdue ? "task-overdue" : undefined),
      rowStyle: (row) =>
        row.overdue
          ? {
              backgroundColor: "#fff4ce",
              color: "#422006",
            }
          : undefined,
      rowHeight: (row) => (row.overdue ? 56 : 40),
    }),
  ];
}
```

Use `@adapttable/ng-zorro` and its `/row-appearance` entry for the NG-ZORRO
table.
See [getting started](/v3/angular/getting-started/) for installation
and first-release status.

## Callback values

`rowClassName(row, index)` returns a class or `undefined`.
`rowStyle(row, index)` returns CSS properties or `undefined`.
`rowHeight` accepts a number in pixels or `(row, index) => number`.
An explicit row height takes precedence over a height in the style object.
Use record identity or values for business meaning: sorting and paging can
change the index.

Callbacks belong to the feature initialized with the table. Host data can
change reactively; use immutable row updates so Angular and the source see
those changes. Avoid expensive formatting or remote work inside a style
callback because layout can read it repeatedly.

## CSS and kit boundaries

Place CSS targeting elements inside `AdaptDataTable` in an application
stylesheet. A parent component's emulated encapsulation selector does not
automatically reach a child component's internal table rows. The class
callback supplies a hook; it does not turn off Angular style encapsulation.

The unstyled kit supplies semantic markup and part attributes. NG-ZORRO
uses its own table/control appearance; scope overrides to the table you
intend to customize. Prefer logical properties such as `paddingInlineStart`
or `borderInlineStart` for RTL. Preserve visible focus styles and adequate
contrast. Express state in text or an accessible label as well as color.

Mobile cards receive the same class, style and height, so a height chosen
for one-line desktop rows may be too short for several card fields. Allow
room for labels, action controls, wrapping and enlarged text. Fixed heights
are not a replacement for measuring actual content.

## Virtualization and related content

The virtualizer uses row-height values as estimates, then browser
measurements describe the actual laid-out rows. Row details and custom
renderers can make the measured height larger. See
[virtualization](/v3/angular/virtualization/) before relying on precise offsets.

Full-width extras placed before a record can reuse its fill to keep a note
visually connected. A merged cell's appearance comes from the span pipeline;
use `cellSpan(..., "plain")` when you need its geometry without merged paint.
These callbacks are presentation derived from data and are not stored in URL
state or saved views.

See [full-width rows](/v3/angular/full-width-rows/), [row spanning](/v3/angular/row-spanning/)
and [customization](/v3/angular/customization/).
