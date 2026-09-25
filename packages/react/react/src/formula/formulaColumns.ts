/**
 * The React face of the neutral formula-column builder.
 */
import {
  buildFormulaColumns as neutralBuildFormulaColumns,
  type FormulaColumnSpec,
  type FormulaColumnsResult,
} from "@adapttable/core";

import type { ColumnDef } from "../columnDef";

/**
 * What {@link buildFormulaColumns} reports back to a React host.
 *
 * Identical to the neutral result except that `columns` are
 * {@link ColumnDef}s, so they concatenate with hand-written React columns.
 *
 * @public
 */
export interface ReactFormulaColumnsResult<TRow> extends Omit<
  FormulaColumnsResult<TRow>,
  "columns"
> {
  /** The columns, ready to concatenate with the declared ones. */
  columns: readonly ColumnDef<TRow>[];
}

/**
 * Build formula columns for a React table.
 *
 * `@adapttable/core/formula` exports the same builder typed as neutral
 * `ColumnMetadata`, for headless and non-React hosts.
 *
 * @public
 */
export function buildFormulaColumns<TRow extends object>(
  specs: readonly FormulaColumnSpec[]
): ReactFormulaColumnsResult<TRow> {
  // The builder sets only neutral column fields — key, header, and the
  // derived value/sort/export/format functions — so each column is already a
  // valid React column; this narrows the declaration to say so.
  return neutralBuildFormulaColumns<TRow>(
    specs
  ) as ReactFormulaColumnsResult<TRow>;
}
