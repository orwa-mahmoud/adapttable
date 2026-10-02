/**
 * The Angular face of the neutral formula-column builder.
 */
import type { ColumnDef } from "@adapttable/angular";
import {
  buildFormulaColumns as neutralBuildFormulaColumns,
  type FormulaColumnSpec,
  type FormulaColumnsResult,
} from "@adapttable/core";

/**
 * What {@link buildFormulaColumns} reports back to an Angular host.
 *
 * Identical to the neutral result except that `columns` are
 * {@link ColumnDef}s, so they concatenate with hand-written Angular columns.
 *
 * @public
 */
export interface AngularFormulaColumnsResult<TRow> extends Omit<
  FormulaColumnsResult<TRow>,
  "columns"
> {
  /** The columns, ready to concatenate with the declared ones. */
  columns: readonly ColumnDef<TRow>[];
}

/**
 * Build formula columns for an Angular table.
 *
 * `@adapttable/core/formula` exports the same builder typed as neutral
 * `ColumnMetadata`, for headless hosts.
 *
 * @public
 */
export function buildFormulaColumns<TRow extends object>(
  specs: readonly FormulaColumnSpec[]
): AngularFormulaColumnsResult<TRow> {
  // The builder sets only neutral column fields — key, header, and the
  // derived value/sort/export/format functions — so each column is already a
  // valid Angular column; this narrows the declaration to say so.
  return neutralBuildFormulaColumns<TRow>(
    specs
  ) as AngularFormulaColumnsResult<TRow>;
}
