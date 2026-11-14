/**
 * The scale page's columns in Angular: the shared columns, padded to the
 * width the URL asks for, with the Person cell drawn as name over email.
 */
import type { ColumnDef } from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import {
  type BigPerson,
  paddingColumns,
  SCALE_COLUMNS,
} from "../shared/scaleScenario";

/** A person on the scale page: their name over their email. */
@Component({
  selector: "adapt-showcase-scale-person",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div style="font-weight: 600">{{ row().name }}</div>
    <div style="font-size: 12px; opacity: 0.7">{{ row().email }}</div>`,
})
class ScalePersonCell {
  readonly row = input.required<BigPerson>();
  readonly value = input<unknown>();
}

/**
 * The columns for `cols` (zero keeps the shared set).
 *
 * @param cols - How many columns the page asks for.
 * @returns The columns.
 */
export function scaleColumns(cols: number): ColumnDef<BigPerson>[] {
  return [...SCALE_COLUMNS, ...paddingColumns(SCALE_COLUMNS.length, cols)].map(
    (column): ColumnDef<BigPerson> =>
      column.key === "name"
        ? { ...column, cell: ScalePersonCell }
        : { ...column }
  );
}
