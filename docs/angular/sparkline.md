# Angular sparkline columns

`sparklineColumn` adds a small SVG chart as an Angular column renderer.
It lives on the optional binding entry `@adapttable/angular/sparkline`, so it
works with either Angular kit without a separate chart library.

## Draw a series in a column

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { sparklineColumn } from "@adapttable/angular/sparkline";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Service {
  id: string;
  name: string;
  requests: number[];
}

@Component({
  selector: "service-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="services"
      [columns]="columns"
      [rowKey]="rowKey"
      tableLabel="Service traffic"
    />
  `,
})
export class ServiceTable {
  readonly services: Service[] = [
    { id: "api", name: "API", requests: [20, 26, 19, 34, 42] },
  ];
  readonly columns: ColumnDef<Service>[] = [
    { key: "name", sortable: true },
    sparklineColumn<Service>({
      key: "requests",
      header: "Requests",
      values: (row) => row.requests,
      kind: "area",
      width: 100,
      height: 32,
      column: { sortable: true, mobileLabel: "Recent traffic" },
    }),
  ];
  readonly rowKey = (row: Service) => row.id;
}
```

The helper installs `accessor`, `cell`, `sortValue` and `exportValue`. Its
`column` option adds ordinary column metadata; it does not override those
generated fields. To keep those installed functions and renderer intact,
retain the column returned by the helper.

## Options and data semantics

`kind` is `"line"` (default), `"bar"` or `"area"`. Defaults are 80 by 28
CSS pixels. `color` defaults to `currentColor` so the surrounding theme controls
the chart. Values are oldest first. Non-finite points are discarded; empty,
single-point and flat series are handled without invalid SVG geometry.

Sorting uses the last finite value, with no value for an empty finite series.
Exports contain comma-separated finite numbers, not SVG markup. A server sort
still needs to implement the intended meaning for the column key.

## Accessible labels and a standalone chart

Each chart has `role="img"`, an accessible label and an SVG title. The default
summary describes the series numerically. Supply
`label: (values, row) => string` on the column spec for domain-specific or
localized wording; handle an empty series in your callback.

For a chart outside a table, import `AdaptSparkline` from the same entry and
put it in the standalone component's `imports`:

```html
<adapt-sparkline
  [values]="[20, 26, 19, 34, 42]"
  kind="line"
  label="API requests over five intervals; latest value 42"
/>
```

The standalone inputs include `values`, `kind`, `width`, `height`, `color`
and `label`. There is no kit `/sparkline` entry or `sparkline()` feature to
add to `[features]`.

Charts keep chronological direction left-to-right even inside an RTL table.
They use fixed dimensions without observers, so virtualized rows can mount
and unmount them without adding a measurement loop. The same cell renderer
appears in a mobile card field; custom card bodies must stamp the field's
template to retain it.

See [Columns](./columns.md), [Mobile cards](./mobile.md),
[Virtualization](./virtualization.md), [Exporting](./exporting.md) and
[Accessibility](./accessibility.md).
