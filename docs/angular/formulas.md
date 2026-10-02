# Angular formula columns

`buildFormulaColumns()` converts formula specifications into Angular
`ColumnDef` values. Import it from `@adapttable/angular/formula`; neither kit has
a `/formula` factory. The formula engine is opt-in, and the host keeps the
formula list and source rows.

```ts
import { Component, computed } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import {
  buildFormulaColumns,
  injectFormulaUrlState,
} from "@adapttable/angular/formula";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Line {
  id: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: "app-formula-lines",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Order calculations"
      [data]="rows"
      [columns]="columns()"
      [rowKey]="rowKey"
    />
    @for (error of errors(); track error[0]) {
      <p role="alert">{{ error[0] }}: {{ error[1] }}</p>
    }
    @if (derived().cycles.length) {
      <p role="alert">Circular formulas: {{ derived().cycles.join(", ") }}</p>
    }
  `,
})
export class FormulaLines {
  readonly rows: readonly Line[] = [{ id: "l1", quantity: 3, unitPrice: 10 }];
  readonly rowKey = (row: Line) => row.id;
  readonly baseColumns: readonly ColumnDef<Line>[] = [
    { key: "quantity", header: "Quantity" },
    { key: "unitPrice", header: "Unit price" },
  ];
  readonly state = injectFormulaUrlState({
    urlKey: "line-formulas",
    defaultFormulas: [
      { key: "total", header: "Total", formula: "=quantity * unitPrice" },
    ],
  });
  readonly derived = computed(() =>
    buildFormulaColumns<Line>(this.state.formulas())
  );
  readonly columns = computed(() => [
    ...this.baseColumns,
    ...this.derived().columns,
  ]);
  readonly errors = computed(() => Object.entries(this.derived().errors));
}
```

Use `@adapttable/ng-zorro` for the root component when using that kit; the
formula imports stay on the binding. Both kits are private workspace packages.

## Expressions, references and errors

A specification has a unique `key`, optional `header`, and formula text. A
leading `=` is accepted. References resolve row fields and other formula keys;
bracket syntax supports field names that need it. Expressions use the formula
parser and supported functions, not JavaScript evaluation. For example,
`=ROUND(quantity * unitPrice, 2)` calculates a rounded total.

The result contains `columns`, a keyed `errors` record for parse failures and
`cycles` for circular dependencies. Cyclic cells display `#CYCLE!` rather than
recursing indefinitely. Per-row evaluation can also produce a formula error;
do not hide those states behind a currency formatter. The optional spec
`format` formats successful values, while raw results remain available for
sorting and export.

Choose keys that do not collide with ordinary columns or other formulas. Build
from the stored numeric fields, not the text emitted by an Angular cell
template. Replacing the host's rows signal makes the derived cell values follow
the data; the builder does not save calculated values to your API.

## Persist and edit the formula list

Call `state.onFormulasChange(nextSpecs)` to add, replace or remove formulas.
`formulas` is a signal. The URL slice preserves serializable specifications;
it does not serialize a JavaScript formatter. Namespace it with `urlKey`, and
use the same URL adapter strategy as your other table state.

A URL is shared data, so show invalid expressions and cycles after loading it
just as you would after typing. Formula text in a URL can be visible in browser
history and copied links; choose host-managed persistence for formulas that
should not travel that way. Parsing a restored specification does not execute
application code or grant access to a server field.

If the host offers a formula editor, label its inputs, expose errors next to
the relevant formula and preserve draft text after validation fails. Use
ordinary keyboard- and touch-accessible Add/Remove controls; formulas also
render as values in mobile cards. Persisting a formula to a backend remains an
explicit host operation with its own loading/error state.

See [Columns](./columns.md), [Cell editing](./cell-editing.md),
[URL state](./url-state.md) and the
[formula builder](../../packages/shared/core/src/formula/formulaColumn.ts).
