# Angular pivot tables with row, column and measure axes

Build a pivot with `pivot()`, turn its result into table inputs with your kit's
`pivotTableModel()`, and use `AdaptPivotPanel` to edit the axes and measures.
The calculation is separate from rendering; the model preserves the selected
kit's row-header component, grouped columns and grand-total footer.

Try the [unstyled Angular pivot demo](https://adapttable.orwamahmoud.com/angular/demo/unstyled/pivot/)
or the [NG-ZORRO pivot demo](https://adapttable.orwamahmoud.com/angular/demo/ng-zorro/pivot/).

## Build a client-side Angular pivot table

```ts
import { Component, computed } from "@angular/core";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import {
  AdaptPivotPanel,
  injectPivotUrlState,
  pivot,
  pivotTableModel,
  type PivotField,
} from "@adapttable/angular-unstyled/pivot";

@Component({
  selector: "app-sales-pivot",
  imports: [AdaptDataTable, AdaptPivotPanel],
  template: `
    <adapt-pivot-panel
      [fields]="fields"
      [config]="state.config()"
      [onChange]="state.onConfigChange"
    />
    <adapt-data-table
      tableLabel="Sales pivot"
      urlKey="sales-pivot-table"
      [data]="model().rows"
      [columns]="model().columns"
      [rowKey]="model().rowKey"
      [summaryRow]="model().summaryRow"
    />
  `,
})
export class SalesPivot {
  readonly rows = [
    { region: "North", quarter: "Q1", amount: 120 },
    { region: "North", quarter: "Q2", amount: 80 },
    { region: "South", quarter: "Q1", amount: 60 },
  ];
  readonly fields: readonly PivotField[] = [
    { key: "region", label: "Region" },
    { key: "quarter", label: "Quarter" },
    { key: "amount", label: "Amount" },
  ];
  readonly state = injectPivotUrlState({
    urlKey: "sales-pivot",
    defaultConfig: {
      rows: ["region"],
      columns: ["quarter"],
      measures: [{ key: "amount", agg: "sum" }],
    },
  });
  readonly model = computed(() =>
    pivotTableModel(
      pivot(this.rows, this.state.config(), {
        collapsed: this.state.collapsed(),
      }),
      { fields: this.fields }
    )
  );
}
```

`onChange` is a callback input, so bind it with `[onChange]`, not `(onChange)`.
The initializer runs in an Angular injection context. `config` and `collapsed`
are signals and must be called when rendering or calculating. Use
`@adapttable/ng-zorro/pivot` with the NG-ZORRO root table for that kit's panel
and row-header controls.
See [getting started](./getting-started.md) for installation
and first-release status.

## Configure pivot axes, measures and URL state

The rows and columns arrays are ordered dimensions; measures specify a field
and aggregation. The panel supplies add, remove and move controls, including
keyboard-operable buttons rather than requiring drag-and-drop. Its fieldsets
and labels distinguish the three zones for screen readers. Keep the panel
usable at narrow widths even when the resulting pivot is wide.

`injectPivotUrlState()` preserves axes, measure order, totals switches and the
collapsed-key set. Use `onConfigChange` and `onCollapsedChange` to update them;
do not mutate the existing arrays or `Set`. Namespace state when more than one
pivot is on a page. Its URL adapter can be shared with your host's Router setup.

The basic row header displays the pivot line's caption. Folding is a host
rendering decision: supply `renderRowHeader` to `pivotTableModel`, return an
Angular template/component for foldable lines, and toggle that line's `key` in
`state.collapsed()`. Preserve a text caption for export and announcements.
The model's grand total remains a footer and is not a foldable row.

## Server-side Angular pivot table recipe

`pivot()` calculates from exactly the rows supplied. With a remote page, that
would be a page pivot, not a complete dataset pivot. For large datasets, ask
your backend to aggregate the full matching set and render its answer with
`serverPivotResult()` from `@adapttable/angular/pivot`.

This component expects an application-owned `POST /api/sales/pivot` endpoint.
It accepts a `PivotConfig` as JSON and returns a `QueryPivotPage`; AdaptTable
does not provide that HTTP endpoint. The backend must validate allowed field
names and aggregate operations before constructing a database query.

```ts
import { Component, computed, effect, signal } from "@angular/core";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import {
  AdaptPivotPanel,
  injectPivotUrlState,
  pivotTableModel,
  type PivotField,
} from "@adapttable/angular-unstyled/pivot";
import {
  serverPivotResult,
  type PivotConfig,
  type QueryPivotPage,
} from "@adapttable/angular/pivot";

@Component({
  selector: "app-server-sales-pivot",
  standalone: true,
  imports: [AdaptDataTable, AdaptPivotPanel],
  template: `
    <adapt-pivot-panel
      [fields]="fields"
      [config]="state.config()"
      [onChange]="state.onConfigChange"
    />
    @if (loading()) {
      <p role="status">Loading pivot…</p>
    }
    @if (error(); as failure) {
      <p role="alert">{{ failure.message }}</p>
      <button type="button" (click)="retry()">Retry pivot</button>
    }
    @if (model(); as table) {
      <adapt-data-table
        tableLabel="Server sales pivot"
        urlKey="server-sales-pivot-table"
        [data]="table.rows"
        [columns]="table.columns"
        [rowKey]="table.rowKey"
        [summaryRow]="table.summaryRow"
      />
    }
  `,
})
export class ServerSalesPivot {
  readonly fields: readonly PivotField[] = [
    { key: "region", label: "Region" },
    { key: "quarter", label: "Quarter" },
    { key: "amount", label: "Amount" },
  ];
  readonly state = injectPivotUrlState({
    urlKey: "server-sales-pivot",
    defaultConfig: {
      rows: ["region"],
      columns: ["quarter"],
      measures: [{ key: "amount", agg: "sum" }],
    },
  });
  readonly loading = signal(false);
  readonly error = signal<Error | null>(null);
  private readonly refresh = signal(0);
  private readonly result = signal<{
    config: PivotConfig;
    page: QueryPivotPage;
  } | null>(null);
  readonly model = computed(() => {
    const result = this.result();
    if (!result || result.config !== this.state.config()) return null;
    return pivotTableModel(
      serverPivotResult(result.page, { config: result.config }),
      { fields: this.fields }
    );
  });

  constructor() {
    effect((onCleanup) => {
      const config = this.state.config();
      this.refresh();
      const controller = new AbortController();
      onCleanup(() => controller.abort());
      void this.load(config, controller.signal);
    });
  }

  readonly retry = () => this.refresh.update((value) => value + 1);

  private async load(config: PivotConfig, signal: AbortSignal) {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      const response = await fetch("/api/sales/pivot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        signal,
      });
      if (!response.ok)
        throw new Error(`Pivot request failed: ${response.status}`);
      const page = (await response.json()) as QueryPivotPage;
      if (!signal.aborted) this.result.set({ config, page });
    } catch (error) {
      if (!signal.aborted) {
        this.error.set(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } finally {
      if (!signal.aborted) this.loading.set(false);
    }
  }
}
```

For the default configuration, a valid response is:

```json
{
  "columns": [["Q1"], ["Q2"]],
  "rows": [
    { "path": ["North"], "cells": [120, 80], "totals": [200], "count": 2 },
    { "path": ["South"], "cells": [60, null], "totals": [60], "count": 1 }
  ],
  "total": { "path": [], "cells": [180, 80], "totals": [260], "count": 3 }
}
```

`columns` contains dimension paths, not one entry per measure. Each row's
`cells` follow column-path order, then measure order within that path. `totals`
contains one value per measure for the grand-total columns. `total` is the
optional grand-total row; `subtotal: true` identifies a subtotal body line.
Missing cells stay empty. The backend must compute totals correctly: averages
cannot be obtained by adding per-group averages. Honor the requested totals
switches on the server; the translator renders a supplied `total` row.

The effect cancels on configuration changes and component destruction, and the
model only displays a response paired with the configuration that requested
it. In production, validate the JSON at the HTTP boundary; the TypeScript cast
above is not runtime validation. Include any application filters in your own
request contract and in the effect's dependencies.

`serverPivotResult` translates a result; it neither fetches nor applies the
client pivot's collapsed-key set. This recipe renders every returned line.
If server-side folding is needed, define it in your endpoint contract and
return the visible lines, or explicitly project them in the host. Do not
expect a URL collapse change alone to fetch or hide server rows.

## Render grouped pivot columns, totals and responsive rows

`pivotTableModel` returns `columns`, `rows`, `rowKey` and optional `summaryRow`.
The generated rows are aggregate lines, not the original editable records.
Do not send a pivot line's synthetic key to a source-record edit endpoint.
Use `fields`, `labels`, `rowHeader` and `indent` for its captions and hierarchy;
`renderRowHeader` is an Angular renderer hook, not JSX.

The same table inputs support desktop and responsive rendering. When many
measures make a pivot wide, consider explicit column widths and the appropriate
[virtualization](./virtualization.md) settings rather than removing labels on
phones.

See [Aggregation](./aggregation.md), [Column groups](./column-groups.md),
[URL state](./url-state.md) and the
[Angular pivot model](../../packages/angular/angular/pivot/pivotTableModel.ts).
