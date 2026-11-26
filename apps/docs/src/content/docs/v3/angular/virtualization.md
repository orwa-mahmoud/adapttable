---
title: "Angular table and card virtualization (v3)"
description: Window Angular table rows, columns and mobile cards with optional
  virtualization. Configure sizing and overscan while maintaining table
  behavior.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Angular
      table and card
      virtualization","item":"https://adapttable.orwamahmoud.com/v3/angular/virtualization/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/angular/virtualization.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/angular/virtualization.png
slug: v3/angular/virtualization
---

`virtualize()` renders a moving window of rows or cards while keeping the
scrollable extent of the full loaded set. It reduces DOM work; it does not fetch
the entire dataset or make a server page contain rows the host never loaded.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { virtualize } from "@adapttable/angular-unstyled/virtualize";

interface Item {
  id: string;
  name: string;
  stock: number;
}

@Component({
  selector: "app-large-inventory",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Inventory"
      paginationMode="infinite"
      [maxHeight]="480"
      [defaults]="{ limit: 10000 }"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class LargeInventory {
  readonly rows: readonly Item[] = Array.from(
    { length: 10000 },
    (_, index) => ({
      id: String(index),
      name: `Item ${index + 1}`,
      stock: index % 100,
    })
  );
  readonly columns: readonly ColumnDef<Item>[] = [
    { key: "name", header: "Item" },
    { key: "stock", header: "Stock" },
  ];
  readonly rowKey = (row: Item) => row.id;
  readonly features = [
    virtualize({
      estimateRowSize: 44,
      estimateCardSize: 140,
      virtualOverscan: 5,
    }),
  ];
}
```

All supported kits expose `/virtualize`; change the root and feature imports together to
`@adapttable/ng-zorro` for NG-ZORRO.
See [getting started](/v3/angular/getting-started/) for installation
and first-release status.

## Enable the appropriate window

A flat paged table already bounds its rendered rows, so row virtualization is
ignored there. Use infinite pagination, or grouping where the grouped body can
contain many headers and rows. `maxHeight` makes the table's bounded scroll box
the scroll owner. Without a bound, the window follows the page and accounts for
where the table begins below other content.

`estimateRowSize` and `estimateCardSize` are initial pixel estimates, not forced
CSS heights. The binding measures actual items and corrects spacer sizes;
expanded detail content is measured with its row. `virtualOverscan` adds items
outside the visible viewport to reduce churn. Use sensible estimates for your
renderers, then verify both short and unusually tall content.

`virtualizeColumns: true` also windows a wide desktop column set. Column widths,
scroll position and pinned columns are part of that model. Hidden columns and
off-window columns are different: the latter still belong to the table and its
export scope. The feature also accepts `virtualScrollMargin` for layouts that
need an explicit scroll offset.

## Infinite data, phones and interaction

For server/query sources, the source owns `hasNextPage`, fetching flags and
`fetchNextPage`. Reaching the end of the loaded window requests the next slice
through that contract. Keep request failures and retry behavior in the source;
virtualization is not a retry policy. Deduplicate records by stable IDs when
merging incoming pages.

Mobile uses card estimates and the same underlying loaded data. A bounded card
list owns its scrolling and has an accessible name and keyboard entry point;
an unbounded card list does not add an unnecessary scroll-region Tab stop.
Verify that the scrollable area can be focused and scrolled with the keyboard,
and that row actions, expansion and editors remain reachable as items mount
and leave the window.

Avoid querying rendered DOM nodes to count all rows or build a report: only the
window exists there. Use source/model APIs for selection, exports and data
operations. Keep row keys stable across updates so a scrolled or focused record
does not silently become another row.

SSR renders useful initial content without measuring a browser viewport.
Measurements and observers belong to the client lifecycle and are released
with their Angular injection context. See [SSR](/v3/angular/ssr-rsc/),
[Mobile cards](/v3/angular/mobile/), [Data tiers](/v3/angular/data-tiers/) and
[Exporting](/v3/angular/exporting/). The [virtualization binding](https://github.com/orwa-mahmoud/adapttable/blob/efd18cf92b4e11175f673269395687617e39c2de/packages/angular/angular/src/virtual/tableVirtualization.ts)
and [kit window tests](https://github.com/orwa-mahmoud/adapttable/blob/efd18cf92b4e11175f673269395687617e39c2de/packages/angular/adapter-angular-unstyled/src/virtualize.test.ts)
cover scroll ownership, measured heights and column windows.
